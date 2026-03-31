/**
 * 입력 분석기 — 치료사 메시지의 의도를 분류하고 아동 정보를 추출한다.
 * Main 3 analyzeInput() + detectIntent() 포팅.
 *
 * Gemini 호출로 의도를 먼저 판단하고, 실패 시 로컬 패턴 기반 fallback.
 */
import type { TherapyDomain } from "../model/therapyTypes";
import { getGenAI } from "@/shared/api/genai";

// ── 타입 ──

export type InputIntent =
  | "generate" // 새 학습지 생성
  | "modify" // 기존 학습지 수정
  | "adapt" // 기존 학습지를 다른 아동에게 적용
  | "imagePrompt" // 단일 이미지 프롬프트만
  | "conversation" // 임상 질문/상담/관찰 공유
  | "approve" // 현재 결과 확정
  | "retry" // 다시 만들기
  | "unknown";

export interface InputAnalysis {
  intent: InputIntent;
  student: {
    detected: boolean;
    name?: string;
    age?: string;
    diagnosis?: string;
  };
  modification?: {
    type: "difficulty" | "count" | "theme" | "activity";
    direction?: string;
    detail?: string;
  };
  adaptTarget?: {
    sourceStudentName?: string;
    targetStudentName?: string;
  };
  conversationResponse?: string;
  signals?: Array<{ type: string; value: string; confidence: number }>;
}

// ── 로컬 의도 감지 (Gemini fallback용) ──

const APPROVE_PATTERNS = [
  "만들어",
  "좋아",
  "좋아요",
  "이대로",
  "진행",
  "네",
  "응",
  "만들기",
  "생성",
  "ㅇㅇ",
  "ㅇ",
  "이걸로",
  "대로 할게요",
  "추천대로",
  "대로 해주세요",
];
const RETRY_PATTERNS = ["다시", "다른", "다르게", "새로", "변경"];
const EASY_PATTERNS = ["쉽게", "쉬운", "쉬움", "낮춰", "내려"];
const HARD_PATTERNS = ["어렵게", "어려운", "어려움", "높여", "올려"];
const NOISE_PATTERNS =
  /^[ㅋㅎㅠㅜ.!?…~]+$|^감사합니다$|^수고하세요$|^알겠습니다$|^넵$|^네네$/;

const GENERATION_ACTION_VERBS = [
  "만들어",
  "생성",
  "해줘",
  "줘",
  "필요",
  "해야",
  "시작",
];
const GENERATION_NOUNS = ["학습지", "자료", "워크시트", "활동지", "프로그램"];
const GENERATION_SPECIFIC = [
  "컷",
  "장으로",
  "같은것찾기",
  "짝맞추기",
  "틀린그림",
  "순서맞추기",
  "선긋기",
  "따라쓰기",
  "단어카드",
  "ㅅ발음",
  "ㄹ발음",
  "ㅈ발음",
  "ㅊ발음",
  "ㄱ발음",
];

function isGenerationRequest(text: string): boolean {
  if (GENERATION_SPECIFIC.some((s) => text.includes(s))) return true;
  const hasDomain = [
    "감정",
    "인지",
    "언어",
    "소근육",
    "사회성",
    "놀이",
    "조음",
    "발음",
  ].some((d) => text.includes(d));
  const hasAction = GENERATION_ACTION_VERBS.some((v) => text.includes(v));
  const hasNoun = GENERATION_NOUNS.some((n) => text.includes(n));
  return (hasDomain && hasAction) || hasNoun;
}

function isConversationSignal(text: string): boolean {
  const signals = [
    /어떻게/,
    /\?$|인가요|일까요|할까요|나요|시나요|인데|는데|거든|잖아|되죠/,
    /반응|집중|흥미|관심|좋아[하해]|싫어[하해]|거부|울|웃/,
    /오늘|지금|방금|아까|세션\s*중|치료\s*중/,
    /도움|조언|의견|팁|방법|전략|접근/,
    /부모|보호자|엄마|아빠|가정/,
    /행동|문제행동|자해|공격/,
    /안\s*돼|못\s*해|안\s*해|늦|지연|부족|안\s*나와|힘들어/,
  ];
  return signals.some((s) => s.test(text));
}

function hasStrongQuestionMarker(text: string): boolean {
  return /할까요|일까요|인가요|나요|시나요|되죠|괜찮을까|어떨까|좋을까/.test(
    text,
  );
}

const ADAPT_PATTERNS =
  /(?:한테도|에게도|에게\s*맞게|한테\s*맞게|적용해|변환해|써줘|맞춰줘|조정해).*(?:학습지|자료|활동)|(?:학습지|자료|활동).*(?:한테도|에게도|적용|변환|맞게)/;

