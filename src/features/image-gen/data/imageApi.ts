/**
 * 이미지 생성 이력 — Supabase CRUD
 */
import { supabase } from "@/shared/api/supabase";
import type { GeneratedImage } from "../model/types";

// ═══ 헬퍼 ═══

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("인증이 필요합니다.");
  return user.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToImage(row: any): GeneratedImage {
  return {
    id: row.id,
    childId: row.student_id,
    userId: row.user_id,
    imageUrl: row.image_url,
    prompt: row.prompt,
    resolvedPrompt: row.resolved_prompt ?? "",
    style: row.style,
    backgroundLevel: row.background_level,
    complexity: row.complexity,
    feedback: row.feedback,
    referenceImageUrl: row.reference_image_url ?? undefined,
    createdAt: row.created_at,
  };
}

// ═══ CRUD ═══

/** 생성 이력 추가 */
export async function addToHistory(image: GeneratedImage): Promise<void> {
  const userId = await getUserId();
  const { error } = await supabase.from("new_image_gen_history").insert({
    user_id: userId,
    student_id: image.childId,
    image_url: image.imageUrl,
    prompt: image.prompt,
    resolved_prompt: image.resolvedPrompt,
    style: image.style,
    background_level: image.backgroundLevel,
    complexity: image.complexity,
    feedback: image.feedback,
    reference_image_url: image.referenceImageUrl ?? null,
  });
  if (error) console.warn("이미지 이력 저장 실패", error);
}

/** 아동별 생성 이력 조회 */
export async function getHistoryByChild(childId: string, limit = 20): Promise<GeneratedImage[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("new_image_gen_history")
    .select("*")
    .eq("user_id", userId)
    .eq("student_id", childId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("이미지 이력 조회 실패", error);
    return [];
  }
  return (data ?? []).map(mapRowToImage);
}

/** 전체 생성 이력 조회 */
export async function getAllHistory(limit = 50): Promise<GeneratedImage[]> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("new_image_gen_history")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("전체 이미지 이력 조회 실패", error);
    return [];
  }
  return (data ?? []).map(mapRowToImage);
}

/** 피드백 업데이트 */
export async function updateFeedback(
  imageId: string,
  feedback: "liked" | "disliked" | "modified",
): Promise<void> {
  const { error } = await supabase
    .from("new_image_gen_history")
    .update({ feedback })
    .eq("id", imageId);
  if (error) console.warn("피드백 업데이트 실패", error);
}
