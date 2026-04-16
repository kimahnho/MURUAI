import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import { TERMS_STORAGE_KEY } from "@/shared/constants/terms";

// OAuth 후 sessionStorage의 약관 동의 정보를 user_profiles에 기록
const persistTermsConsent = async (userId: string) => {
  const raw = sessionStorage.getItem(TERMS_STORAGE_KEY);
  if (!raw) return;

  try {
    const consent = JSON.parse(raw) as { termsAcceptedAt: string; termsVersion: string };
    const MAX_RETRIES = 3;

    for (let i = 0; i < MAX_RETRIES; i++) {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          terms_accepted_at: consent.termsAcceptedAt,
          terms_version: consent.termsVersion,
        })
        .eq("id", userId);

      if (!error) {
        sessionStorage.removeItem(TERMS_STORAGE_KEY);
        return;
      }
      // handle_new_user() 트리거가 아직 행을 생성하지 않았을 수 있음
      await new Promise((r) => setTimeout(r, 500));
    }
    console.warn("약관 동의 기록 실패 (리트라이 초과)");
  } catch {
    console.warn("약관 동의 sessionStorage 파싱 실패");
  } finally {
    sessionStorage.removeItem(TERMS_STORAGE_KEY);
  }
};

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) {
        void persistTermsConsent(session.user.id);
      }
      navigate("/");
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-16-regular text-black-70">로그인 처리 중...</span>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
