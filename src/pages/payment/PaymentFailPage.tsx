/**
 * 결제 실패 페이지. 콜백 API에서 리다이렉트된다.
 */
import { useSearchParams } from "react-router-dom";
import { CircleX } from "lucide-react";

import Button from "@/shared/ui/Button";

const PaymentFailPage = () => {
  const [params] = useSearchParams();
  const msg = params.get("msg") ?? "알 수 없는 오류가 발생했어요.";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-black-15 bg-white p-8">
        <CircleX className="h-16 w-16 text-error-500" />

        <div className="text-center">
          <h1 className="text-title-22-semibold text-black-90">
            결제에 실패했어요
          </h1>
          <p className="mt-2 text-14-regular text-black-60">{msg}</p>
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => (window.location.href = "/payment-test")}
        >
          다시 시도하기
        </Button>
      </div>
    </div>
  );
};

export default PaymentFailPage;
