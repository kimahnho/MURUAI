/**
 * 에디터 좌측 사이드바의 메뉴 전환과 패널 콘텐츠를 렌더링하는 컴포넌트.
 */
import {
  PenTool,
  FileText,
  Layout,
  Sparkles,
  Smile,
  Box,
  Type,
  Upload,
} from "lucide-react";
import type { ComponentType } from "react";
import UploadContent from "./content/UploadContent";
import EmotionAACContent from "./content/EmotionAACContent";
import ElementContent from "./content/ElementContent";
import TextContent from "./content/TextContent";
import FontContent from "./content/FontContent";
import TemplateContent from "./content/TemplateContent";
import AiTemplateContent from "./content/AiTemplateContent";
import DesignContent from "./content/DesignContent";
import PageContent from "./content/PageContent";
import TableContent from "./content/TableContent";
import ShapePropsContent from "./content/ShapePropsContent";
import LinePropsContent from "./content/LinePropsContent";
import ArrowPropsContent from "./content/ArrowPropsContent";
import AacPropsContent from "./content/AacPropsContent";
import AacCardPropsContent from "./content/AacCardPropsContent";
import EmotionCardPropsContent from "./content/EmotionCardPropsContent";
import MultiPropsContent from "./content/MultiPropsContent";
import TextPropsContent from "./content/TextPropsContent";
import AiStoryEditContent from "./content/AiStoryEditContent";
import { useSideBarStore, type SideBarMenu } from "@/features/editor/store/sideBarStore";
import { useAiGenerationModeStore } from "@/features/editor/store/aiGenerationModeStore";

type MenuItemId = Exclude<SideBarMenu, null | "font" | "table" | "shape-props" | "line-props" | "arrow-props" | "text-props" | "aac-props" | "aacCard-props" | "emotionCard-props" | "multi-props">;

const MENU_LABELS: Record<Exclude<SideBarMenu, null>, string> = {
  design: "AI 이미지",
  page: "페이지",
  template: "템플릿",
  "ai-template": "AI 템플릿",
  "emotion-aac": "이미지",
  element: "요소",
  text: "텍스트",
  font: "글꼴",
  upload: "업로드",
  table: "표",
  "shape-props": "도형",
  "line-props": "선",
  "arrow-props": "화살표",
  "text-props": "텍스트",
  "aac-props": "AAC",
  "aacCard-props": "AAC 카드",
  "emotionCard-props": "감정카드",
  "multi-props": "다중 선택",
  "ai-story-edit": "스토리 편집",
};

const MENU_ITEMS: Array<{ id: MenuItemId; icon: typeof PenTool }> = [
  { id: "design", icon: PenTool },
  { id: "page", icon: FileText },
  { id: "template", icon: Layout },
  { id: "ai-template", icon: Sparkles },
  { id: "emotion-aac", icon: Smile },
  { id: "element", icon: Box },
  { id: "text", icon: Type },
  { id: "upload", icon: Upload },
];

// 메뉴 id와 콘텐츠 컴포넌트를 1:1 매핑해 토글 로직을 단순화하고, 메뉴 확장 시 분기 누락을 줄인다.
const CONTENT_COMPONENTS: Record<
  Exclude<SideBarMenu, null>,
  ComponentType
> = {
  design: DesignContent,
  page: PageContent,
  template: TemplateContent,
  "ai-template": AiTemplateContent,
  "emotion-aac": EmotionAACContent,
  element: ElementContent,
  text: TextContent,
  font: FontContent,
  upload: UploadContent,
  table: TableContent,
  "shape-props": ShapePropsContent,
  "line-props": LinePropsContent,
  "arrow-props": ArrowPropsContent,
  "text-props": TextPropsContent,
  "aac-props": AacPropsContent,
  "aacCard-props": AacCardPropsContent,
  "emotionCard-props": EmotionCardPropsContent,
  "multi-props": MultiPropsContent,
  "ai-story-edit": AiStoryEditContent,
};

const SideBar = () => {
  const selectedMenu = useSideBarStore((state) => state.selectedMenu);
  const toggleMenu = useSideBarStore((state) => state.toggleMenu);
  const isFocusedMode = useAiGenerationModeStore((s) => s.isActive);
  const activeTitle = selectedMenu ? MENU_LABELS[selectedMenu] : "";
  const ActiveContent = selectedMenu ? CONTENT_COMPONENTS[selectedMenu] : null;

  // 포커스 모드: 아이콘 메뉴 숨기고 패널만 전체 너비로 표시
  if (isFocusedMode && selectedMenu === "ai-story-edit") {
    return (
      <div className="flex h-full">
        <div className="flex flex-col w-120 h-full border-r border-black-25">
          <AiStoryEditContent />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 좌측 아이콘 메뉴: 편집 도구 카테고리 전환 */}
      <div className="flex flex-col w-20 h-full px-1 pt-2 border-r border-black-25 gap-2">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { toggleMenu(item.id); }}
              // 같은 아이콘을 다시 누르면 닫히고, 다른 아이콘을 누르면 즉시 패널이 교체된다.
              className={`flex flex-col rounded-xl items-center justify-center gap-1 w-full h-16 cursor-pointer transition ${
                selectedMenu === item.id
                  ? "bg-primary-200"
                  : "hover:bg-black-10"
              }`}
            >
              {item.id === "ai-template" && (
                <span className="rounded-sm bg-primary px-1 py-px text-[9px] font-bold leading-tight text-white-100 -mb-0.5">
                  NEW
                </span>
              )}
              <Icon
                className={`w-5 h-5 ${
                  selectedMenu === item.id ? "text-primary" : "text-black-60"
                }`}
              />
              <span
                className={`text-12-medium ${
                  selectedMenu === item.id ? "text-primary" : "text-black-60"
                }`}
              >
                {MENU_LABELS[item.id]}
              </span>
            </button>
          );
        })}
      </div>
      {/* 우측 상세 패널: 현재 선택된 카테고리의 실제 편집 UI */}
      {selectedMenu && (
        <div className="flex flex-col w-82 h-full px-4 py-4 border-r border-black-25 gap-2">
          <div className="text-title-20-semibold text-black-100">
            {activeTitle}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
            {ActiveContent ? <ActiveContent /> : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default SideBar;
