/**
 * 결제 실패 페이지.
 *
 * 엣지케이스 대응:
 * - 뒤로가기 방지: replaceState로 히스토리 교체
 * - 에러 코드 기반 메시지 (URL freetext 아님)
 */
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleX } from "lucide-react";

import Button from "@/shared/ui/Button";

const FAIL_MESSAGES: Record<string, string> = {
  auth_failed: "결제 인증에 실패했어요.",
  invalid_input: "잘못된 요청이에요.",
  order_not_found: "주문 정보를 찾을 수 없어요.",
  amount_mismatch: "결제 금액이 일치하지 않아요.",
  signature_invalid: "결제 데이터 검증에 실패했어요.",
  approve_failed: "결제 승인에 실패했어요.",
  credit_failed: "결제는 완료됐지만 크레딧 처리에 문제가 생겼어요. 관리자에게 문의해주세요.",
  network_error: "결제 처리 중 오류가 발생했어요.",
  server_error: "서버 오류가 발생했어요.",
};

const PaymentFailPage = () => {
  const [params] = useSearchParams();
  const code = params.get("code") ?? "unknown";
  const message = FAIL_MESSAGES[code] ?? "알 수 없는 오류가 발생했어요.";

  // 뒤로가기로 결제 페이지 재접근 방지
  useEffect(() => {
    window.history.replaceState(null, "", window.location.href);
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-black-15 bg-white p-8">
        <CircleX className="h-16 w-16 text-error-500" />

        <div className="text-center">
          <h1 className="text-title-22-semibold text-black-90">
            결제에 실패했어요
          </h1>
          <p className="mt-2 text-14-regular text-black-60">{message}</p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => (window.location.href = "/payment-test")}
          >
            다시 시도하기
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => (window.location.href = "/dashboard")}
          >
            대시보드로 이동
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailPage;
