/**
 * 관리자 접근 권한 확인과 인증 상태를 관리하는 훅.
 */
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";

const ADMIN_EMAIL = "admin@muruai.com";

type AdminAuthStatus = "loading" | "unauthenticated" | "authorized" | "unauthorized";

type AdminAuthState = {
  status: AdminAuthStatus;
  user: User | null;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

export const useAdminAuth = (): AdminAuthState => {
  const { user, isLoading } = useAuthStore();

  const isAdmin = Boolean(
    user?.email && user.email.toLowerCase() === ADMIN_EMAIL
  );

  const status: AdminAuthStatus = (() => {
    if (isLoading) return "loading";
    if (!user) return "unauthenticated";
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
