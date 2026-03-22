/**
 * About Us 페이지 — TEAM STORY + MISSION + VISION.
 */
import { motion } from "framer-motion";

// 페이지 진입 시 즉시 재생 (히어로 영역)
const fadeInOnMount = {
  initial: { opacity: 0, y: 24 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.6, ease: "easeOut" } as const,
};

// 지연 재생 (하단 영역 — 히어로 뒤에 순차 등장)
const fadeInDelayed = {
  initial: { opacity: 0, y: 24 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { duration: 0.6, ease: "easeOut", delay: 0.3 } as const,
};

const AboutPage = () => (
  <main className="flex flex-col items-center w-full">
    {/* TEAM STORY — 히어로 */}
    <section className="flex flex-col items-center w-full px-4 pt-16 pb-16 bg-linear-to-b from-[#FDFCFF] to-primary-50 md:px-10 md:pt-28 md:pb-24">
      <motion.div
        className="flex flex-col items-center w-full max-w-2xl gap-6 text-center"
        {...fadeInOnMount}
      >
        <span className="inline-flex rounded-full border border-primary-200 bg-white/60 px-4 py-1.5 text-13-bold text-primary backdrop-blur-sm">
          TEAM STORY
        </span>
        <h1 className="text-headline-28-bold text-black-90 md:text-headline-42-bold">
          무루아이는 아이들의
          <br className="hidden md:block" />
          내일을 바꿉니다
        </h1>
      </motion.div>

      <motion.div
        className="flex flex-col w-full max-w-xl gap-6 mt-10 md:mt-14 text-center"
        {...fadeInOnMount}
        transition={{ ...fadeInOnMount.transition, delay: 0.15 }}
      >
        <p className="text-16-regular text-black-70 leading-relaxed">
          특수교육 현장에서 2년을 보냈습니다.
          <br />
          선생님들의 노력에도 불구하고
          <br />
          아이들에게 맞춤화된 교육이 닿기 어려운 건,
          <br />
          환경의 문제였습니다.
        </p>
        <p className="text-16-regular text-black-70 leading-relaxed">
          그 간극에서 MURU.AI가 시작됐습니다.
          <br />
          현장 선생님들, 함께하는 기관들의 이야기를 들으며
          <br />
          만들어가고 있습니다.
        </p>
        <p className="text-16-regular text-black-90 leading-relaxed font-semibold">
          선생님들이 전문성을 온전히 펼칠 수 있을 때,
          <br />
          아이들도 자신의 속도로 자랄 수 있다고 믿습니다.
        </p>
      </motion.div>
    </section>

    {/* MISSION + VISION */}
    <section className="flex flex-col items-center w-full px-4 py-14 bg-white md:px-10 md:py-20">
      <div className="flex flex-col w-full max-w-2xl gap-16 md:gap-20 text-center">
        {/* MISSION */}
        <motion.div
          className="flex flex-col gap-4"
          {...fadeInDelayed}
          transition={{ ...fadeInDelayed.transition, delay: 0.1 }}
        >
          <span className="text-13-bold text-primary tracking-widest">
            MISSION
          </span>
          <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
            모든 치료사가 준비가 아닌
            <br />
            치료에 집중할 수 있는 환경을 만듭니다.
          </h2>
          <p className="text-16-regular text-black-70 leading-relaxed">
            선생님은 아이와의 상호작용에 더 집중할 수 있도록
            <br className="hidden md:block" />
            돕는 기술을 개발합니다.
          </p>
        </motion.div>

        {/* 구분선 */}
        <div className="w-12 h-px bg-primary-200 self-center" />

        {/* VISION */}
        <motion.div
          className="flex flex-col gap-4"
          {...fadeInDelayed}
          transition={{ ...fadeInDelayed.transition, delay: 0.2 }}
        >
          <span className="text-13-bold text-primary tracking-widest">
            VISION
          </span>
          <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
            특수치료 현장이 기술로
            <br />
            더 나아지는 세상
          </h2>
        </motion.div>
      </div>
    </section>
  </main>
);

export default AboutPage;
