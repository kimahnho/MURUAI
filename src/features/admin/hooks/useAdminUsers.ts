/**
 * 관리자 유저 목록 조회 훅.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchUserList } from "../api/adminCredits";
import type { AdminUser } from "../api/adminCredits";

export const useAdminUsers = () => {
  const query = useQuery<AdminUser[]>({
    queryKey: ["adminUsers"],
    queryFn: fetchUserList,
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
};
