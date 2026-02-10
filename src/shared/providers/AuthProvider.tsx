import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { trackActivityEvent } from "@/shared/utils/trackEvents";
import { mp } from "@/shared/utils/mixpanel";

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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { setUser, setLoading, isLoading } = useAuthStore();

  useEffect(() => {
    // 현재 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSentryUser(session?.user ?? null);
      setLoading(false);
      if (session?.user?.id) {
        mp.identify(session.user.id);
        mp.setUserProfile({ email: session.user.email ?? "" });
        void trackActivityEvent("session_start", session.user.id);
      }
    });

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSentryUser(session?.user ?? null);
      if (_event === "SIGNED_IN" && session?.user) {
        mp.identify(session.user.id);
        mp.setUserProfile({ email: session.user.email ?? "" });
        void trackActivityEvent("login", session.user.id);
      }
      if (_event === "SIGNED_OUT") {
        mp.reset();
      }
    });

    return () => { subscription.unsubscribe(); };
  }, [setUser, setLoading]);

  // 로딩 중일 때는 빈 화면 또는 로딩 스피너 표시
  if (isLoading) {
    return null;
  }

  return <>{children}</>;
};
