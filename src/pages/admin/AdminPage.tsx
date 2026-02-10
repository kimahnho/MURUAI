import AdminDashboardView from "@/features/admin/components/AdminDashboardView";
import AdminLoginView from "@/features/admin/components/AdminLoginView";
import UnauthorizedView from "@/features/admin/components/UnauthorizedView";
import { useAdminAuth } from "@/features/admin/hooks/useAdminAuth";
import { useAdminDashboard } from "@/features/admin/hooks/useAdminDashboard";

const AdminDashboardContainer = ({
  onSignOut,
  adminEmail,
}: {
  onSignOut: () => void;
  adminEmail: string | null;
}) => {
  const dashboard = useAdminDashboard();

  return (
    <AdminDashboardView
      adminEmail={adminEmail}
      range={dashboard.range}
      metrics={dashboard.metrics}
      isLoading={dashboard.isLoading}
      isFetching={dashboard.isFetching}
      errorMessage={dashboard.errorMessage}
      onRetry={() => { dashboard.refetch(); }}
      onPresetChange={dashboard.setPreset}
      onCustomRangeChange={dashboard.setCustomRange}
      onSignOut={onSignOut}
    />
  );
};

const AdminPage = () => {
  const { status, user, signOut } = useAdminAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-14-regular text-black-50">
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

  return (
    <AdminDashboardContainer
      adminEmail={user?.email ?? null}
      onSignOut={() => { void signOut(); }}
    />
  );
};

export default AdminPage;
