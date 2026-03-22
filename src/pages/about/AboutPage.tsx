/**
 * About Us 페이지 — TEAM STORY + MISSION + VISION.
 */
import { motion } from "framer-motion";
import { Heart, Lightbulb } from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 40 } as const,
  whileInView: { opacity: 1, y: 0 } as const,
  viewport: { once: true, margin: "-60px" } as const,
  transition: { duration: 0.6, ease: "easeOut" } as const,
};

const AboutPage = () => (
  <main className="flex flex-col items-center w-full">
    {/* TEAM STORY */}
    <section className="flex flex-col items-center w-full px-4 pt-16 pb-14 bg-linear-to-b from-[#FDFCFF] to-primary-50 md:px-10 md:pt-24 md:pb-20">
      <motion.div className="flex flex-col w-full max-w-3xl gap-6" {...fadeInUp}>
        <span className="text-13-bold text-primary tracking-widest">
          TEAM STORY
        </span>
        <h1 className="text-headline-28-bold text-black-90 md:text-headline-42-bold">
          무루아이는 아이들의 내일을 바꿉니다
        </h1>
        <div className="flex flex-col gap-5 text-16-regular text-black-70 leading-relaxed">
          <p>
            특수교육 현장에서 2년을 보냈습니다. 선생님들의 노력에도 불구하고
            아이들에게 맞춤화된 교육이 닿기 어려운 건, 환경의 문제였습니다.
          </p>
          <p>
            그 간극에서 MURU.AI가 시작됐습니다. 현장 선생님들, 함께하는
            기관들의 이야기를 들으며 만들어가고 있습니다.
          </p>
          <p>
            선생님들이 전문성을 온전히 펼칠 수 있을 때, 아이들도 자신의 속도로
            자랄 수 있다고 믿습니다.
          </p>
        </div>
      </motion.div>
    </section>

    {/* MISSION + VISION */}
    <section className="flex flex-col items-center w-full px-4 py-14 bg-white md:px-10 md:py-20">
      <div className="grid w-full max-w-3xl grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        {/* MISSION */}
        <motion.div
          className="flex flex-col gap-4 rounded-3xl border border-primary-100 bg-primary-50 p-6 md:p-8"
          {...fadeInUp}
          transition={{ ...fadeInUp.transition, delay: 0.1 }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
              <Heart className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="text-13-bold text-primary tracking-widest">
              OUR MISSION
            </span>
          </div>
          <h2 className="text-title-18-semibold text-black-90 md:text-title-22-semibold">
            모든 치료사가 준비가 아닌 치료에 집중할 수 있는 환경을 만듭니다.
          </h2>
          <p className="text-14-regular text-black-70">
            선생님은 아이와의 상호작용에 더 집중할 수 있도록 돕는 기술을
            개발합니다.
          </p>
        </motion.div>

        {/* VISION */}
        <motion.div
          className="flex flex-col gap-4 rounded-3xl border border-primary-100 bg-primary-50 p-6 md:p-8"
          {...fadeInUp}
          transition={{ ...fadeInUp.transition, delay: 0.2 }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100">
              <Lightbulb className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="text-13-bold text-primary tracking-widest">
              OUR VISION
            </span>
          </div>
          <h2 className="text-title-18-semibold text-black-90 md:text-title-22-semibold">
            특수치료 현장이 기술로 더 나아지는 세상
          </h2>
        </motion.div>
      </div>
    </section>
  </main>
);

export default AboutPage;
