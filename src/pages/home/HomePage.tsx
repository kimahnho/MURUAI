import { useAuthStore } from "@/shared/store/useAuthStore";
import LandingPage from "@/features/home/components/landing/LandingPage";
import DashboardPage from "@/features/home/components/dashboard/DashboardPage";

const HomePage = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return isAuthenticated ? <DashboardPage /> : <LandingPage />;
};

export default HomePage;
