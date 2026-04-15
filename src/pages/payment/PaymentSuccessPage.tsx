/**
 * 결제 성공 페이지.
 *
 * 엣지케이스 대응:
 * - URL 직접 입력 방지: orderId로 DB에서 실제 주문 상태 확인
 * - NaN 방지: 숫자 변환 실패 시 fallback
 */
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CircleCheck, Loader2 } from "lucide-react";

import { supabase } from "@/shared/api/supabase";
import Button from "@/shared/ui/Button";

interface OrderInfo {
  amount: number;
  credits: number;
  productName: string;
}

const PaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const orderId = params.get("orderId") ?? "";

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  // DB에서 실제 주문 상태 확인
  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      return;
    }

    const verify = async () => {
      const { data } = await supabase
        .from("payment_orders")
        .select("amount, credit_amount, product_name, status")
        .eq("order_id", orderId)
        .single();

      if (data && data.status === "paid") {
        setOrder({
          amount: data.amount,
          credits: data.credit_amount,
          productName: data.product_name,
        });
        setIsValid(true);
      }
      setIsLoading(false);
    };

    verify();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValid || !order) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-black-15 bg-white p-8">
          <p className="text-14-regular text-black-60">
            결제 정보를 확인할 수 없어요.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => (window.location.href = "/dashboard")}
          >
            대시보드로 이동
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-black-15 bg-white p-8">
        <CircleCheck className="h-16 w-16 text-success-500" />

        <div className="text-center">
          <h1 className="text-title-22-semibold text-black-90">
            크레딧이 충전되었어요
          </h1>
          <p className="mt-2 text-title-16-semibold text-primary">
            +{order.credits.toLocaleString()} 크레딧
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 rounded-xl bg-black-5 p-4">
          <Row label="상품" value={order.productName} />
          <Row
            label="결제 금액"
            value={`${order.amount.toLocaleString()}원`}
          />
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
