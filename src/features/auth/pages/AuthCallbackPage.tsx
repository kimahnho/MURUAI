import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/supabase/supabase";

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      navigate("/");
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-16-regular text-black-70">로그인 처리 중...</span>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
