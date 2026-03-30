/**
 * 치료 AI 단일 파이프라인.
 * 의도 분류 + 응답 생성을 Gemini 1회 호출로 처리한다.
 * 코드에서 의도를 판별하지 않음 — AI가 응답 내에서 intent를 결정.
 */
import type {
  TherapyStudentProfile,
  ChatMessage,
  TherapyDomain,
  WorksheetSuggestion,
} from "../model/therapyTypes";
import { MAX_MESSAGES_CONTEXT, MAX_MESSAGE_CONTENT_LENGTH, DEFAULT_SHEET_COUNT } from "../model/therapyConstants";
import { checkSafety } from "./safetyCheck";
import { detectDomain } from "./domainDetection";
import { anonymizeForLLM } from "./anonymizeForLLM";
import { getOverlay } from "./agentOverlay";
import { enforceGuardrails } from "./guardrails";
import { callStudioApi } from "../data/therapyService";

// ── Gemini 응답 고정 스키마 ──

export const STUDIO_RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    intent: {
      type: "string" as const,
      enum: ["generate", "modify", "chat"],
      description: "사용자 메시지의 의도: generate(새 학습지 생성), modify(기존 수정), chat(일반 대화)",
    },
    reply: {
      type: "string" as const,
      description: "치료사에게 보여줄 한국어 메시지. generate일 때는 학습지 요약, modify/chat일 때는 대화 응답.",
    },
    sheets: {
      type: "array" as const,
      description: "항상 포함. generate/modify: 5장 전체 (modify는 수정된 장 포함). chat: 빈 배열 [].",
      items: {
        type: "object" as const,
        properties: {
          title: { type: "string" as const, description: "학습지 제목 (구체적으로)" },
          worksheetType: { type: "string" as const, description: "활동 유형 키워드" },
          difficulty: { type: "string" as const, enum: ["easy", "medium", "hard"] },
          itemCount: { type: "integer" as const, description: "항목 수 (2~8)" },
          description: { type: "string" as const, description: "치료사 지시 포함 활동 설명" },
        },
        required: ["title", "worksheetType", "difficulty", "itemCount", "description"],
      },
    },
  },
  required: ["intent", "reply", "sheets"],
};

// ── 재시도 유틸 ──

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const is429 = errMsg.includes("429") || errMsg.includes("RATE");
      const delay = is429
        ? Math.min(baseDelay * 3 ** attempt, 10000)
        : Math.min(baseDelay * 2 ** attempt, 5000);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

// ── 메시지 → Gemini contents 변환 ──

function messagesToContents(
  messages: ChatMessage[],
  studentName?: string,
): Array<{ role: string; parts: Array<{ text: string }> }> {
  const recent = messages.slice(-MAX_MESSAGES_CONTEXT);
  return recent
    .filter((m) => m.content && m.role !== "system")
    .map((m) => {
      const { text } = anonymizeForLLM(
        m.content.slice(0, MAX_MESSAGE_CONTENT_LENGTH),
        studentName,
      );

      // assistant 메시지에 sessionSet 메타데이터가 있으면 sheets 정보를 텍스트로 포함
      let enrichedText = text;
      const sheets = m.metadata?.sessionSet?.sheets;
      if (m.role === "assistant" && Array.isArray(sheets) && sheets.length > 0) {
        const sheetsText = sheets
          .map((s: { title?: string; worksheetType?: string; difficulty?: string; itemCount?: number }, i: number) =>
            `${i + 1}번: "${s.title}" (${s.worksheetType}, ${s.difficulty}, ${s.itemCount}개)`,
          )
          .join("\n");
        enrichedText = `${text}\n\n[생성된 학습지]\n${sheetsText}`;
      }

      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: enrichedText }],
      };
    });
}

// ── 진단 텍스트 추출 ──

function buildDiagnosisText(profile?: TherapyStudentProfile): string | undefined {
  // TherapyStudentProfile의 구조화된 진단 정보
  if (profile?.diagnosis?.primary) {
    const parts: string[] = [profile.diagnosis.primary];
    if (profile.diagnosis.comorbidities.length > 0) {
      parts.push(...profile.diagnosis.comorbidities);
    }
    if (profile.functionalAge) {
      parts.push(`기능연령: ${profile.functionalAge}개월`);
    }
    return parts.join(", ");
  }

  // students_n의 significant 필드에서 직접 가져오기 (fallback)
  const profileRaw = profile as unknown as Record<string, unknown>;
  const significant = profileRaw?.significant as string | undefined;
  if (significant) return significant;

  return undefined;
}

