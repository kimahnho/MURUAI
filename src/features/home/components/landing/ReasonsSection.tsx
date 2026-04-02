/**
 * 무루아이를 선택해야 하는 이유 섹션 — 3개 카드 그리드.
 */
import { motion } from "framer-motion";
import { ImageIcon, LayoutTemplate, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Reason {
  icon: LucideIcon;
  iconBg: string;
  title: string;
  description: string;
}

const REASONS: Reason[] = [
  {
    icon: ImageIcon,
    iconBg: "bg-primary-100 text-primary",
    title: "이미지 라이브러리 3,000+",
    description: "특수치료용 이미지가 계속 업데이트됩니다.",
  },
  {
    icon: LayoutTemplate,
    iconBg: "bg-success-50 text-success-700",
    title: "전문 템플릿 30+ 종",
    description: "검증된 학습자료 템플릿을 활용해보세요.",
  },
  {
    icon: Sparkles,
    iconBg: "bg-[#f3e8ff] text-primary-800",
    title: "AI 자료 생성",
    description: "AI로 원하는 이미지와 자료를 생성해 보세요.",
  },
];

const ReasonsSection = () => (
  <section className="flex w-full flex-col items-center px-4 py-14 md:px-10 md:py-20">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex w-full max-w-5xl flex-col items-center gap-8 md:gap-10"
    >
      <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
        무루아이를 선택해야 하는 이유
      </h2>

      <div className="grid w-full grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
        {REASONS.map((reason) => (
          <div
            key={reason.title}
            className="flex flex-col items-center gap-4 rounded-3xl border border-primary-100 bg-white p-6 text-center shadow-[0_4px_12px_rgba(124,58,237,0.03)] md:p-8"
          >
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${reason.iconBg}`}
            >
              <reason.icon className="h-7 w-7" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-title-16-semibold text-black-90 md:text-title-18-semibold">
                {reason.title}
              </span>
              <span className="text-14-regular text-black-70">
                {reason.description}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  </section>
);

export default ReasonsSection;
