/**
 * 캔버스 에디터 소개 섹션 — 라벨 + 제목 + 설명 + 에디터 미리보기.
 */
import { motion } from "framer-motion";

import { images } from "@/shared/assets";

const EditorIntroSection = () => (
  <section className="flex w-full flex-col items-center px-4 py-14 md:px-10 md:py-20">
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex w-full max-w-6xl flex-col items-center gap-5 text-center md:gap-6"
    >
      <span className="text-13-bold tracking-wide text-primary">
        CANVAS EDITOR
      </span>
      <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
        드래그 한 번으로 자유롭게 편집하세요
      </h2>
      <p className="max-w-lg text-14-regular leading-relaxed text-black-55 md:text-title-16-semibold">
        이미지, 텍스트, 템플릿을 캔버스 위에서 바로 조합하고 인쇄하세요.
      </p>

      <div className="mt-2 w-full overflow-hidden rounded-2xl border border-black-15 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
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
