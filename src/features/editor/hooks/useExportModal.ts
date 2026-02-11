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
    setExportModalKey((prev) => prev + 1);
    setStudents([]);
    setGroups([]);
    setIsLoadingTargets(true);
    try {
      const [studentsResult, groupsResult] = await Promise.all([
        supabase.from("students_n").select("id,name").is("deleted_at", null),
        supabase.from("groups_n").select("id,name").is("deleted_at", null),
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
