/**
 * 치료 AI 서비스 — Gemini API 호출 + Supabase CRUD.
 * - 개발 모드(VITE_GOOGLE_API_KEY + DEV): 브라우저에서 Gemini 직접 호출
 * - 프로덕션: /api/genai/studio 서버 프록시 경유
 */
import { supabase } from "@/shared/api/supabase";
import { getGenAI } from "@/shared/api/genai";
import type {
  TherapyDomain,
  ChatMessage,
  TherapySession,
  TherapyStudentProfile,
  SessionEvaluation,
} from "../model/therapyTypes";

// ── API 호출 ──

interface StudioApiParams {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  domain?: TherapyDomain;
  lightweight?: boolean;
  autoLearnedContext?: string;
  studentDiagnosis?: string;
  responseSchema?: Record<string, unknown>;
}

interface StudioApiResponse {
  candidates?: Array<{
    content: { parts: Array<{ text: string }>; role: string };
  }>;
  safetyBlocked?: boolean;
  crisisDetected?: boolean;
  error?: string;
}

const isDev = import.meta.env.DEV && !!import.meta.env.VITE_GOOGLE_API_KEY;

export async function callStudioApi(params: StudioApiParams): Promise<StudioApiResponse> {
  // 개발 모드: Gemini 직접 호출 (도메인 레퍼런스 없이 — 서버 전용이므로)
  if (isDev) {
    const ai = getGenAI();
    const systemInstruction = buildDevSystemInstruction(params);
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: params.contents,
      config: {
        systemInstruction,
        maxOutputTokens: 8192,
        temperature: 0.5,
        responseMimeType: "application/json",
        ...(params.responseSchema && { responseSchema: params.responseSchema }),
      },
    });
    return response as StudioApiResponse;
  }

  // 프로덕션: 서버 프록시 경유
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch("/api/genai/studio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `API error: ${response.status}`);
  }

  return response.json();
}

// 개발 모드용 시스템 프롬프트 (responseSchema 구조에 맞춤)
function buildDevSystemInstruction(params: StudioApiParams): string {
  const parts = [
    "당신은 발달장애 아동 전문 언어재활사 API입니다.",
    "",
    "## 응답 형식 (절대 위반 금지)",
    "항상 다음 JSON 객체 형식으로 응답하세요:",
    '{"intent": "generate|modify|chat", "reply": "한국어 메시지", "sheets": [...]}',
    "",
    "## intent별 sheets 규칙",
    '- "generate": 새 학습지 생성. sheets에 5장 포함.',
    '- "modify": 기존 학습지 수정. 수정된 장 + 나머지 그대로 = 전체 5장을 sheets에 포함.',
    '- "chat": 일반 대화. sheets는 빈 배열 [].',
    "",
    "⚠️ sheets는 항상 포함해야 합니다. chat일 때만 빈 배열 [].",
    "",
    "## sheets 각 항목 필드",
    "title(string), worksheetType(string), difficulty(easy|medium|hard), itemCount(2~8), description(string)",
  ];
  if (params.domain) {
    parts.push(`\n현재 도메인: ${params.domain}`);
  }
  if (params.studentDiagnosis) {
    parts.push(`학생 진단: ${params.studentDiagnosis}`);
  }
  return parts.join("\n");
}

// ── 세션 CRUD ──

export async function createSession(
  userId: string,
  domain: TherapyDomain,
  studentId?: string,
): Promise<TherapySession> {
  const { data, error } = await supabase
    .from("therapy_sessions")
    .insert({ user_id: userId, domain, student_id: studentId, status: "active", session_data: {} })
    .select()
    .single();
  if (error) throw error;
  return mapSession(data);
}

export async function completeSession(
  sessionId: string,
  evaluation?: SessionEvaluation,
): Promise<void> {
  const updates: Record<string, unknown> = {
    status: "completed",
    completed_at: new Date().toISOString(),
  };
  if (evaluation) {
    updates.evaluation = evaluation;
  }
  const { error } = await supabase
    .from("therapy_sessions")
    .update(updates)
    .eq("id", sessionId);
  if (error) throw error;
}

export async function getUserSessions(userId: string): Promise<TherapySession[]> {
  const { data, error } = await supabase
    .from("therapy_sessions")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("session_data->title", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map(mapSession);
}

// ── 채팅 로그 CRUD ──

export async function saveChatMessage(
  userId: string,
  sessionId: string,
  message: ChatMessage,
): Promise<void> {
  const { error } = await supabase
    .from("therapy_chat_logs")
    .insert({
      user_id: userId,
      session_id: sessionId,
      role: message.role,
      content: message.content.slice(0, 2000),
      metadata: message.metadata ?? null,
    });
  if (error) console.warn("therapy_chat_logs insert failed", error);
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("therapy_chat_logs")
    .select("*")
    .eq("session_id", sessionId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    type: row.metadata?.type ?? "text",
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}

// ── 학생 치료 프로필 CRUD ──

export async function getStudentProfile(studentId: string): Promise<TherapyStudentProfile | null> {
  const { data, error } = await supabase
    .from("therapy_student_profiles")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw error;
  }
  return mapStudentProfile(data);
}

export async function upsertStudentProfile(
  userId: string,
  studentId: string,
  profileData: Partial<TherapyStudentProfile>,
): Promise<void> {
  const { error } = await supabase
    .from("therapy_student_profiles")
    .upsert(
      {
        user_id: userId,
        student_id: studentId,
        profile_data: profileData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id" },
    );
  if (error) throw error;
}

// ── 매퍼 ──

function mapSession(row: Record<string, unknown>): TherapySession {
  const sessionData = (row.session_data as Record<string, unknown>) ?? {};
  return {
    id: row.id as string,
    userId: row.user_id as string,
    studentId: row.student_id as string | undefined,
    title: (sessionData.title as string) ?? undefined,
    sheets: Array.isArray(sessionData.sheets) ? sessionData.sheets as TherapySession["sheets"] : undefined,
    domain: row.domain as TherapyDomain,
    status: row.status as TherapySession["status"],
    messages: [],
    evaluation: row.evaluation as SessionEvaluation | undefined,
    durationSeconds: row.duration_seconds as number | undefined,
    createdAt: row.created_at as string,
    completedAt: row.completed_at as string | undefined,
  };
}

function mapStudentProfile(row: Record<string, unknown>): TherapyStudentProfile {
  const pd = row.profile_data as Record<string, unknown> ?? {};
  return {
    id: row.id as string,
    userId: row.user_id as string,
    studentId: row.student_id as string,
    diagnosis: (pd.diagnosis as TherapyStudentProfile["diagnosis"]) ?? { comorbidities: [], rawText: "" },
    functionalAge: (pd.functionalAge as number) ?? 0,
    therapyGoals: (pd.therapyGoals as string[]) ?? [],
    articulationTargets: (pd.articulationTargets as string[]) ?? [],
    interests: (pd.interests as string[]) ?? [],
    sensoryTraits: (pd.sensoryTraits as string[]) ?? [],
    autoLearned: pd.autoLearned as TherapyStudentProfile["autoLearned"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
