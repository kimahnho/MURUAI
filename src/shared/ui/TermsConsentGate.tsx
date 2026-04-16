/**
 * 약관 미동의 유저에게 전체 화면 동의 모달을 표시하는 게이트 컴포넌트.
 * 동의 완료 전까지 앱 콘텐츠 접근을 차단한다.
 */
import { useState } from "react";
import { supabase } from "@/shared/api/supabase";
import { CURRENT_TERMS_VERSION } from "@/shared/constants/terms";
import { captureSentryError } from "@/shared/utils/sentryUtils";

interface TermsConsentGateProps {
  userId: string;
  onAccepted: () => void;
}

const TermsConsentGate = ({ userId, onAccepted }: TermsConsentGateProps) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!agreed) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: CURRENT_TERMS_VERSION,
        })
        .eq("id", userId);

      if (error) throw error;
      onAccepted();
    } catch (err) {
      captureSentryError(err, "약관 동의 저장");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black-100/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white-100 p-8 shadow-xl mx-4">
        {/* 제목 */}
        <h2 className="text-title-22-semibold text-black-100 text-center mb-2">
          서비스 이용 동의
        </h2>
        <p className="text-14-regular text-black-60 text-center mb-6">
          서비스를 이용하시려면 아래 약관에 동의해 주세요.
        </p>

        {/* 약관 링크 */}
        <div className="flex flex-col gap-2 mb-6 rounded-xl bg-black-5 p-4">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-14-medium text-primary hover:underline"
          >
            서비스 이용약관 보기 →
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-14-medium text-primary hover:underline"
          >
            개인정보 처리방침 보기 →
          </a>
        </div>

        {/* 동의 체크박스 */}
        <label className="flex items-start gap-2.5 cursor-pointer mb-6">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-black-30 accent-primary"
          />
          <span className="text-14-regular text-black-80 leading-snug">
            서비스 이용약관 및 개인정보 처리방침에 동의합니다.
          </span>
        </label>

        {/* 동의 버튼 */}
        <button
          type="button"
          onClick={handleAccept}
          disabled={!agreed || loading}
          className={`w-full rounded-xl py-3 text-title-16-semibold text-white-100 transition ${
            !agreed || loading
              ? "bg-black-40 cursor-not-allowed"
              : "bg-primary hover:bg-primary-700 cursor-pointer"
          }`}
        >
          {loading ? "처리 중..." : "동의하고 계속하기"}
        </button>
      </div>
    </div>
  );
};

export default TermsConsentGate;
