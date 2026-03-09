/**
 * 내보내기 모달의 열림 상태와 대상 선택 동작을 관리하는 훅.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/shared/api/supabase";
import { useToastStore } from "../store/toastStore";

type TargetOption = {
  id: string;
  name: string;
};

export const useExportModal = () => {
  const showToast = useToastStore((state) => state.showToast);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalKey, setExportModalKey] = useState(0);
  const [exportUserId, setExportUserId] = useState<string | null>(null);
  const [students, setStudents] = useState<TargetOption[]>([]);
  const [groups, setGroups] = useState<TargetOption[]>([]);
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);

  const handleOpenExportModal = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) {
      showToast("로그인이 필요해요.");
      return;
    }
    setExportUserId(user.id);
    setIsExportModalOpen(true);
    // key를 증가시켜 모달 내부 로컬 상태(선택 대상/필터 등)를 열 때마다 초기화한다.
    setExportModalKey((prev) => prev + 1);
    setStudents([]);
    setGroups([]);
    setIsLoadingTargets(true);
    try {
      // 학생/그룹 목록은 독립 실패가 가능하므로 병렬 조회 후 개별 토스트로 오류를 안내한다.
      const [studentsResult, groupsResult] = await Promise.all([
        supabase.from("students_n").select("id,name").eq("user_id", user.id).is("deleted_at", null),
        supabase.from("groups_n").select("id,name").eq("owner_id", user.id).is("deleted_at", null),
      ]);

      if (studentsResult.error) {
        showToast("아동 목록을 불러오지 못했어요.");
      }
      if (groupsResult.error) {
        showToast("그룹 목록을 불러오지 못했어요.");
      }

      setStudents((studentsResult.data as TargetOption[] | null) ?? []);
      setGroups((groupsResult.data as TargetOption[] | null) ?? []);
    } catch {
      showToast("대상을 불러오지 못했어요.");
    } finally {
      setIsLoadingTargets(false);
    }
  }, [showToast]);

  const closeExportModal = useCallback(() => {
    setIsExportModalOpen(false);
  }, []);

  return {
    isExportModalOpen,
    exportModalKey,
    exportUserId,
    students,
    groups,
    isLoadingTargets,
    handleOpenExportModal,
    closeExportModal,
  };
};
