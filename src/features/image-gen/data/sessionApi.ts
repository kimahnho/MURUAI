/**
 * 이미지 생성 세션 + 메시지 — Supabase CRUD
 */
import { supabase } from "@/shared/api/supabase";
import type { ImageGenSession, ImageGenMessage } from "../model/types";

// ═══ 헬퍼 ═══

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToSession(row: any): ImageGenSession {
  return {
    id: row.id,
    userId: row.user_id,
    studentId: row.student_id ?? null,
    title: row.title ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToMessage(row: any): ImageGenMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    metadata: row.metadata ?? undefined,
    createdAt: row.created_at,
  };
}

// ═══ 세션 CRUD ═══

/** 새 세션 생성 */
export async function createSession(
  userId: string,
  studentId: string | null,
  title?: string,
): Promise<ImageGenSession> {
  const { data, error } = await supabase
    .from("new_image_gen_sessions")
    .insert({
      user_id: userId,
      student_id: studentId,
      title: title ?? null,
      status: "active",
    })
    .select()
    .single();
  if (error) throw error;
  return mapRowToSession(data);
}

/** 유저의 세션 목록 조회 */
export async function getUserSessions(userId: string, limit = 50): Promise<ImageGenSession[]> {
  const { data, error } = await supabase
    .from("new_image_gen_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("세션 목록 조회 실패", error);
    return [];
  }
  return (data ?? []).map(mapRowToSession);
}

/** 세션 삭제 (소프트 삭제) */
export async function archiveSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("new_image_gen_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) console.warn("세션 삭제 실패", error);
}

// ═══ 메시지 CRUD ═══

/** 메시지 저장 (fire-and-forget) */
export async function saveMessage(
  userId: string,
  sessionId: string,
  message: ImageGenMessage,
): Promise<void> {
  const { error } = await supabase
    .from("new_image_gen_messages")
    .insert({
      id: message.id,
      user_id: userId,
      session_id: sessionId,
      role: message.role,
      content: message.content.slice(0, 5000),
      metadata: message.metadata ?? null,
    });
  if (error) console.warn("메시지 저장 실패", error);
}

/** 세션의 메시지 복원 */
export async function loadSessionMessages(
  sessionId: string,
  limit = 100,
): Promise<ImageGenMessage[]> {
  const { data, error } = await supabase
    .from("new_image_gen_messages")
    .select("*")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("메시지 복원 실패", error);
    return [];
  }
  return (data ?? []).map(mapRowToMessage);
}
