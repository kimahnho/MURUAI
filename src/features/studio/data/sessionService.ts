/**
 * 세션 기록/평가 영속화 서비스 — Supabase CRUD.
 * 세션 완료 시 채팅 메시지와 평가 점수를 저장한다.
 */
import { supabase } from "@/shared/api/supabase";
import type {
  TherapyDomain,
  SessionEvaluation,
  ChatMessage,
  WorksheetSuggestion,
} from "../model/therapyTypes";
import { MAX_MESSAGES_PER_SESSION } from "../model/therapyConstants";
import { saveChatMessage } from "./therapyService";

/**
 * 새 세션을 생성하고 ID를 반환한다.
 */
export async function startSession(
  userId: string,
  domain: TherapyDomain,
  studentId?: string,
  title?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("therapy_sessions")
    .insert({
      user_id: userId,
      domain,
      student_id: studentId ?? null,
      status: "active",
      session_data: { title: title ?? null },
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * 세션 완료 — status를 completed로 변경하고 평가를 저장한다.
 */
export async function finishSession(
  sessionId: string,
  evaluation?: SessionEvaluation,
  durationSeconds?: number,
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  if (evaluation) updates.evaluation = evaluation;
  if (durationSeconds != null) updates.duration_seconds = durationSeconds;

  const { error } = await supabase
    .from("therapy_sessions")
    .update(updates)
    .eq("id", sessionId);
  if (error) throw error;
}

/**
 * 세션의 채팅 메시지를 일괄 저장한다.
 * 최대 MAX_MESSAGES_PER_SESSION(50)개까지, 내용은 2000자 제한.
 */
export async function saveSessionMessages(
  userId: string,
  sessionId: string,
  messages: ChatMessage[],
): Promise<void> {
  const toSave = messages.slice(-MAX_MESSAGES_PER_SESSION);
  for (const msg of toSave) {
    await saveChatMessage(userId, sessionId, msg);
  }
}

/**
 * 세션 평가를 별도 테이블에 저장한다.
 */
export async function saveEvaluation(
  userId: string,
  sessionId: string,
  studentId: string | undefined,
  evaluation: SessionEvaluation,
): Promise<void> {
  const { error } = await supabase
    .from("therapy_evaluations")
    .insert({
      user_id: userId,
      session_id: sessionId,
      student_id: studentId ?? null,
      scores: evaluation.scores,
      notes: evaluation.notes ?? null,
    });
  if (error) console.warn("therapy_evaluations insert failed", error);
}

/**
 * 세션 데이터를 아카이브(소프트 삭제)한다.
 */
export async function archiveSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("therapy_sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}

/**
 * 세션의 학습지 세트(sheets)를 DB에 저장한다.
 * session_data JSONB에 sheets 배열을 병합한다.
 */
export async function updateSessionSheets(
  sessionId: string,
  sheets: WorksheetSuggestion[],
): Promise<void> {
  // 기존 session_data 읽기
  const { data: existing } = await supabase
    .from("therapy_sessions")
    .select("session_data")
    .eq("id", sessionId)
    .single();

  const currentData = (existing?.session_data as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from("therapy_sessions")
    .update({ session_data: { ...currentData, sheets } })
    .eq("id", sessionId);

  if (error) console.warn("session sheets 저장 실패", error);
}

/**
 * 특정 세션의 메시지를 복원한다.
 */
export async function loadSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("therapy_chat_logs")
    .select("*")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(MAX_MESSAGES_PER_SESSION);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    role: row.role as ChatMessage["role"],
    content: row.content as string,
    type: (row.metadata as Record<string, unknown>)?.type as ChatMessage["type"] ?? "text",
    metadata: row.metadata as ChatMessage["metadata"],
    createdAt: row.created_at as string,
  }));
}
