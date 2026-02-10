import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { useModalStore } from "@/shared/store/useModalStore";
import { images } from "@/shared/assets";
import { useAuth } from "@/shared/hooks/useAuth";

const AuthModal = () => {
  const { openModal, closeModal } = useModalStore();
  const {
    loading,
    error,
    signInWithGoogle,
    signInWithKakao,
    signInWithEmail,
    signUpWithEmail,
  } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isOpen = openModal === "auth";

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  const handleReset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setIsLoginMode(true);
  };

  const handleClose = () => {
    handleReset();
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isLoginMode) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, name);
      }
      handleClose();
    } catch {
      // 에러는 useAuth 훅에서 처리됨
    }
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  const handleKakaoLogin = async () => {
    await signInWithKakao();
  };

  const isSubmitDisabled =
    loading ||
    !email.trim() ||
    !password.trim() ||
    (!isLoginMode && !name.trim());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-sm overflow-hidden">
      {/* 모달 배경 */}
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* 모달 콘텐츠 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white-100 p-8 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-6 right-6 rounded-lg p-1 text-black-70 transition hover:bg-black-10 hover:text-black-100 cursor-pointer"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 로고 및 제목 */}
        <div className="flex flex-col items-center gap-2 text-center">
          {!isLoginMode && (
            <h2 className="text-title-24-semibold text-black-100 mb-2">
              회원가입
            </h2>
          )}
          {isLoginMode && (
            <>
              <div className="w-80 h-50 overflow-hidden">
                <img
                  src={images.mainLogo}
                  alt="MURU.AI"
                  className="w-full h-auto scale-125 -translate-y-[10%]"
                />
              </div>
              <p className="text-title-18-semibold text-black-60">
                치료사 선생님을 위한 학습지 디자인 도구
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col pt-5 gap-4">
          {/* 에러 메시지 */}
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-14-regular text-red-600">
              {error}
            </div>
          )}

          {/* 소셜 로그인 버튼 */}
          <div className="flex flex-col gap-3">
            {/* Google 로그인 버튼 - Google Brand Guidelines */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex h-11 items-center justify-center gap-3 rounded-md bg-white-100 border border-[#dadce0] py-0 px-3 text-14-medium text-[#3c4043] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g fill="none" fillRule="evenodd">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.44 15.983 5.485 18 9.003 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                    fill="#EA4335"
                  />
                </g>
              </svg>
              Google로 계속하기
            </button>

            {/* 카카오 로그인 버튼 - Kakao Brand Guidelines */}
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={loading}
              className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#FEE500] py-0 px-3 text-15-semibold text-black-100 opacity-[0.85] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="#000000"
                  fillRule="evenodd"
                  d="M9 0C4.029 0 0 3.13 0 7c0 2.485 1.596 4.673 4.011 5.931l-1.026 3.772c-.094.346.257.638.558.462l4.12-2.407A10.152 10.152 0 0 0 9 14c4.971 0 9-3.13 9-7s-4.029-7-9-7z"
                />
              </svg>
              카카오 로그인
            </button>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-3 text-black-60">
            <span className="h-px flex-1 bg-black-20" />
            <span className="text-14-regular">또는</span>
            <span className="h-px flex-1 bg-black-20" />
          </div>

          {/* 이메일 로그인 폼 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLoginMode && (
              <input
                type="text"
                placeholder="이름"
                aria-label="이름"
                value={name}
                onChange={(e) => { setName(e.target.value); }}
                className="rounded-2xl border border-black-20 px-4 py-3 text-15-regular text-black-100 placeholder:text-black-50 focus:border-primary focus:outline-none"
                required
              />
            )}
            <input
              type="email"
              placeholder="이메일"
              aria-label="이메일"
              value={email}
              onChange={(e) => { setEmail(e.target.value); }}
              className="rounded-2xl border border-black-20 px-4 py-3 text-15-regular text-black-100 placeholder:text-black-50 focus:border-primary focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="비밀번호"
              aria-label="비밀번호"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              className="rounded-2xl border border-black-20 px-4 py-3 text-15-regular text-black-100 placeholder:text-black-50 focus:border-primary focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className={`mt-2 rounded-2xl py-3 text-title-16-semibold text-white-100 shadow-sm transition ${
                isSubmitDisabled
                  ? "bg-black-40 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 cursor-pointer"
              }`}
            >
              {isLoginMode ? "로그인" : "회원가입"}
            </button>
          </form>

          {/* 모드 전환 */}
          <div className="text-center text-14-regular text-black-60">
            {isLoginMode ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
            <button
              type="button"
              onClick={() => { setIsLoginMode(!isLoginMode); }}
              className="text-title-14-semibold text-primary hover:underline cursor-pointer"
            >
              {isLoginMode ? "회원가입" : "로그인"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
