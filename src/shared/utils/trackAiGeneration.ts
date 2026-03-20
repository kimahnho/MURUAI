/**
 * AI 학습자료 생성 이력 추적 — ai_generation_logs 테이블.
 * 모든 함수는 비차단: 실패해도 사용자 흐름을 막지 않는다.
 */
import { supabase } from "@/shared/api/supabase";

type AiGenerationType = "emotion" | "storybook";
type AiGenerationSource = "landing" | "editor";

interface StoryText {
  title: string;
  sentence: string;
}

/** Step 1: 새 AI 생성 로그 생성 (주제 입력 시) */
export const createAiGenerationLog = async (
  userId: string,
  type: AiGenerationType,
  topic: string,
  source: AiGenerationSource,
): Promise<string | null> => {
  const { data, error } = await supabase
    .from("ai_generation_logs")
    .insert({ user_id: userId, type, topic, source })
    .select("id")
    .single();

  if (error) {
    console.warn("ai_generation_logs insert failed", error);
    return null;
  }
  return data.id;
};

/** Step 2: AI 1차 결과 + 1차 텍스트 + 문서 ID 기록 */
export const updateAiGenerationStories = async (
  logId: string,
  stories: unknown[],
  initialTexts: StoryText[],
  userMadeId?: string,
) => {
  const { error } = await supabase
    .from("ai_generation_logs")
    .update({
      stories,
      initial_texts: initialTexts,
      ...(userMadeId ? { user_made_id: userMadeId } : {}),
    })
    .eq("id", logId);

  if (error) console.warn("ai_generation_logs update (stories) failed", error);
};

/** Step 3: 이미지 스타일 선택 기록 */
export const updateAiGenerationImageStyle = async (
  logId: string,
  imageStyle: string,
) => {
  const { error } = await supabase
    .from("ai_generation_logs")
    .update({ image_style: imageStyle })
    .eq("id", logId);

  if (error)
    console.warn("ai_generation_logs update (imageStyle) failed", error);
};

/** Step 4: 최종 확정 (확정 시 텍스트 + 이미지 URL + 성별 저장) */
export const confirmAiGeneration = async (
  logId: string,
  finalTexts: StoryText[],
  finalImageUrls: string[],
  cardStyle: string,
  imageStyle: string,
) => {
  const { error } = await supabase
    .from("ai_generation_logs")
    .update({
      final_texts: finalTexts,
      final_image_urls: finalImageUrls,
      card_style: cardStyle,
      image_style: imageStyle,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", logId);

  if (error) console.warn("ai_generation_logs update (confirm) failed", error);
};
