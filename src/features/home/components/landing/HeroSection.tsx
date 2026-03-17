/**
 * 랜딩 히어로 섹션 — 서비스 헤드라인 + CTA + 에디터 미리보기.
 */
import { useModalStore } from "@/shared/store/useModalStore";
import { images } from "@/shared/assets";

interface HeroSectionProps {
  featureSectionRef: React.RefObject<HTMLElement | null>;
}

const HeroSection = ({ featureSectionRef }: HeroSectionProps) => {
  const openAuthModal = useModalStore((s) => s.openAuthModal);

  const handleScrollToFeatures = () => {
    featureSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="flex flex-col items-center w-full px-6 pt-16 pb-14 bg-linear-to-b from-primary-50 to-transparent md:px-10 md:pt-24 md:pb-20">
      <div className="flex flex-col items-center max-w-3xl gap-5 text-center md:gap-6">
        <h1 className="text-headline-28-bold text-black-90 md:text-headline-42-bold">
          수업 자료, 더 쉽고 빠르게
          <br />
          무루아이와 함께 만들어요
        </h1>

        <p className="text-title-16-semibold text-black-60 md:text-title-20-semibold">
          언어치료·특수교육 선생님을 위한 학습지 디자인 도구.
          <br />
          25종 템플릿과 AI가 수업 준비 시간을 줄여드려요.
        </p>

        <div className="flex flex-col items-center gap-3 mt-2 w-full md:flex-row md:justify-center md:gap-4 md:mt-4">
          <button
            onClick={openAuthModal}
            className="flex w-full h-14 items-center justify-center rounded-xl bg-primary cursor-pointer md:w-50"
          >
            <span className="text-title-18-semibold text-white-100">
              바로 시작하기
            </span>
          </button>
          <button
            onClick={handleScrollToFeatures}
            className="flex w-full h-14 items-center justify-center border border-primary rounded-xl cursor-pointer md:w-50"
          >
            <span className="text-title-18-semibold text-primary">
              기능 둘러보기
            </span>
          </button>
        </div>

        {/* 에디터 미리보기 이미지 */}
        <div className="relative w-full max-w-2xl mt-8 rounded-2xl overflow-hidden shadow-2xl border border-black-25 md:mt-10">
          <img
            src={images.mainImage}
            alt="무루아이 에디터 미리보기"
            className="w-full h-auto"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
