/** 왼쪽 컴포넌트 팔레트 — 클릭으로 컴포넌트 추가 */
import type { WorksheetComponentType } from "../model/types";
import { useWorksheetStore } from "../store/worksheetStore";

interface PaletteItem {
  type: WorksheetComponentType;
  icon: string;
  iconBg: string;
  name: string;
  desc: string;
  badge?: "text" | "image" | "new";
}

const PALETTE_SECTIONS: { title: string; items: PaletteItem[] }[] = [
  {
    title: "기본 컴포넌트",
    items: [
      { type: "header_instruction", icon: "📝", iconBg: "bg-blue-50", name: "제목", desc: "제목 + 활동 안내", badge: "text" },
      { type: "reward_tracker", icon: "⭐", iconBg: "bg-yellow-50", name: "칭찬 스탬프", desc: "스티커/별 칸", badge: "text" },
      { type: "info_guide", icon: "💬", iconBg: "bg-gray-100", name: "안내 가이드", desc: "캐릭터 + 설명" },
    ],
  },
  {
    title: "조음 · 음운",
    items: [
      { type: "arrow_transform", icon: "🔄", iconBg: "bg-orange-50", name: "변환 쌍", desc: "간→갈 발음 변화", badge: "text" },

      { type: "selection_sentence", icon: "✋", iconBg: "bg-pink-50", name: "문장 선택", desc: "[A / B] 골라 읽기", badge: "text" },
      { type: "grid_NxM", icon: "⊞", iconBg: "bg-purple-50", name: "단어 카드", desc: "이미지+텍스트 카드 배열" },
    ],
  },
  {
    title: "어휘 · 읽기 · 한글",
    items: [
      { type: "outline_title", icon: "🅰️", iconBg: "bg-indigo-50", name: "글자 색칠하기", desc: "속 빈 큰 글씨 + 색칠", badge: "new" },
      { type: "writing_practice", icon: "✏️", iconBg: "bg-lime-50", name: "쓰기 칸 노트", desc: "음절 격자 따라쓰기", badge: "new" },
      { type: "coloring_area", icon: "🎨", iconBg: "bg-rose-50", name: "색칠공부", desc: "이미지 삽입 색칠 활동", badge: "new" },
    ],
  },
  {
    title: "사고 · 연상",
    items: [
      { type: "mind_map", icon: "🧠", iconBg: "bg-violet-50", name: "마인드맵", desc: "중심어 연상 방사형 구조", badge: "new" },
    ],
  },
  {
    title: "기록",
    items: [
      { type: "checklist_table", icon: "📊", iconBg: "bg-teal-50", name: "체크리스트", desc: "어휘 목록/기록표", badge: "text" },
    ],
  },
];

const badgeStyles = {
  text: "bg-green-50 text-green-700",
  image: "bg-orange-50 text-orange-700",
  new: "bg-blue-50 text-blue-700",
};
const badgeLabels = { text: "텍스트", image: "이미지", new: "NEW" };

const Palette = () => {
  const addComponent = useWorksheetStore((s) => s.addComponent);

  return (
    <div className="w-[230px] bg-white-100 border-r border-black-25 p-4 overflow-y-auto shrink-0">
      {PALETTE_SECTIONS.map((section) => (
        <div key={section.title}>
          <h3 className="text-[10px] text-black-50 uppercase tracking-widest font-bold mb-2.5 mt-3.5 first:mt-0">
            {section.title}
          </h3>
          {section.items.map((item) => (
            <button
              key={item.type}
              type="button"
              className="flex items-center gap-2.5 w-full p-2 rounded-lg cursor-pointer transition border-[1.5px] border-transparent hover:bg-primary-50 hover:border-primary-200 mb-1 text-left"
              onClick={() => addComponent(item.type)}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${item.iconBg}`}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold flex items-center gap-1.5 flex-wrap">
                  {item.name}
                  {item.badge && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded font-semibold whitespace-nowrap ${badgeStyles[item.badge]}`}
                    >
                      {badgeLabels[item.badge]}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-black-55 mt-0.5">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};

export default Palette;
