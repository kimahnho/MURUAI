import { LogOut } from "lucide-react";
import { images } from "@/shared/assets";
import { useModalStore } from "@/shared/store/useModalStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useAuth } from "@/shared/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { trackLinkClickEvent } from "@/shared/utils/trackEvents";
import { mp } from "@/shared/utils/mixpanel";

const SMART_STORE_URL = "https://smartstore.naver.com/muruai";

const Header = () => {
  const navigate = useNavigate();
  const { openAuthModal } = useModalStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="flex w-full h-14 px-4 md:h-18 md:px-15 justify-between items-center border-b border-b-black-25">
      {/* 좌측: 로고 + About/자료마켓 */}
      <div className="flex items-center gap-1 md:gap-2">
        <button
          type="button"
          onClick={() => navigate(role === "tester" ? "/image-gen" : "/")}
          className="flex items-center justify-center cursor-pointer"
          aria-label="홈으로 이동"
        >
          <img src={images.mainLogo} alt="Main Logo" className="w-28 md:w-40 h-auto" />
        </button>

        <div className="hidden md:flex items-center gap-1 ml-2 mt-[10px]">
          <button
            type="button"
            onClick={() => navigate("/about")}
            className="flex items-center px-3 py-0 rounded-lg hover:bg-black-5 transition cursor-pointer"
          >
            <span className="text-14-semibold text-black-60 hover:text-black-90 whitespace-nowrap">About</span>
          </button>
          <a
            href={SMART_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { void trackLinkClickEvent("자료마켓"); mp.track("자료마켓 클릭"); }}
            className="flex items-center px-3 py-[2px] rounded-lg bg-primary-50 hover:bg-primary-100 transition cursor-pointer"
          >
            <span className="text-14-semibold text-primary whitespace-nowrap">자료마켓</span>
          </a>
        </div>
      </div>

      {/* 우측: 네비게이션 + 인증 */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        {/* 모바일 자료마켓 */}
        <a
          href={SMART_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { void trackLinkClickEvent("자료마켓"); mp.track("자료마켓 클릭"); }}
          className="flex md:hidden items-center px-2 py-1 cursor-pointer"
        >
          <span className="text-13-bold text-primary whitespace-nowrap">자료마켓</span>
        </a>

        {isAuthenticated ? (
          <>
            {role === "admin" && (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/admin")}
                  className="flex items-center px-2 py-1 md:px-4 cursor-pointer"
                >
                  <span className="text-13-bold md:text-14-semibold text-primary hover:text-primary-700 transition whitespace-nowrap">관리자</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/image-gen")}
                  className="flex items-center px-2 py-1 md:px-4 cursor-pointer"
                >
                  <span className="text-13-bold md:text-14-semibold text-primary hover:text-primary-700 transition whitespace-nowrap">이미지 생성</span>
                </button>
              </>
            )}
            {role === "tester" ? (
              <button
                type="button"
                onClick={() => navigate("/image-gen")}
                className="flex items-center px-2 py-1 md:px-4 cursor-pointer"
              >
                <span className="text-13-bold md:text-14-semibold text-primary hover:text-primary-700 transition whitespace-nowrap">이미지 생성</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center px-2 py-1 md:px-4 cursor-pointer"
                >
                  <span className="text-13-bold md:text-14-semibold text-black-70 hover:text-black-100 transition whitespace-nowrap">대시보드</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/mydoc")}
                  className="flex items-center px-2 py-1 md:px-4 cursor-pointer"
                >
                  <span className="text-13-bold md:text-14-semibold text-black-70 hover:text-black-100 transition whitespace-nowrap">내 학습자료</span>
                </button>
              </>
            )}
            {/* 모바일: 아이콘 */}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-lg hover:bg-black-10 transition cursor-pointer"
              aria-label="로그아웃"
            >
              <LogOut className="h-4.5 w-4.5 text-black-70" />
            </button>
            {/* 데스크탑: 텍스트 */}
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden md:flex items-center px-4 py-1 border border-black-25 rounded-xl hover:bg-black-10 transition cursor-pointer"
            >
              <span className="text-14-semibold text-black-100 whitespace-nowrap">로그아웃</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center px-3 py-1 md:px-4 cursor-pointer"
            >
              <span className="text-14-semibold text-black-100 whitespace-nowrap">로그인</span>
            </button>
            <button
              type="button"
              onClick={openAuthModal}
              className="flex items-center px-3 py-1 md:px-4 rounded-xl bg-primary cursor-pointer hover:bg-primary-700 transition"
            >
              <span className="text-14-semibold text-white-100 whitespace-nowrap">가입하기</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
