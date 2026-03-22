/**
 * 관리자 크레딧 요청 관리 섹션 — pending 요청 승인/거절 + 처리 이력.
 */
import { useState } from "react";
import { Check, X, ChevronDown, ChevronUp } from "lucide-react";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import Badge from "@/shared/ui/Badge";
import Spinner from "@/shared/ui/Spinner";
import { useAdminCreditRequests } from "../hooks/useAdminCreditRequests";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const statusBadge = (status: string) => {
  if (status === "pending")
    return <Badge variant="warning">대기</Badge>;
  if (status === "approved")
    return <Badge variant="success">승인</Badge>;
  return <Badge variant="error">거절</Badge>;
};

const CreditRequestsSection = () => {
  const { requests, isLoading, manage } = useAdminCreditRequests();
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const processedRequests = requests.filter((r) => r.status !== "pending");

  const handleApprove = (requestId: string) => {
    manage.mutate({ requestId, action: "approved" });
  };

  const handleReject = () => {
    if (!rejectTarget) return;
    manage.mutate(
      { requestId: rejectTarget, action: "rejected" },
      { onSettled: () => setRejectTarget(null) },
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 대기 중 요청 */}
      <div className="flex flex-col gap-3">
        <h3 className="text-14-semibold text-black-80">
          대기 중인 요청 ({pendingRequests.length})
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="flex h-28 items-center justify-center rounded-xl bg-black-5 text-13-regular text-black-70">
            대기 중인 크레딧 요청이 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingRequests.map((req) => (
              <div
                key={req.request_id}
                className="flex items-center justify-between gap-4 rounded-xl border border-warning-100 bg-warning-50 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-14-semibold text-black-90 truncate">
                      {req.user_display_name || req.user_email}
                    </span>
                    {req.user_display_name && (
                      <span className="text-12-regular text-black-70 truncate">
                        {req.user_email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-12-regular text-black-70">
                    <span>잔여 {req.credit_balance}크레딧</span>
                    <span>요청일 {formatDate(req.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(req.request_id)}
                    disabled={manage.isPending}
                    className="flex items-center gap-1 rounded-lg bg-success px-3 py-1.5 text-13-semibold text-white-100 hover:opacity-90 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectTarget(req.request_id)}
                    disabled={manage.isPending}
                    className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-13-semibold text-black-70 hover:bg-black-5 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 처리된 요청 */}
      {processedRequests.length > 0 && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-1 text-13-semibold text-black-70 hover:text-black-70"
          >
            처리 이력 ({processedRequests.length})
            {isHistoryOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {isHistoryOpen && (
            <div className="flex flex-col gap-2">
              {processedRequests.map((req) => (
                <div
                  key={req.request_id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-14-semibold text-black-70 truncate">
                        {req.user_display_name || req.user_email}
                      </span>
                      {statusBadge(req.status)}
                    </div>
                    <div className="flex items-center gap-3 text-12-regular text-black-70">
                      <span>요청일 {formatDate(req.created_at)}</span>
                      {req.reviewed_at && (
                        <span>처리일 {formatDate(req.reviewed_at)}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
        title="크레딧 요청을 거절하시겠어요?"
        description="거절된 요청은 되돌릴 수 없습니다."
        confirmLabel="거절"
        cancelLabel="취소"
        variant="danger"
      />
    </div>
  );
};

export default CreditRequestsSection;
