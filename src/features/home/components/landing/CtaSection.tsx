/**
 * 하단 CTA 섹션 — 가입 유도.
 */
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { mp } from "@/shared/utils/mixpanel";

const CtaSection = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openAuthModal = useModalStore((s) => s.openAuthModal);

  const handleCtaClick = () => {
    mp.track("랜딩 하단 CTA 클릭");
    if (!isAuthenticated) {
      openAuthModal();
    }
  };

  return (
    <section className="flex w-full flex-col items-center px-4 py-14 md:px-10 md:py-20">
      <div className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-4xl border border-primary-200 bg-linear-to-br from-[#FDFCFF] via-[#f0ecfe] to-[#FDFCFF] px-6 py-10 text-center md:gap-5 md:px-12 md:py-14">
        <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
          지금 바로 무료로 이용해보세요.
        </h2>
        <p className="text-14-regular text-black-70 md:text-title-16-semibold">
          회원가입만 하면 모든 이미지와 템플릿을 바로 사용할 수 있어요.
        </p>
        {!isAuthenticated && (
          <button
            type="button"
            onClick={handleCtaClick}
            className="mt-1 rounded-xl bg-primary px-6 py-3 text-title-16-semibold text-white-100 transition hover:bg-primary-700"
          >
            무료로 가입하기
          </button>
        )}
      </div>
    </section>
  );
};

export default CtaSection;
