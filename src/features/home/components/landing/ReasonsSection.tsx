/**
 * 기능 소개 섹션 — 6개 카드 그리드 (3x2).
 */
import { motion } from "framer-motion";
import {
  ImageIcon,
  Clock,
  Sparkles,
  LayoutTemplate,
  Layers,
  Printer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: ImageIcon,
    title: "전문 이미지 3,000+",
    description:
      "특수치료에 맞춘 고퀄리티 이미지가 매주 업데이트됩니다.",
  },
  {
    icon: Clock,
    title: "5분 완성",
    description:
      "주제만 입력하면 AI가 완성된 학습지를 바로 만들어 드립니다.",
  },
  {
    icon: Sparkles,
    title: "AI 자동 생성",
    description:
      "감정추론, 스토리북, 어휘카드를 AI가 자동으로 구성합니다.",
  },
  {
    icon: LayoutTemplate,
    title: "검증된 템플릿 30+",
    description:
      "현장에서 바로 활용할 수 있는 학습자료 템플릿을 제공합니다.",
  },
  {
    icon: Layers,
    title: "캔버스 에디터",
    description:
      "드래그 앤 드롭으로 자유롭게 편집하고 조합할 수 있습니다.",
  },
  {
    icon: Printer,
    title: "바로 인쇄",
    description:
      "완성된 자료를 PDF로 다운로드하고 바로 인쇄하세요.",
  },
];

const ReasonsSection = () => (
  <section className="flex w-full flex-col items-center bg-black-5 px-4 py-14 md:px-10 md:py-20">
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex w-full max-w-6xl flex-col items-center gap-10 md:gap-12"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-13-bold tracking-wide text-primary">
          WHY MURU.AI
        </span>
        <h2 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
          자료 만드는 시간, 치료하는 시간으로
        </h2>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col gap-3 rounded-2xl border border-black-15 bg-white p-6 transition hover:border-primary-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-title-16-semibold text-black-90">
              {feature.title}
            </span>
            <span className="text-14-regular leading-relaxed text-black-55">
              {feature.description}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  </section>
);

export default ReasonsSection;