// ── 핵심: 단일 메시지 처리 ──

export interface StudioResponse {
  intent: "generate" | "modify" | "chat";
  reply: string;
  sheets?: WorksheetSuggestion[];
  domain: TherapyDomain;
  warnings: string[];
}

/**
 * 사용자 메시지를 처리한다.
 * Gemini가 의도를 판단하고, 그에 맞는 응답(텍스트 또는 학습지)을 한 번에 반환한다.
 */
export async function sendMessage(
  userPrompt: string,
  messages: ChatMessage[],
  studentProfile?: TherapyStudentProfile,
  currentSheets?: WorksheetSuggestion[],
): Promise<StudioResponse> {
  // Step 1: 안전 검사
  const safety = checkSafety(userPrompt);
  if (!safety.isSafe) {
    return {
      intent: "chat",
      reply: safety.message ?? "안전 검사에서 차단되었습니다.",
      domain: "cognition",
      warnings: [],
    };
  }

  // Step 2: 도메인 힌트 (프롬프트에 포함, 강제 아님)
  const detection = detectDomain(userPrompt);

  // Step 3: 익명화
  const { text: anonymizedPrompt } = anonymizeForLLM(userPrompt, studentProfile?.interests?.[0]);

  // Step 4: Gemini 호출 (의도 판단 + 응답 생성을 동시에)
  // 현재 학습지 세트가 있으면 컨텍스트로 포함
  const sheetsContext = currentSheets && currentSheets.length > 0
    ? `\n[현재 생성된 학습지 세트]
${currentSheets.map((s, i) => `${i + 1}번: "${s.title}" (${s.worksheetType}, ${s.difficulty}, ${s.itemCount}개) - ${s.description}`).join("\n")}

⚠️ 중요: intent가 "modify"일 때 반드시 sheets 배열에 전체 ${currentSheets.length}장을 포함하세요.
수정 요청된 장만 변경하고, 나머지 장은 위 목록 그대로 유지하세요.`
    : "";

  // 아동 정보 컨텍스트 (이름, 나이, 진단)
  const studentRaw = studentProfile as unknown as Record<string, unknown>;
  const studentName = studentRaw?.name as string | undefined;
  const birthYear = studentRaw?.birth_year as string | undefined;
  const studentAge = birthYear ? `${new Date().getFullYear() - Number(birthYear)}세` : undefined;
  const studentGender = studentRaw?.gender as string | undefined;
  const studentContext = studentName
    ? `\n[선택된 아동] 이름: ${studentName}${studentAge ? `, 나이: ${studentAge}` : ""}${studentGender ? `, 성별: ${studentGender}` : ""}`
    : "";

  const contents = messagesToContents(messages);
  contents.push({
    role: "user",
    parts: [{
      text: `${anonymizedPrompt}
${studentContext}${sheetsContext}
[학습지 생성 시 규칙]
- sheets 배열에 ${DEFAULT_SHEET_COUNT}장을 포함하세요.
- 각 장의 title은 구체적으로 작성하세요. (❌ "같은 것 찾기" → ✅ "과일 그림 중 똑같은 것 선으로 잇기")
- difficulty는 단계에 따라 상승: 도입 easy → 심화 hard
- description에 치료사가 아동에게 줄 구체적 지시를 포함하세요.`,
    }],
  });

  const diagnosisText = buildDiagnosisText(studentProfile);

  // Overlay 조회 (있으면 프롬프트에 주입)
  const studentId = (studentProfile as unknown as Record<string, unknown>)?.id as string | undefined;
  const therapistId = (studentProfile as unknown as Record<string, unknown>)?.userId as string | undefined;
  const [studentOv, therapistOv] = await Promise.all([
    studentId ? getOverlay(studentId, "student").catch(() => null) : null,
    therapistId ? getOverlay(therapistId, "therapist").catch(() => null) : null,
  ]);

  const response = await withRetry(() =>
    callStudioApi({
      contents,
      domain: detection.primary,
      lightweight: true,
      studentDiagnosis: diagnosisText,
      studentOverlay: studentOv?.content,
      therapistOverlay: therapistOv?.content,
      responseSchema: STUDIO_RESPONSE_SCHEMA,
    }),
  );

  // Step 5: 응답 파싱
  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  let parsed: { intent?: string; reply?: string; sheets?: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // JSON 파싱 실패 → 텍스트 응답으로 fallback
    return {
      intent: "chat",
      reply: raw.replace(/[#*`{}"[\]]/g, "").trim() || "응답을 처리하지 못했어요.",
      domain: detection.primary,
      warnings: [],
    };
  }

  const intent = (parsed.intent === "generate" || parsed.intent === "modify" || parsed.intent === "chat")
    ? parsed.intent
    : "chat";
  const reply = String(parsed.reply ?? "");

  // Step 6: generate/modify — sheets 파싱 + 가드레일
  const hasSheets = Array.isArray(parsed.sheets) && parsed.sheets.length > 0;

  if ((intent === "generate" || intent === "modify") && hasSheets) {
    // AI가 sheets를 반환한 경우 — 정상 경로
    const allWarnings: string[] = [];
    const sheets = (parsed.sheets ?? [])
      .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null && "title" in s)
      .slice(0, DEFAULT_SHEET_COUNT)
      .map((item): WorksheetSuggestion => {
        const sheet: WorksheetSuggestion = {
          title: String(item.title ?? "학습지"),
          worksheetType: normalizeWorksheetType(String(item.worksheetType ?? "")),
          domain: detection.primary,
          difficulty: normalizeDifficulty(String(item.difficulty ?? "medium")),
          itemCount: Math.min(Math.max(Number(item.itemCount) || 3, 2), 8),
          description: String(item.description ?? ""),
        };

        const { corrected, warnings, blocked } = enforceGuardrails({
          result: { domain: detection.primary, difficulty: sheet.difficulty, itemCount: sheet.itemCount, worksheetType: sheet.worksheetType },
          prompt: userPrompt,
          diagnosis: studentProfile?.diagnosis,
          age: studentProfile?.functionalAge ? Math.floor(studentProfile.functionalAge / 12) : undefined,
        });
        for (const w of warnings) allWarnings.push(`[${w.ruleId}] ${w.message}`);
        if (blocked) allWarnings.push(`[${blocked.ruleId}] ${blocked.message}`);

        return {
          ...sheet,
          difficulty: (corrected.difficulty as WorksheetSuggestion["difficulty"]) ?? sheet.difficulty,
          itemCount: corrected.itemCount ?? sheet.itemCount,
        };
      });

    return {
      intent,
      reply: reply || `${detection.primary} 도메인으로 학습지 ${sheets.length}장을 설계했어요.`,
      sheets,
      domain: detection.primary,
      warnings: allWarnings,
    };
  }

  // modify인데 sheets가 비어있는 경우 — currentSheets를 fallback으로 사용
  if (intent === "modify" && !hasSheets && currentSheets && currentSheets.length > 0) {
    return {
      intent: "modify",
      reply,
      sheets: currentSheets, // 기존 학습지 그대로 반환 (AI reply에 수정 내용이 텍스트로 포함)
      domain: detection.primary,
      warnings: ["AI가 수정된 학습지를 반환하지 못했습니다. 기존 학습지를 유지합니다."],
    };
  }

  return {
    intent,
    reply: reply || "응답을 생성하지 못했어요.",
    domain: detection.primary,
    warnings: [],
  };
}

// ── 정규화 유틸 ──

function normalizeWorksheetType(type: string): WorksheetSuggestion["worksheetType"] {
  const lower = type.toLowerCase();
  if (/findsame|같은|찾기|매칭|변별|인지/.test(lower)) return "findSame";
  if (/matchpair|짝|연결|잇기/.test(lower)) return "matchPairs";
  if (/spotdiff|틀린|다른/.test(lower)) return "spotDifference";
  if (/categor|분류|나누|구분/.test(lower)) return "categorize";
  if (/emotion|감정|표정|추론/.test(lower)) return "emotionInference";
  if (/lineconnect|선|긋기/.test(lower)) return "lineConnect";
  if (/sequen|순서|차례|배열/.test(lower)) return "sequencing";
  return "findSame";
}

function normalizeDifficulty(diff: string): WorksheetSuggestion["difficulty"] {
  const lower = diff.toLowerCase();
  if (lower.includes("easy") || lower.includes("쉬")) return "easy";
  if (lower.includes("hard") || lower.includes("어렵")) return "hard";
  return "medium";
}
