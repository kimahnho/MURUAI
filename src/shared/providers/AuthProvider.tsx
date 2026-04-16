import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { trackActivityEvent } from "@/shared/utils/trackEvents";
import { mp } from "@/shared/utils/mixpanel";
import { CURRENT_TERMS_VERSION } from "@/shared/constants/terms";
import TermsConsentGate from "@/shared/ui/TermsConsentGate";

const setSentryUser = (user: { id: string; email?: string } | null) => {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
    });
  } else {
    Sentry.setUser(null);
  }
};

// role + 약관 동의 상태를 한 번에 조회
const fetchUserProfile = async (userId: string) => {
  const { data } = await supabase
    .from("user_profiles")
    .select("role, terms_accepted_at, terms_version")
    .eq("id", userId)
    .single();
  return {
    role: (data?.role as "user" | "admin") ?? "user",
    termsAccepted: data?.terms_version === CURRENT_TERMS_VERSION,
  };
};

// 프로필 조회를 별도 비동기로 분리 — getSession lock과 충돌 방지
const loadUserProfile = (
  userId: string,
  setRole: (role: "user" | "admin" | null) => void,
  setTermsAccepted: (accepted: boolean | null) => void,
) => {
  fetchUserProfile(userId)
    .then(({ role, termsAccepted }) => {
      setRole(role);
      setTermsAccepted(termsAccepted);
    })
    .catch(() => {
      setRole("user");
      setTermsAccepted(false);
    });
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, setUser, setRole, setTermsAccepted, setLoading, isLoading, termsAccepted } = useAuthStore();

  useEffect(() => {
    // 현재 세션 확인 — 동기 콜백으로 setLoading(false)를 즉시 호출
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSentryUser(session?.user ?? null);
      setLoading(false);
      if (session?.user?.id) {
        loadUserProfile(session.user.id, setRole, setTermsAccepted);
        mp.identify(session.user.id);
        mp.setUserProfile({ email: session.user.email ?? "" });
        void trackActivityEvent("session_start", session.user.id);
      }
    }).catch(() => {
      setUser(null);
      setRole(null);
      setLoading(false);
    });

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSentryUser(session?.user ?? null);
      if (_event === "SIGNED_IN" && session?.user) {
        loadUserProfile(session.user.id, setRole, setTermsAccepted);
        mp.identify(session.user.id);
        mp.setUserProfile({ email: session.user.email ?? "" });
        void trackActivityEvent("login", session.user.id);
      }
      if (_event === "SIGNED_OUT") {
        setRole(null);
        mp.reset();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [setUser, setRole, setTermsAccepted, setLoading]);

  // 로딩 중일 때는 빈 화면 또는 로딩 스피너 표시
  if (isLoading) {
    return null;
  }

  // 인증 유저 중 약관 미동의 시 게이트 표시
  if (user && termsAccepted === false) {
    return (
      <TermsConsentGate
        userId={user.id}
        onAccepted={() => setTermsAccepted(true)}
      />
    );
  }

  return <>{children}</>;
};
