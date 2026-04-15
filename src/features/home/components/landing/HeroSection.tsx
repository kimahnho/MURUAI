/**
 * 히어로 섹션 — 배경 이미지 위에 좌측 텍스트 오버레이.
 * 좌측은 블러+그라데이션으로 텍스트 가독성 확보.
 */
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onStartClick?: () => void;
}

const HeroSection = ({ onStartClick }: HeroSectionProps) => (
  <section className="relative flex w-full overflow-hidden md:min-h-[520px]">
    {/* 배경 이미지 — 우측 정렬, 사람이 작게 보이도록 contain 느낌 */}
    <img
      src="/hero-image.webp"
      alt=""
      className="absolute inset-0 h-full w-full object-cover object-[70%_30%]"
      draggable={false}
    />

    {/* 좌측 블러 + 그라데이션 오버레이 */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(to right, rgba(255,255,255,1) 0%, rgba(255,255,255,0.97) 30%, rgba(255,255,255,0.85) 45%, rgba(255,255,255,0.4) 65%, transparent 80%)",
      }}
    />

    {/* 콘텐츠 */}
    <div className="relative z-10 flex w-full items-end justify-center px-4 py-14 md:px-10 md:pb-28 md:pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full max-w-6xl"
      >
        <div className="flex max-w-lg flex-col gap-5">
          <span className="text-13-bold tracking-wide text-primary">
            AI-POWERED THERAPY MATERIALS
          </span>

          <h1 className="text-headline-32-bold leading-tight text-black-100 md:text-headline-42-bold md:leading-tight">
            전문성으로 설계하고,
            <br />
            AI로 완성하세요.
          </h1>

          <p className="text-14-regular leading-relaxed text-black-55 md:text-title-16-semibold">
            감정추론, 스토리북, 어휘카드까지.
            <br />
            5분만에 전문 학습자료를 만들어 보세요.
          </p>

          <div>
            <button
              type="button"
              onClick={onStartClick}
              className="flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-14-semibold text-white-100 transition hover:bg-primary-700"
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
