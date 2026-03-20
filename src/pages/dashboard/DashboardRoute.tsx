/**
 * /dashboard 라우트 페이지 — 인증 필수, 비인증 시 "/"로 리다이렉트.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/shared/store/useAuthStore";
import DashboardPage from "@/features/home/components/dashboard/DashboardPage";

const DashboardRoute = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) return null;

  return <DashboardPage />;
};

export default DashboardRoute;
