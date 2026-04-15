/**
 * 결제 성공 페이지. 콜백 API에서 리다이렉트된다.
 */
import { useSearchParams } from "react-router-dom";
import { CircleCheck } from "lucide-react";

import Button from "@/shared/ui/Button";

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();

  const orderId = params.get("orderId") ?? "-";
  const amount = params.get("amount") ?? "0";
  const credits = params.get("credits") ?? "0";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-black-15 bg-white p-8">
        <CircleCheck className="h-16 w-16 text-success-500" />

        <div className="text-center">
          <h1 className="text-title-22-semibold text-black-90">
            크레딧이 충전되었어요
          </h1>
          <p className="mt-2 text-title-16-semibold text-primary">
            +{Number(credits).toLocaleString()} 크레딧
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-xl bg-black-5 p-4">
          <Row label="결제 금액" value={`${Number(amount).toLocaleString()}원`} />
          <Row label="주문번호" value={orderId.slice(0, 8) + "..."} />
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => (window.location.href = "/dashboard")}
          >
            대시보드로 이동
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => (window.location.href = "/payment-test")}
          >
            추가 충전하기
          </Button>
        </div>
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-14-regular">
    <span className="text-black-50">{label}</span>
    <span className="truncate pl-4 text-black-90">{value}</span>
  </div>
);

export default PaymentSuccessPage;
