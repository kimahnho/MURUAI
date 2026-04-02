/**
 * 히어로 섹션 — 메인 카피 + 서브 카피.
 */
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const HeroSection = () => (
  <section className="flex w-full flex-col items-center bg-linear-to-b from-[#FDFCFF] to-[#f5f3ff] px-4 pb-10 pt-16 md:px-10 md:pb-16 md:pt-28">
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex max-w-3xl flex-col items-center gap-5 text-center md:gap-6"
    >
      {/* 뱃지 */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200 bg-white/60 px-4 py-1.5 text-13-bold text-primary backdrop-blur-sm">
        <Sparkles className="h-3.5 w-3.5" />
        특수치료 전문 이미지 라이브러리
      </span>

      {/* 메인 카피 */}
      <h1 className="text-headline-32-bold text-black-90 md:text-headline-42-bold">
        특수치료를 위한
        <br />
        교육 이미지 라이브러리
      </h1>

      {/* 서브 카피 */}
      <p className="text-14-regular text-black-70 md:text-title-18-bold">
        3,000+ 이상의 고퀄리티 이미지를 지금 사용해보세요.
      </p>
    </motion.div>
  </section>
);

export default HeroSection;
