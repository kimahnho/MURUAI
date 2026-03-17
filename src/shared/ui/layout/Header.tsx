import { images } from "@/shared/assets";
import { useModalStore } from "@/shared/store/useModalStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useAuth } from "@/shared/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const { openAuthModal } = useModalStore();
  const { isAuthenticated } = useAuthStore();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="flex w-full h-18 px-4 md:px-15 justify-between items-center border-b border-b-black-25">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex items-center justify-center cursor-pointer"
        aria-label="홈으로 이동"
      >
        <img src={images.mainLogo} alt="Main Logo" className="w-28 md:w-40 h-auto" />
      </button>

      <div className="flex h-10 items-center justify-center gap-2">
        {isAuthenticated ? (
          <>
            {/* <button
              type="button"
              onClick={() => navigate("/admin/user-docs")}
              className="flex items-center justify-center px-4 py-2 border border-black-25 rounded-xl hover:bg-black-10 transition cursor-pointer"
            >
              <span className="text-14-semibold text-black-100">관리자</span>
            </button> */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center justify-center px-4 py-2 border border-black-25 rounded-xl hover:bg-black-10 transition cursor-pointer"
            >
              <span className="text-14-semibold text-black-100">로그아웃</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center justify-center px-3 py-2 md:p-4 cursor-pointer"
            >
              <span className="text-14-semibold text-black-100">로그인</span>
            </button>

            <button
              type="button"
              onClick={openAuthModal}
              className="flex h-full items-center justify-center px-3 py-2 md:p-4 bg-primary rounded-xl cursor-pointer"
            >
              <span className="text-14-semibold text-white-100">가입하기</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
