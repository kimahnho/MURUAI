/**
 * 결제 성공 페이지. 콜백 API에서 리다이렉트된다.
 */
import { useSearchParams } from "react-router-dom";
import { CircleCheck } from "lucide-react";

import Button from "@/shared/ui/Button";

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();

  const orderId = params.get("orderId") ?? "-";
  const tid = params.get("tid") ?? "-";
  const amount = params.get("amount") ?? "0";
  const cardName = params.get("cardName") ?? "-";

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-black-15 bg-white p-8">
        <CircleCheck className="h-16 w-16 text-success-500" />

        <div className="text-center">
          <h1 className="text-title-22-semibold text-black-90">
            결제가 완료되었어요
          </h1>
          <p className="mt-1 text-14-regular text-black-50">
            샌드박스 테스트 결제입니다
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-xl bg-black-5 p-4">
          <Row label="주문번호" value={orderId} />
          <Row label="거래 ID" value={tid} />
          <Row label="결제 금액" value={`${Number(amount).toLocaleString()}원`} />
          <Row label="카드사" value={cardName} />
        </div>

        <Button
          variant="primary"
          size="md"
          fullWidth
          onClick={() => (window.location.href = "/payment-test")}
        >
          다시 테스트하기
        </Button>
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
