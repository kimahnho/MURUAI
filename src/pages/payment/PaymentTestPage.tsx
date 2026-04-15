/**
 * 크레딧 구매 페이지.
 * 패키지 선택 → 서버에 주문 생성 → 나이스페이 결제창 호출.
 * 금액은 서버에서 결정 — 클라이언트 변조 불가.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import Button from "@/shared/ui/Button";

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (options: Record<string, unknown>) => void;
    };
  }
}

// JS SDK는 운영 URL 하나만 존재 — 샌드박스 구분은 clientId(S2_)로 함
const SDK_URL = "https://pay.nicepay.co.kr/v1/js/";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  tag?: string;
}

const PACKAGES: CreditPackage[] = [
  { id: "credit-30", name: "30 크레딧", credits: 30, price: 5000 },
  {
    id: "credit-100",
    name: "100 크레딧",
    credits: 100,
    price: 15000,
    tag: "인기",
  },
  {
    id: "credit-300",
    name: "300 크레딧",
    credits: 300,
    price: 39000,
    tag: "최저가",
  },
];

const PaymentTestPage = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(
    (s: { isAuthenticated: boolean }) => s.isAuthenticated,
  );
  const isLoading = useAuthStore(
    (s: { isLoading: boolean }) => s.isLoading,
  );

  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState("credit-100");
  const [isOrdering, setIsOrdering] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const scriptRef = useRef(false);

  // 비로그인 시 홈으로
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

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

  const handlePayment = useCallback(async () => {
    if (!window.AUTHNICE) return;

    setIsOrdering(true);
    try {
      // JWT 토큰 가져오기
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        navigate("/", { replace: true });
        return;
      }

      // 서버에 주문 생성 요청
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ productId: selectedId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "주문 생성 실패" }));
        alert(err.error ?? "주문 생성에 실패했어요.");
        return;
      }

      const { orderId, amount, goodsName, clientId } = await res.json();

      // 결제창 호출 — 서버가 결정한 금액 사용
      const returnUrl = `${window.location.origin}/api/payment/callback`;
      window.AUTHNICE.requestPay({
        clientId,
        method: "cardAndEasyPay",
        orderId,
        amount,
        goodsName,
        returnUrl,
        fnError: (result: { errorMsg: string }) => {
          alert(`결제 오류: ${result.errorMsg}`);
        },
      });
    } catch {
      alert("결제 요청 중 오류가 발생했어요.");
    } finally {
      setIsOrdering(false);
    }
  }, [selectedId, navigate]);

  const selected = PACKAGES.find((p) => p.id === selectedId);

  if (isLoading) return null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-lg flex-col gap-6 rounded-2xl border border-black-15 bg-white p-8">
        <div>
          <h1 className="text-title-22-semibold text-black-90">
            AI 크레딧 충전
          </h1>
          <p className="mt-1 text-14-regular text-black-50">
            이미지 생성, 스토리북 등 AI 기능에 사용할 크레딧을 충전하세요
          </p>
        </div>

        {/* 패키지 선택 */}
        <div className="flex flex-col gap-3">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedId(pkg.id)}
              className={`relative flex items-center justify-between rounded-xl border-2 px-5 py-4 text-left transition ${
                selectedId === pkg.id
                  ? "border-primary bg-primary-50"
                  : "border-black-15 hover:border-black-25"
              }`}
            >
              <div>
                <span className="text-title-16-semibold text-black-90">
                  {pkg.name}
                </span>
                {pkg.tag && (
                  <span className="ml-2 rounded-md bg-primary-100 px-2 py-0.5 text-12-semibold text-primary">
                    {pkg.tag}
                  </span>
                )}
                <p className="mt-0.5 text-13-regular text-black-50">
                  1크레딧 = {Math.round(pkg.price / pkg.credits)}원
                </p>
              </div>
              <span className="text-title-18-bold text-black-90">
                {pkg.price.toLocaleString()}원
              </span>
            </button>
          ))}
        </div>

        {/* 환불 정책 동의 */}
        <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-black-5 p-4">
          <input
            type="checkbox"
            checked={agreedToPolicy}
            onChange={(e) => setAgreedToPolicy(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          />
          <span className="text-13-regular text-black-60">
            <span className="text-13-semibold text-black-80">
              환불 규정에 동의합니다.
            </span>{" "}
            미사용 크레딧은 구매 후 7일 이내 전액 환불 가능합니다. 부분 사용 시
            잔여분만 환불되며, 7일 초과 시 환불이 불가합니다. 환불은 원결제
            수단으로 3~7영업일 내 처리됩니다.
          </span>
        </label>

        {/* 결제 버튼 */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handlePayment}
          disabled={!sdkLoaded || !agreedToPolicy || isOrdering}
          isLoading={isOrdering}
        >
          {!sdkLoaded
            ? "결제 준비 중..."
            : `${selected?.price.toLocaleString() ?? ""}원 결제하기`}
        </Button>

        <p className="text-center text-12-regular text-black-40">
          결제는 나이스페이먼츠를 통해 안전하게 처리됩니다
        </p>
      </div>
    </div>
  );
};

export default PaymentTestPage;
