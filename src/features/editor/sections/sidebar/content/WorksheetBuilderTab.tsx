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
  badge?: "text" | "new";
}

const PALETTE_SECTIONS: { title: string; items: PaletteItem[] }[] = [
  {
    title: "기본 컴포넌트",
    items: [
      { type: "header_instruction", icon: "📝", name: "지시문", desc: "제목 + 활동 안내", badge: "text" },
      { type: "reward_tracker", icon: "⭐", name: "보상 트래커", desc: "스티커/별 칸", badge: "text" },
      { type: "info_guide", icon: "💬", name: "안내 가이드", desc: "캐릭터 + 설명" },
    ],
  },
  {
    title: "조음 · 음운",
    items: [
      { type: "arrow_transform", icon: "🔄", name: "변환 쌍", desc: "간→갈 발음 변화", badge: "text" },
      { type: "sequential_repeat", icon: "🔁", name: "반복 연습", desc: "바바바 교대운동", badge: "text" },
      { type: "selection_sentence", icon: "✋", name: "문장 선택", desc: "[A / B] 골라 읽기", badge: "text" },
      { type: "grid_NxM", icon: "⊞", name: "그리드", desc: "단어카드/이미지 배열" },
    ],
  },
  {
    title: "어휘 · 읽기 · 한글",
    items: [
      { type: "outline_title", icon: "🅰️", name: "아웃라인 제목", desc: "속 빈 큰 글씨", badge: "new" },
      { type: "writing_practice", icon: "✏️", name: "쓰기 연습", desc: "음절 격자 따라쓰기", badge: "new" },
      { type: "coloring_area", icon: "🎨", name: "색칠 영역", desc: "라인아트 색칠 활동", badge: "new" },
    ],
  },
  {
    title: "기록",
    items: [
      { type: "checklist_table", icon: "📊", name: "체크리스트", desc: "어휘 목록/기록표", badge: "text" },
    ],
  },
];

const badgeCls = {
  text: "bg-success-50 text-success-700",
  new: "bg-primary-50 text-primary",
};
const badgeLabels = { text: "텍스트", new: "NEW" };

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
    <div className="flex flex-col gap-3 py-1">
      {/* 예제 3종 */}
      <div>
        <p className="text-[10px] text-black-50 uppercase tracking-widest font-bold mb-2 px-1">
          예제 템플릿
        </p>
        <div className="flex flex-col gap-1">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              className="w-full px-3 py-2 rounded-lg text-left text-12-semibold bg-primary-50 text-primary border border-primary-200 hover:bg-primary-100 transition"
              onClick={() => requestBatchInsert(ex.data)}
            >
              📋 {ex.label}
            </button>
          ))}
        </div>
      </div>

      {PALETTE_SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-[10px] text-black-50 uppercase tracking-widest font-bold mb-2 px-1">
            {section.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <button
                key={item.type}
                type="button"
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg cursor-pointer transition border border-transparent hover:bg-primary-50 hover:border-primary-200 text-left"
                onClick={() => requestInsert(item.type)}
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-12-semibold flex items-center gap-1.5 flex-wrap">
                    {item.name}
                    {item.badge && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${badgeCls[item.badge]}`}>
                        {badgeLabels[item.badge]}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-black-55 mt-0.5 truncate">{item.desc}</div>
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
