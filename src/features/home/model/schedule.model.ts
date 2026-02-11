import { supabase } from "@/shared/api/supabase";

export interface Schedule {
  id?: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_repeating: boolean;
  repeat_end_date?: string | null;
  target_type: "individual" | "group";
  student_id?: string | null;
  group_id?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  students_n?: {
    id: string;
    name: string;
  } | null;
  groups_n?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateScheduleInput {
  title: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_repeating: boolean;
  repeat_end_date?: string;
  target_type: "individual" | "group";
  student_id?: string;
  group_id?: string;
}

export const scheduleModel = {
  async create(
    input: CreateScheduleInput
  ): Promise<{ data: Schedule | null; error: Error | null }> {
    try {
      // 현재 로그인한 사용자 가져오기
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("schedules_n")
        .insert([
          {
            user_id: user.id,
            title: input.title,
            start_date: input.start_date,
            end_date: input.end_date,
            start_time: input.start_time,
            end_time: input.end_time,
            is_repeating: input.is_repeating,
            repeat_end_date: input.repeat_end_date || null,
            target_type: input.target_type,
            student_id:
              input.target_type === "individual" ? input.student_id : null,
            group_id: input.target_type === "group" ? input.group_id : null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err : new Error("일정 추가에 실패했습니다."),
      };
    }
  },

  async getAll(): Promise<{ data: Schedule[] | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("schedules_n")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err
            : new Error("일정 목록을 불러오는데 실패했습니다."),
      };
    }
  },

  async getByDateRange(
    startDate: string,
    endDate: string
  ): Promise<{ data: Schedule[] | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      // 날짜 범위가 겹치는 일정 조회 (학생/그룹 정보 포함)
      // (일정 시작일 <= 조회 종료일) AND (일정 종료일 >= 조회 시작일)
      const { data, error } = await supabase
        .from("schedules_n")
        .select(`
          *,
          students_n (id, name),
          groups_n (id, name)
        `)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .lte("start_date", endDate)
        .gte("end_date", startDate)
        .order("start_date", { ascending: true });

      console.log("📊 Supabase 쿼리 결과:", { data, error, startDate, endDate });

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error
            ? err
            : new Error("일정을 불러오는데 실패했습니다."),
      };
    }
  },

  async update(
    id: string,
    input: Partial<CreateScheduleInput>
  ): Promise<{ data: Schedule | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from("schedules_n")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err : new Error("일정 수정에 실패했습니다."),
      };
    }
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      // 소프트 삭제
      const { error } = await supabase
        .from("schedules_n")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err : new Error("일정 삭제에 실패했습니다."),
      };
    }
  },

  async hardDelete(id: string): Promise<{ error: Error | null }> {
    try {
      // 하드 삭제 (실제 데이터 삭제)
      const { error } = await supabase
        .from("schedules_n")
        .delete()
        .eq("id", id);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err : new Error("일정 삭제에 실패했습니다."),
      };
    }
  },
};