/** 로컬 패턴 기반 의도 감지 (Gemini 실패 시 fallback) */
export function detectIntentLocal(
  text: string,
  hasResult: boolean,
): InputIntent {
  const t = text.trim();
  if (NOISE_PATTERNS.test(t) || t.length < 2)
    return hasResult ? "unknown" : "conversation";
  if (ADAPT_PATTERNS.test(t) && hasResult) return "adapt";
  if (
    hasResult &&
    APPROVE_PATTERNS.some((p) => t.includes(p)) &&
    !isGenerationRequest(t)
  )
    return "approve";
  if (RETRY_PATTERNS.some((p) => t.includes(p)) && hasResult) return "retry";
  if (
    hasResult &&
    (EASY_PATTERNS.some((p) => t.includes(p)) ||
      HARD_PATTERNS.some((p) => t.includes(p)))
  )
    return "modify";
  if (hasStrongQuestionMarker(t)) return "conversation";
  if (isGenerationRequest(t)) return "generate";
  if (isConversationSignal(t)) return "conversation";
  if (/이미지|그림|일러스트|프롬프트/.test(t) && !/학습지|세트|5장/.test(t))
    return "imagePrompt";
  return hasResult ? "modify" : "generate";
}

// ── Gemini 기반 의도 분석 ──

const INPUT_ANALYSIS_SCHEMA = {
  type: "object" as const,
  properties: {
    intent: {
      type: "string" as const,
      enum: [
        "generate",
        "modify",
        "adapt",
        "imagePrompt",
        "conversation",
        "approve",
        "retry",
        "unknown",
      ],
    },
    student: {
      type: "object" as const,
      properties: {
        detected: { type: "boolean" as const },
        name: { type: "string" as const },
        age: { type: "string" as const },
        diagnosis: { type: "string" as const },
      },
      required: ["detected"],
    },
    conversationResponse: { type: "string" as const },
    signals: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          type: { type: "string" as const },
          value: { type: "string" as const },
          confidence: { type: "number" as const },
        },
        required: ["type", "value", "confidence"],
      },
    },
  },
  required: ["intent", "student"],
};

/**
 * 사용자 입력을 분석하여 의도, 아동 정보, 대화 신호를 추출한다.
 * Gemini 호출 → 실패 시 로컬 패턴 fallback.
 */
export async function analyzeInput(
  text: string,
  context: {
    hasResult: boolean;
    selectedStudentName?: string;
    selectedStudentDiagnosis?: string;
    currentDomain?: TherapyDomain;
    previousMessages?: string[];
  },
): Promise<InputAnalysis> {
  // adapt 패턴은 Gemini 전에 먼저 체크
  if (ADAPT_PATTERNS.test(text) && context.hasResult) {
    const nameMatch = text.match(/([가-힣]{2,4})(?:이|가|한테|에게)/g);
    const names = nameMatch?.map((m) => m.replace(/[이가한테에게]/g, "")) ?? [];
    return {
      intent: "adapt",
      student: { detected: names.length > 0, name: names[names.length - 1] },
      adaptTarget: {
        sourceStudentName: context.selectedStudentName,
        targetStudentName: names[names.length - 1],
      },
    };
  }

  try {
    const ai = getGenAI();
    const systemPrompt = `당신은 발달장애 아동 치료 AI의 입력 분석기입니다.
치료사의 입력을 대화 맥락에서 분석하여 의도, 아동 정보, 치료 목표를 파악합니다.

의도 분류:
- generate: 새 학습지/자료 생성 요청
- modify: 기존 학습지 수정 요청
- adapt: 기존 학습지를 다른 아동에게 적용
- imagePrompt: 단일 이미지 프롬프트만 요청
- conversation: 임상 질문, 상담, 관찰 공유 (자료 생성 아님)
- approve: 현재 결과 확정
- retry: 다시 만들기
- unknown: 판단 불가

conversation일 때 conversationResponse에 답변을 직접 작성하세요 (3~5문장, 한국어).
아동에 대한 유용한 정보는 signals에 추출 (theme_preference/behavior/attention/difficulty/strategy).

${context.hasResult ? "현재 생성된 결과 있음" : "결과 없음"}
${context.selectedStudentName ? `현재 아동: ${context.selectedStudentName}` : ""}
${context.currentDomain ? `현재 도메인: ${context.currentDomain}` : ""}
${context.previousMessages?.length ? `최근 대화:\n${context.previousMessages.slice(-8).join("\n")}` : ""}`;

    const response = await Promise.race([
      ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: [{ role: "user", parts: [{ text }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: INPUT_ANALYSIS_SCHEMA,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 10000),
      ),
    ]);

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("Empty response");
    const parsed = JSON.parse(responseText);
    if (!parsed?.intent || !parsed?.student) throw new Error("Invalid schema");
    if (typeof parsed.student.detected !== "boolean")
      parsed.student.detected = false;
    return parsed as InputAnalysis;
  } catch {
    // Gemini 실패 → 로컬 fallback
    return {
      intent: detectIntentLocal(text, context.hasResult),
      student: { detected: false },
    };
  }
}
