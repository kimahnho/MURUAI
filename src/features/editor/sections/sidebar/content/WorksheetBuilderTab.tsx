/**
 * 템플릿 탭의 "직접 만들기" 서브탭 내용.
 * 컴포넌트 클릭 시 현재 페이지에 바로 CanvasElement로 삽입.
 */
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import type { CanvasElement } from "@/features/editor/model/canvasTypes";
import { useWorksheetElementStore } from "@/features/editor/store/worksheetElementStore";
import { buildWorksheetPage } from "@/features/editor/utils/buildWorksheetPage";
import type { WorksheetComponentType, WorksheetComponent } from "@/features/worksheet-editor/model/types";
import { EXAMPLE_1_EUUMHWA, EXAMPLE_2_PARENTS_DAY, EXAMPLE_3_VOCABULARY } from "@/features/worksheet-editor/utils/examples";

interface PaletteItem {
  type: WorksheetComponentType;
  icon: string;
  name: string;
  desc: string;
}

const PALETTE_SECTIONS: { title: string; items: PaletteItem[] }[] = [
  {
    title: "기본 컴포넌트",
    items: [
      { type: "header_instruction", icon: "📝", name: "제목", desc: "제목 + 활동 안내 문구" },
      { type: "date_name_field", icon: "📅", name: "날짜&이름", desc: "날짜·요일·이름 입력 칸" },
      { type: "reward_tracker", icon: "⭐", name: "칭찬 스탬프", desc: "칭찬 스티커 붙이는 칸" },
      { type: "info_guide", icon: "💬", name: "안내 가이드", desc: "캐릭터가 활동을 안내" },
    ],
  },
  {
    title: "조음 · 음운",
    items: [
      { type: "arrow_transform", icon: "🔄", name: "변환 쌍", desc: "발음 변환 연습 (간→갈)" },

      { type: "selection_sentence", icon: "✋", name: "문장 선택", desc: "두 문장 중 맞는 것 고르기" },
      { type: "grid_NxM", icon: "⊞", name: "단어 카드", desc: "이미지+텍스트 카드 배열" },
    ],
  },
  {
    title: "어휘 · 읽기 · 한글",
    items: [
      { type: "outline_title", icon: "🅰️", name: "글자 색칠하기", desc: "속 빈 큰 글씨" },
      { type: "writing_practice", icon: "✏️", name: "쓰기 칸 노트", desc: "음절 격자 따라쓰기" },
      { type: "coloring_area", icon: "🎨", name: "색칠공부", desc: "이미지 삽입 색칠 활동" },
      { type: "matching_connect", icon: "🔗", name: "의미 연결하기", desc: "좌↔우 선으로 연결" },
    ],
  },
  {
    title: "구문 · 문법",
    items: [
      { type: "sentence_completion", icon: "📝", name: "빈칸 완성", desc: "조사/접속사 빈칸 채우기" },
    ],
  },
  {
    title: "언어발달",
    items: [
      { type: "sentence_fill", icon: "✍️", name: "빈칸 문장", desc: "빈칸 써넣기·O/X 판단" },
      { type: "passage_question", icon: "📖", name: "지문+질문", desc: "이야기 읽고 질문 답하기" },
    ],
  },
  {
    title: "사고 · 연상",
    items: [
      { type: "mind_map", icon: "🧠", name: "마인드맵", desc: "중심어 연상 방사형 구조" },
    ],
  },
  {
    title: "기록",
    items: [
      { type: "checklist_table", icon: "📊", name: "체크리스트", desc: "어휘 목록/기록표" },
    ],
  },
  {
    title: "시간 · 수",
    items: [
      { type: "clock_face", icon: "🕐", name: "시계", desc: "아날로그/전자 시계" },
      { type: "calendar", icon: "📆", name: "달력", desc: "월간/주간 달력" },
    ],
  },
];

const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;
const CARD_WIDTH = 120;
const PREVIEW_SCALE = CARD_WIDTH / PAGE_WIDTH_PX;

interface ExampleDef {
  label: string;
  data: WorksheetComponent[];
}

interface ExampleWithPreview extends ExampleDef {
  elements: CanvasElement[];
}

const EXAMPLE_DEFS: ExampleDef[] = [
  { label: "유음화", data: EXAMPLE_1_EUUMHWA },
  { label: "어버이날", data: EXAMPLE_2_PARENTS_DAY },
  { label: "단어학습", data: EXAMPLE_3_VOCABULARY },
];

