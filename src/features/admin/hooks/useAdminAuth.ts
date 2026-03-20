/**
 * 관리자 접근 권한 확인과 인증 상태를 관리하는 훅.
 * user_profiles 테이블의 role 기반으로 관리자 여부를 판별한다.
 */
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";

type AdminAuthStatus = "loading" | "unauthenticated" | "authorized" | "unauthorized";

type AdminAuthState = {
  status: AdminAuthStatus;
  user: User | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

export const useAdminAuth = (): AdminAuthState => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const role = useAuthStore((s) => s.role);

  const isAdmin = role === "admin";

  const status: AdminAuthStatus = (() => {
    if (isLoading) return "loading";
    if (!user) return "unauthenticated";
    if (role === null) return "loading";
    return isAdmin ? "authorized" : "unauthorized";
  })();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    status,
    user,
    isAdmin,
    signOut,
  };
};
