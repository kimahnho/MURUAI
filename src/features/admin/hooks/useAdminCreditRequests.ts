/**
 * 관리자 크레딧 요청 목록 조회 및 승인/거절 훅.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCreditRequests, manageCreditRequest } from "../api/adminCredits";
import type { AdminCreditRequest } from "../api/adminCredits";

export const useAdminCreditRequests = () => {
  const queryClient = useQueryClient();

  const query = useQuery<AdminCreditRequest[]>({
    queryKey: ["adminCreditRequests"],
    queryFn: fetchCreditRequests,
  });

  const mutation = useMutation({
    mutationFn: ({
      requestId,
      action,
    }: {
      requestId: string;
      action: "approved" | "rejected";
    }) => manageCreditRequest(requestId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["adminCreditRequests"] });
      void queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    manage: mutation,
  };
};