/** 컴포넌트 마운트 시 한 번만 빌드하는 lazy 초기화 */
const useLazyExamples = (): ExampleWithPreview[] => {
  const ref = useRef<ExampleWithPreview[] | null>(null);
  if (!ref.current) {
    ref.current = EXAMPLE_DEFS.map((ex) => {
      const page = buildWorksheetPage(ex.data);
      return { ...ex, elements: page.elements };
    });
  }
  return ref.current;
};

const SCROLL_STEP = CARD_WIDTH + 12; // 카드 너비 + gap

/** 예제 썸네일 가로 스크롤 + 좌우 플로팅 화살표 */
const ExampleCarousel = ({
  examples,
  onSelect,
}: {
  examples: ExampleWithPreview[];
  onSelect: (ex: ExampleWithPreview) => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    return () => el.removeEventListener("scroll", updateArrows);
  });

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -SCROLL_STEP : SCROLL_STEP,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {examples.map((ex) => (
          <div
            key={ex.label}
            className="flex flex-col gap-1.5 cursor-pointer shrink-0"
            style={{ width: CARD_WIDTH }}
            onClick={() => onSelect(ex)}
          >
            <div className="aspect-[1/1.414] bg-white-100 border border-black-25 rounded-lg shadow-sm hover:shadow-md hover:border-primary-300 transition overflow-hidden relative">
              <div className="absolute inset-0 pointer-events-none">
                <div
                  style={{
                    width: `${PAGE_WIDTH_PX}px`,
                    height: `${PAGE_HEIGHT_PX}px`,
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: "top left",
                  }}
                >
                  <DesignPaper
                    pageId={`example-preview-${ex.label}`}
                    orientation="vertical"
                    elements={ex.elements}
                    selectedIds={[]}
                    editingTextId={null}
                    readOnly
                  />
                </div>
              </div>
            </div>
            <span className="text-12-semibold text-black-80 text-center truncate">
              {ex.label}
            </span>
          </div>
        ))}
      </div>

      {/* 좌측 화살표 — 썸네일 이미지 영역 세로 중앙 */}
      {canScrollLeft && (
        <button
          type="button"
          className="absolute left-0 flex items-center justify-center w-7 h-7 rounded-full bg-white-100 border border-black-25 shadow-md hover:bg-black-5 transition z-10"
          style={{ top: `${(CARD_WIDTH * 1.414) / 2}px`, transform: "translateY(-50%)" }}
          onClick={() => scroll("left")}
          aria-label="이전 예제"
        >
          <ChevronLeft className="w-4 h-4 text-black-70" />
        </button>
      )}

      {/* 우측 화살표 — 썸네일 이미지 영역 세로 중앙 */}
      {canScrollRight && (
        <button
          type="button"
          className="absolute right-0 flex items-center justify-center w-7 h-7 rounded-full bg-white-100 border border-black-25 shadow-md hover:bg-black-5 transition z-10"
          style={{ top: `${(CARD_WIDTH * 1.414) / 2}px`, transform: "translateY(-50%)" }}
          onClick={() => scroll("right")}
          aria-label="다음 예제"
        >
          <ChevronRight className="w-4 h-4 text-black-70" />
        </button>
      )}
    </div>
  );
};

const WorksheetBuilderTab = () => {
  const requestInsert = useWorksheetElementStore((s) => s.requestInsert);
  const requestBatchInsert = useWorksheetElementStore((s) => s.requestBatchInsert);
  const showPanel = useWorksheetElementStore((s) => s.showPanel);
  const examples = useLazyExamples();

  // 직접 만들기 탭이 활성화되면 패널 표시
  useEffect(() => {
    showPanel();
  }, [showPanel]);

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* 예제 3종 — A4 썸네일 미리보기 */}
      <div>
        <p className="text-13-bold text-black-60 px-1 pb-2 mb-2 border-b border-black-15">
          예제 템플릿
        </p>
        <ExampleCarousel examples={examples} onSelect={(ex) => requestBatchInsert(ex.data)} />
      </div>

      {/* 컴포넌트 팔레트 */}
      {PALETTE_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-13-bold text-black-60 px-1 pb-2 mb-2 border-b border-black-15">
            {section.title}
          </p>
          <div className="flex flex-col gap-1">
            {section.items.map((item) => (
              <button
                key={item.type}
                type="button"
                className="flex items-center gap-3.5 w-full px-3 py-3 rounded-xl cursor-pointer transition border border-transparent hover:bg-primary-50 hover:border-primary-200 active:bg-primary-100 active:scale-[0.98] text-left"
                onClick={() => requestInsert(item.type)}
              >
                <span className="text-xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-14-semibold text-black-90">
                    {item.name}
                  </div>
                  <div className="text-13-regular text-black-50 mt-0.5 truncate">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorksheetBuilderTab;
