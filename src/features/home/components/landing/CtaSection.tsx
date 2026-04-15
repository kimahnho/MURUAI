/**
 * 하단 CTA 섹션 — 가입 유도.
 */
import { ArrowRight } from "lucide-react";

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
      <div className="flex w-full max-w-6xl flex-col items-center gap-5 rounded-2xl border border-black-15 bg-black-5 px-6 py-12 text-center md:px-12 md:py-16">
        <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
          지금 바로 무료로 시작하세요
        </h2>
        <p className="text-14-regular text-black-55 md:text-title-16-semibold">
          회원가입만 하면 모든 기능을 바로 사용할 수 있어요.
        </p>
        {!isAuthenticated && (
          <button
            type="button"
            onClick={handleCtaClick}
            className="mt-1 flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-14-semibold text-white-100 transition hover:bg-primary-700"
          >
            무료로 가입하기
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};

export default CtaSection;
