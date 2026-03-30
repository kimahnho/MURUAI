/**
 * Multi-Agent Overlay — 아동/치료사별 컨텍스트를 생성하여 프롬프트에 주입한다.
 * 모든 Gemini 호출은 /api/genai/studio 프록시를 경유한다 (클라이언트 직접 호출 금지).
 */
import type { AgentOverlay, TherapyStudentProfile, AutoLearnedData } from "../model/therapyTypes";
import { callStudioApi } from "../data/therapyService";
import { anonymizeForLLM } from "./anonymizeForLLM";
import { supabase } from "@/shared/api/supabase";

/**
 * 아동 오버레이를 생성한다 — 10세션마다 자동 갱신.
 * 아동의 세션 이력, autoLearned 데이터를 기반으로 AI가 요약문을 생성한다.
 */
export async function generateStudentOverlay(
  userId: string,
  profile: TherapyStudentProfile,
): Promise<AgentOverlay> {
  const { text: anonymizedGoals } = anonymizeForLLM(
    profile.therapyGoals.join(", "),
  );

  const autoLearnedSummary = profile.autoLearned
    ? buildAutoLearnedSummary(profile.autoLearned)
    : "세션 데이터 없음";

  const contents = [{
    role: "user",
    parts: [{
      text: `다음 아동의 치료 컨텍스트를 요약해주세요. 간결하게 5줄 이내로 작성하세요.

진단: ${profile.diagnosis.primary ?? "미입력"}
기능연령: ${profile.functionalAge}개월
치료 목표: ${anonymizedGoals}
관심사: ${profile.interests.join(", ") || "미입력"}
감각 특성: ${profile.sensoryTraits.join(", ") || "없음"}
세션 데이터: ${autoLearnedSummary}

형식: 이 아동은 [진단]으로 [특성]을 보이며, [강점]과 [약점]이 있습니다. [권장 접근법]이 효과적입니다.`,
    }],
  }];

  const response = await callStudioApi({
    contents,
    lightweight: true,
  });

  const overlayContent = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  const overlay: AgentOverlay = {
    id: crypto.randomUUID(),
    type: "student",
    targetId: profile.studentId,
    content: overlayContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Supabase에 저장
  await saveOverlay(userId, overlay);

  return overlay;
}

/**
 * 저장된 오버레이를 조회한다.
 */
export async function getStudentOverlay(
  studentId: string,
): Promise<AgentOverlay | null> {
  const { data, error } = await supabase
    .from("therapy_student_profiles")
    .select("profile_data")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;

  const profileData = data.profile_data as Record<string, unknown>;
  const overlay = profileData?.overlay as AgentOverlay | undefined;
  return overlay ?? null;
}

// ── 내부 유틸 ──

function buildAutoLearnedSummary(autoLearned: AutoLearnedData): string {
  const parts: string[] = [];
  parts.push(`세션 ${autoLearned.sessionCount}회`);

  if (autoLearned.preferredActivities.length > 0) {
    parts.push(`선호 활동: ${autoLearned.preferredActivities.join(", ")}`);
  }
  if (autoLearned.avoidedThemes.length > 0) {
    parts.push(`회피 주제: ${autoLearned.avoidedThemes.join(", ")}`);
  }
  if (autoLearned.effectiveDifficulty) {
    parts.push(`적정 난이도: ${autoLearned.effectiveDifficulty}`);
  }

  return parts.join(" / ");
}

async function saveOverlay(userId: string, overlay: AgentOverlay): Promise<void> {
  // 기존 profile_data를 읽어서 overlay만 병합
  const { data: existing } = await supabase
    .from("therapy_student_profiles")
    .select("profile_data")
    .eq("student_id", overlay.targetId)
    .eq("user_id", userId)
    .single();

  const currentData = (existing?.profile_data as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from("therapy_student_profiles")
    .update({
      profile_data: { ...currentData, overlay },
      updated_at: new Date().toISOString(),
    })
    .eq("student_id", overlay.targetId)
    .eq("user_id", userId);

  if (error) console.warn("overlay 저장 실패", error);
}
