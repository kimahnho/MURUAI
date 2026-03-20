/**
 * /admin 하위 모든 경로에 대한 권한 가드.
 * role !== "admin"이면 로그인/권한없음 화면을 표시하고 하위 라우트를 차단한다.
 */
import { Outlet } from "react-router-dom";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import AdminLoginView from "@/features/admin/components/AdminLoginView";
import UnauthorizedView from "@/features/admin/components/UnauthorizedView";

const AdminGuard = () => {
  const { status, user, signOut } = useAdminAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-14-regular text-black-70">
        관리자 정보를 확인하는 중입니다.
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AdminLoginView />;
  }

  if (status === "unauthorized") {
    return (
      <UnauthorizedView
        email={user?.email ?? null}
        onSignOut={() => { void signOut(); }}
      />
    );
  }

  return <Outlet />;
};

export default AdminGuard;
