/**
 * 학생 도메인 데이터 구조와 입력 계약을 정의하는 모델 모듈.
 */
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";

export interface Student {
  id?: string;
  user_id: string;
  name: string;
  birth_year: string;
  gender?: string | null;
  significant?: string;
  learning_goal?: string;
  created_at?: string;
}

export interface CreateStudentInput {
  name: string;
  birth_year: string;
  gender?: string | null;
  significant?: string;
  learning_goal?: string;
}

export interface UpdateStudentInput extends CreateStudentInput {
  id: string;
}

export const studentModel = {
  async create(input: CreateStudentInput): Promise<{ data: Student | null; error: Error | null }> {
    try {
      // 현재 로그인한 사용자 가져오기
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("students_n")
        .insert([
          {
            user_id: user.id,
            name: input.name,
            birth_year: input.birth_year,
            gender: input.gender || null,
            significant: input.significant || null,
            learning_goal: input.learning_goal || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      captureSentryError(err, "아동 추가");
      return {
        data: null,
        error: err instanceof Error ? err : new Error("아동 추가에 실패했습니다.")
      };
    }
  },

  async getAll(): Promise<{ data: Student[] | null; error: Error | null }> {
    try {
      // getUser() 대신 getSession() 사용으로 속도 개선
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("students_n")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      captureSentryError(err, "아동 목록 조회");
      return {
        data: null,
        error: err instanceof Error ? err : new Error("아동 목록을 불러오는데 실패했습니다.")
      };
    }
  },

  async update(
    input: UpdateStudentInput
  ): Promise<{ data: Student | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      console.log("Update 시작 - user.id:", user.id, "student.id:", input.id);
      console.log("Update 할 데이터:", {
        name: input.name,
        birth_year: input.birth_year,
        significant: input.significant || null,
        learning_goal: input.learning_goal || null,
      });

      // user_id 조건 제거 - RLS 정책에 의존
      const { data, error } = await supabase
        .from("students_n")
        .update({
          name: input.name,
          birth_year: input.birth_year,
          gender: input.gender || null,
          significant: input.significant || null,
          learning_goal: input.learning_goal || null,
        })
        .eq("id", input.id)
        .select();

      console.log("Update 응답 - data:", data, "error:", error);

      if (error) throw error;
      const updated = data?.[0] ?? null;

      if (!updated) {
        throw new Error("해당 아동 정보를 찾을 수 없거나 수정 권한이 없습니다.");
      }

      return { data: updated, error: null };
    } catch (err) {
      console.error("Update 실패:", err);
      captureSentryError(err, "아동 수정");
      return {
        data: null,
        error:
          err instanceof Error ? err : new Error("아동 수정에 실패했습니다."),
      };
    }
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from("students_n")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      captureSentryError(err, "아동 삭제");
      return {
        error: err instanceof Error ? err : new Error("아동 삭제에 실패했습니다.")
      };
    }
  },
};
