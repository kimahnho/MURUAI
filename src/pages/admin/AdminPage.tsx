/**
 * 관리자 대시보드 메인 페이지.
 * 권한 체크는 AdminGuard에서 처리 — 이 컴포넌트는 authorized 상태에서만 렌더링됨.
 */
import { useEffect } from "react";
import AdminDashboardView from "@/features/admin/components/AdminDashboardView";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";
import { mp } from "@/shared/utils/mixpanel";

const AdminPage = () => {
  const { user, signOut } = useAdminAuth();
  const dashboard = useAdminDashboard();

  useEffect(() => {
    mp.track("관리자 대시보드 접속");
  }, []);

  return (
    <AdminDashboardView
      adminEmail={user?.email ?? null}
      range={dashboard.range}
      metrics={dashboard.metrics}
      isLoading={dashboard.isLoading}
      isFetching={dashboard.isFetching}
      errorMessage={dashboard.errorMessage}
      onRetry={() => { dashboard.refetch(); }}
      onPresetChange={dashboard.setPreset}
      onCustomRangeChange={dashboard.setCustomRange}
      onSignOut={() => { void signOut(); }}
    />
  );
};

export default AdminPage;
