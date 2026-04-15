/**
 * 나이스페이 샌드박스 결제 테스트 페이지.
 * JS SDK를 동적 로드하여 결제창을 호출한다.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import Button from "@/shared/ui/Button";

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (options: Record<string, unknown>) => void;
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_NICEPAY_CLIENT_ID;
// JS SDK는 운영 URL 하나만 존재 — 샌드박스 구분은 clientId(S2_)로 함
const SDK_URL = "https://pay.nicepay.co.kr/v1/js/";

const PaymentTestPage = () => {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [amount, setAmount] = useState(1000);
  const scriptRef = useRef(false);

  // 나이스페이 JS SDK 동적 로드
  useEffect(() => {
    if (scriptRef.current) return;
    scriptRef.current = true;

    const existing = document.querySelector(`script[src="${SDK_URL}"]`);
    if (existing) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => setSdkLoaded(true);
    document.head.appendChild(script);
  }, []);

  const handlePayment = useCallback(() => {
    if (!window.AUTHNICE) {
      alert("결제 SDK가 아직 로드되지 않았어요.");
      return;
    }

    const orderId = `TEST_${Date.now()}`;
    const returnUrl = `${window.location.origin}/api/payment/callback`;

    window.AUTHNICE.requestPay({
      clientId: CLIENT_ID,
      method: "cardAndEasyPay",
      orderId,
      amount,
      goodsName: "테스트 상품",
      returnUrl,
      fnError: (result: { errorMsg: string }) => {
        alert(`결제 오류: ${result.errorMsg}`);
      },
    });
  }, [amount]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border border-black-15 bg-white p-8">
        <h1 className="text-title-22-semibold text-black-90">
          결제 테스트 (샌드박스)
        </h1>

        <div className="flex flex-col gap-2">
          <label className="text-14-semibold text-black-70">결제 금액</label>
          <div className="flex gap-2">
            {[1000, 5000, 10000, 50000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`rounded-lg px-3 py-2 text-13-bold transition ${
                  amount === v
                    ? "bg-primary text-white"
                    : "bg-black-5 text-black-70 hover:bg-black-10"
                }`}
              >
                {v.toLocaleString()}원
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-xl bg-black-5 p-4">
          <div className="flex justify-between text-14-regular text-black-60">
            <span>상품명</span>
            <span className="text-black-90">테스트 상품</span>
          </div>
          <div className="flex justify-between text-14-regular text-black-60">
            <span>Client ID</span>
            <span className="truncate pl-4 text-black-90">
              {CLIENT_ID?.slice(0, 20)}...
            </span>
          </div>
          <div className="flex justify-between text-14-regular text-black-60">
            <span>환경</span>
            <span className="text-primary">샌드박스</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handlePayment}
          disabled={!sdkLoaded}
        >
          {sdkLoaded
            ? `${amount.toLocaleString()}원 결제하기`
            : "SDK 로딩 중..."}
        </Button>

        <p className="text-center text-12-regular text-black-40">
          샌드박스 환경이므로 실제 결제되지 않습니다
        </p>
      </div>
    </div>
  );
};

export default PaymentTestPage;
