/**
 * Multi-Agent Overlay — 아동/치료사별 컨텍스트를 생성하여 프롬프트에 주입한다.
 * Student Overlay: 아동 행동 패턴, 선호 테마, 혼동쌍, 적정 난이도
 * Therapist Overlay: 치료사 스타일, 선호 세팅, 수정 패턴
 */
import type { AgentOverlay, TherapyStudentProfile, AutoLearnedData } from "../model/therapyTypes";
import { callStudioApi } from "../data/therapyService";
import { anonymizeForLLM } from "./anonymizeForLLM";
import { supabase } from "@/shared/api/supabase";

// ── Student Overlay ──

export async function generateStudentOverlay(
  userId: string,
  profile: TherapyStudentProfile,
): Promise<AgentOverlay> {
  const { text: anonymizedGoals } = anonymizeForLLM(profile.therapyGoals.join(", "));

  const autoLearnedSummary = profile.autoLearned
    ? buildAutoLearnedSummary(profile.autoLearned)
    : "세션 데이터 없음";

  const contents = [{
    role: "user",
    parts: [{
      text: `다음 아동의 치료 컨텍스트를 요약해주세요.

진단: ${profile.diagnosis.primary ?? "미입력"}
기능연령: ${profile.functionalAge}개월
치료 목표: ${anonymizedGoals}
관심사: ${profile.interests.join(", ") || "미입력"}
감각 특성: ${profile.sensoryTraits.join(", ") || "없음"}
세션 데이터: ${autoLearnedSummary}

다음 형식으로 5줄 이내 작성:
1. 특성 요약: ...
2. 효과적 접근: 테마=..., 난이도=..., 항목수=..., 활동=...
3. 주의점: ...
4. 세션 구성: ...
5. 다음 목표: ...`,
    }],
  }];

  const response = await callStudioApi({ contents, lightweight: true });
  const overlayContent = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const overlay: AgentOverlay = {
    id: crypto.randomUUID(),
    type: "student",
    targetId: profile.studentId,
    content: overlayContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveOverlayToDb(userId, overlay);
  return overlay;
}

// ── Therapist Overlay ──

export async function generateTherapistOverlay(
  userId: string,
  sessionHistory: Array<{ domain: string; sheetsCount: number; difficulty: string }>,
): Promise<AgentOverlay> {
  const summary = sessionHistory.length > 0
    ? sessionHistory.map((s) => `${s.domain}: ${s.sheetsCount}장, ${s.difficulty}`).join("\n")
    : "세션 이력 없음";

  const contents = [{
    role: "user",
    parts: [{
      text: `다음 치료사의 세션 패턴을 분석해주세요.

세션 이력:
${summary}

다음 형식으로 4줄 이내 작성:
1. 스타일: 선호 장수, 난이도 경향, 라벨 포함 여부
2. 빈도 테마: 자주 사용하는 테마 상위 3개
3. 수정 패턴: 난이도 조절/테마 변경/재생성 빈도
4. 운영: 도입 활동 사용 여부, 세션 구성 선호`,
    }],
  }];

  const response = await callStudioApi({ contents, lightweight: true });
  const overlayContent = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const overlay: AgentOverlay = {
    id: crypto.randomUUID(),
    type: "therapist",
    targetId: userId,
    content: overlayContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveOverlayToDb(userId, overlay);
  return overlay;
}

// ── Overlay 조회 ──

export async function getOverlay(
  targetId: string,
  type: "student" | "therapist",
): Promise<AgentOverlay | null> {
  const { data, error } = await supabase
    .from("therapy_agent_overlays")
    .select("*")
    .eq("target_id", targetId)
    .eq("overlay_type", type)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id as string,
    type: data.overlay_type as "student" | "therapist",
    targetId: data.target_id as string,
    content: data.content as string,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

// ── DB 저장 ──

async function saveOverlayToDb(userId: string, overlay: AgentOverlay): Promise<void> {
  const { error } = await supabase
    .from("therapy_agent_overlays")
    .upsert(
      {
        user_id: userId,
        target_id: overlay.targetId,
        overlay_type: overlay.type,
        content: overlay.content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "target_id,overlay_type" },
    );

  if (error) console.warn("overlay 저장 실패", error);
}

// ── 유틸 ──

function buildAutoLearnedSummary(autoLearned: AutoLearnedData): string {
  const parts: string[] = [];
  parts.push(`세션 ${autoLearned.sessionCount}회`);
  if (autoLearned.preferredActivities.length > 0) parts.push(`선호 활동: ${autoLearned.preferredActivities.join(", ")}`);
  if (autoLearned.avoidedThemes.length > 0) parts.push(`회피 주제: ${autoLearned.avoidedThemes.join(", ")}`);
  if (autoLearned.effectiveDifficulty) parts.push(`적정 난이도: ${autoLearned.effectiveDifficulty}`);
  return parts.join(" / ");
}
