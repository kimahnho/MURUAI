/**
 * 캔버스 에디터 소개 섹션 — 에디터 미리보기 이미지 + 안내 문구.
 */
import { motion } from "framer-motion";

import { images } from "@/shared/assets";

const EditorIntroSection = () => (
  <section className="flex w-full flex-col items-center bg-primary-50 px-4 py-14 md:px-10 md:py-20">
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex w-full max-w-3xl flex-col items-center gap-6 text-center md:gap-8"
    >
      <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
        캔버스 에디터로 자유롭게 수정해요
      </h2>

      <div className="relative w-full overflow-hidden rounded-2xl border border-primary-200 shadow-[0_8px_24px_-8px_rgba(124,58,237,0.08)]">
        <img
          src={images.mainImage}
          alt="무루아이 캔버스 에디터 미리보기"
          className="h-auto w-full"
          draggable={false}
        />
      </div>
    </motion.div>
  </section>
);

export default EditorIntroSection;
