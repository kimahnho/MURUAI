import Footer from "@/shared/ui/layout/Footer";
import Header from "@/shared/ui/layout/Header";
import AuthModal from "@/shared/ui/AuthModal";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
    </div>
  );
};

export default MainLayout;
