/**
 * 스토리북 위자드에서 사용할 아동 목록 조회 서비스.
 * features/home에 의존하지 않고 Supabase를 직접 쿼리한다.
 */
import { supabase } from "@/shared/api/supabase";

export interface StudentSummary {
  id: string;
  name: string;
  birth_year: string;
  gender: string | null;
  significant: string | null;
  learning_goal: string | null;
}

export async function fetchStudentsForWizard(): Promise<StudentSummary[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) return [];

  // gender 컬럼이 아직 없을 수 있으므로 먼저 포함해서 시도, 실패 시 제외하고 재시도
  const { data, error } = await supabase
    .from("students_n")
    .select("id, name, birth_year, gender, significant, learning_goal")
    .eq("user_id", session.user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!error) return data ?? [];

  // gender 컬럼이 없어서 실패한 경우 — gender 없이 재시도
  console.warn("students_n 조회 실패 (gender 포함), 재시도:", error);
  const { data: fallbackData, error: fallbackError } = await supabase
    .from("students_n")
    .select("id, name, birth_year, significant, learning_goal")
    .eq("user_id", session.user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (fallbackError) {
    console.warn("students_n 조회 실패:", fallbackError);
    return [];
  }

  return (fallbackData ?? []).map((s) => ({ ...s, gender: null }));
}
