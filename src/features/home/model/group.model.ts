/**
 * 그룹 도메인 데이터 구조와 관련 타입을 정의하는 모델 모듈.
 */
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";
import type { Student } from "./student.model";

export interface GroupMember {
  group_id?: string;
  student_id: string;
  students_n?: Pick<Student, "id" | "name" | "birth_year">[] | Pick<Student, "id" | "name" | "birth_year"> | null;
}

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  groups_members_n?: GroupMember[];
}

export interface CreateGroupInput {
  name: string;
  description?: string;
  memberIds: string[];
}

export interface UpdateGroupInput extends CreateGroupInput {
  id: string;
}

export const groupModel = {
  async create(
    input: CreateGroupInput
  ): Promise<{ data: Group | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data: group, error: groupError } = await supabase
        .from("groups_n")
        .insert([
          {
            owner_id: user.id,
            name: input.name,
            description: input.description || null,
          },
        ])
        .select("id, owner_id, name, description, created_at")
        .single();

      if (groupError) throw groupError;

      if (input.memberIds.length > 0) {
        const memberRows = input.memberIds.map((studentId) => ({
          group_id: group.id,
          student_id: studentId,
        }));

        const { error: membersError } = await supabase
          .from("groups_members_n")
          .insert(memberRows);

        if (membersError) {
          await supabase.from("groups_n").delete().eq("id", group.id);
          throw membersError;
        }
      }

      return { data: group, error: null };
    } catch (err) {
      captureSentryError(err, "그룹 추가");
      return {
        data: null,
        error:
          err instanceof Error ? err : new Error("그룹 추가에 실패했습니다."),
      };
    }
  },

  async getAll(): Promise<{ data: Group[] | null; error: Error | null }> {
    try {
      // getUser() 대신 getSession() 사용으로 속도 개선
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { data, error } = await supabase
        .from("groups_n")
        .select(
          "id, owner_id, name, description, created_at, groups_members_n(student_id, students_n(id, name, birth_year))"
        )
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data: data as Group[], error: null };
    } catch (err) {
      captureSentryError(err, "그룹 목록 조회");
      return {
        data: null,
        error:
          err instanceof Error
            ? err
            : new Error("그룹 목록을 불러오는데 실패했습니다."),
      };
    }
  },

  async update(
    input: UpdateGroupInput
  ): Promise<{ data: Group | null; error: Error | null }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("로그인이 필요합니다.");
      }

      console.log("그룹 Update 시작 - user.id:", user.id, "group.id:", input.id);

      // owner_id 조건 제거 - RLS 정책에 의존
      const { data, error } = await supabase
        .from("groups_n")
        .update({
          name: input.name,
          description: input.description || null,
        })
        .eq("id", input.id)
        .select("id, owner_id, name, description, created_at");

      console.log("그룹 Update 응답 - data:", data, "error:", error);

      if (error) throw error;
      const updated = data?.[0] ?? null;

      if (!updated) {
        throw new Error("해당 그룹 정보를 찾을 수 없거나 수정 권한이 없습니다.");
      }

      // 기존 멤버 조회
      const { data: existingMembers, error: fetchMembersError } = await supabase
        .from("groups_members_n")
        .select("student_id")
        .eq("group_id", input.id);

      console.log("기존 멤버 조회 - data:", existingMembers, "error:", fetchMembersError);

      if (fetchMembersError) throw fetchMembersError;

      const existingMemberIds = existingMembers?.map(m => m.student_id) || [];
      const newMemberIds = input.memberIds;

      // 삭제할 멤버 (기존에는 있었지만 새로운 목록에는 없는 멤버)
      const toDelete = existingMemberIds.filter(id => !newMemberIds.includes(id));

      // 추가할 멤버 (새로운 목록에는 있지만 기존에는 없는 멤버)
      const toAdd = newMemberIds.filter(id => !existingMemberIds.includes(id));

      console.log("삭제할 멤버:", toDelete, "추가할 멤버:", toAdd);

      // 삭제할 멤버가 있으면 삭제
      if (toDelete.length > 0) {
        console.log("멤버 삭제 시작 - group_id:", input.id, "삭제할 ID들:", toDelete);
        const { data: deleteData, error: deleteError } = await supabase
          .from("groups_members_n")
          .delete()
          .eq("group_id", input.id)
          .in("student_id", toDelete)
          .select();

        console.log("멤버 삭제 응답 - data:", deleteData, "error:", deleteError);
        if (deleteError) throw deleteError;
      } else {
        console.log("삭제할 멤버가 없음");
      }

      // 추가할 멤버가 있으면 추가
      if (toAdd.length > 0) {
        const memberRows = toAdd.map((studentId) => ({
          group_id: input.id,
          student_id: studentId,
        }));

        const { error: membersError } = await supabase
          .from("groups_members_n")
          .insert(memberRows);

        console.log("멤버 추가 응답 - error:", membersError);
        if (membersError) throw membersError;
      }

      return { data: updated, error: null };
    } catch (err) {
      console.error("그룹 Update 실패:", err);
      captureSentryError(err, "그룹 수정");
      return {
        data: null,
        error:
          err instanceof Error ? err : new Error("그룹 수정에 실패했습니다."),
      };
    }
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const now = new Date().toISOString();

      // 멤버 소프트 삭제
      const { error: membersError } = await supabase
        .from("groups_members_n")
        .update({ deleted_at: now })
        .eq("group_id", id);

      if (membersError) throw membersError;

      // 그룹 소프트 삭제
      const { error } = await supabase
        .from("groups_n")
        .update({ deleted_at: now })
        .eq("id", id);

      if (error) throw error;

      return { error: null };
    } catch (err) {
      captureSentryError(err, "그룹 삭제");
      return {
        error:
          err instanceof Error ? err : new Error("그룹 삭제에 실패했습니다."),
      };
    }
  },
};
