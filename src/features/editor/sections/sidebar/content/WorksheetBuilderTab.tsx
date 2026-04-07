/**
 * 템플릿 탭의 "직접 만들기" 서브탭 내용.
 * 컴포넌트 클릭 시 현재 페이지에 바로 CanvasElement로 삽입.
 */
import { useEffect } from "react";

import { useWorksheetElementStore } from "@/features/editor/store/worksheetElementStore";
import type { WorksheetComponentType } from "@/features/worksheet-editor/model/types";
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
      { type: "reward_tracker", icon: "⭐", name: "칭찬 스탬프", desc: "칭찬 스티커 붙이는 칸" },
      { type: "info_guide", icon: "💬", name: "안내 가이드", desc: "캐릭터가 활동을 안내" },
    ],
  },
  {
    title: "조음 · 음운",
    items: [
      { type: "arrow_transform", icon: "🔄", name: "변환 쌍", desc: "발음 변환 연습 (간→갈)" },
      { type: "sequential_repeat", icon: "🔁", name: "반복 연습", desc: "반복 발음 연습 (바바바)" },
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
    title: "기록",
    items: [
      { type: "checklist_table", icon: "📊", name: "체크리스트", desc: "어휘 목록/기록표" },
    ],
  },
];

const EXAMPLES = [
  { label: "예제1: 유음화", data: EXAMPLE_1_EUUMHWA },
  { label: "예제2: 어버이날", data: EXAMPLE_2_PARENTS_DAY },
  { label: "예제3: 단어학습", data: EXAMPLE_3_VOCABULARY },
];

const WorksheetBuilderTab = () => {
  const requestInsert = useWorksheetElementStore((s) => s.requestInsert);
  const requestBatchInsert = useWorksheetElementStore((s) => s.requestBatchInsert);
  const showPanel = useWorksheetElementStore((s) => s.showPanel);

  // 직접 만들기 탭이 활성화되면 패널 표시
  useEffect(() => {
    showPanel();
  }, [showPanel]);

  return (
    <div className="flex flex-col gap-5 py-2">
      {/* 예제 — 클릭하면 바로 적용 */}
      <div>
        <p className="text-13-bold text-black-60 px-1 pb-2 mb-2 border-b border-black-15">
          예제 템플릿
        </p>
        <p className="text-12-regular text-black-40 px-1 mb-2">
          클릭하면 학습지에 바로 적용돼요
        </p>
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="w-full px-4 py-3 rounded-xl text-left text-14-semibold bg-primary-50 text-primary border border-primary-200 hover:bg-primary-100 active:bg-primary-100 active:scale-[0.98] transition"
              onClick={() => requestBatchInsert(ex.data)}
            >
              📋 {ex.label}
            </button>
          ))}
        </div>
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
