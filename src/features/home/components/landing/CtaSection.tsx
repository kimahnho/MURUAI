/**
 * 랜딩 하단 CTA 배너 — 가입 유도.
 */
import { useModalStore } from "@/shared/store/useModalStore";

const CtaSection = () => {
  const openAuthModal = useModalStore((s) => s.openAuthModal);

  return (
    <section className="flex w-full px-6 py-10 md:px-10 md:py-16">
      <div className="flex flex-col items-center w-full gap-4 px-6 py-10 rounded-2xl border border-primary-200 bg-linear-to-br from-primary-50 via-primary-100 to-[#F59E0B]/5 text-center md:gap-6 md:px-12 md:py-14">
        <h2 className="text-headline-24-bold text-black-90 md:text-headline-28-bold">
          지금 바로 무료로 시작하세요
        </h2>
        <p className="text-14-regular text-black-60 md:text-16-regular">
          가입 후 모든 템플릿과 AI 기능을 바로 사용할 수 있어요.
        </p>
        <button
          onClick={openAuthModal}
          className="flex h-12 px-6 items-center justify-center rounded-xl bg-primary cursor-pointer md:h-14 md:px-8"
        >
          <span className="text-title-16-semibold text-white-100 md:text-title-18-semibold">
            무료로 가입하기
          </span>
        </button>
      </div>
    </section>
  );
};

export default CtaSection;
