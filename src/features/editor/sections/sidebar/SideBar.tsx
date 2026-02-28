/**
 * 에디터 좌측 사이드바의 메뉴 전환과 패널 콘텐츠를 렌더링하는 컴포넌트.
 */
import {
  PenTool,
  FileText,
  Layout,
  Smile,
  Box,
  Image,
  Type,
  Upload,
  Grid2X2Icon,
} from "lucide-react";
import type { ComponentType } from "react";
import UploadContent from "./content/UploadContent";
import AACContent from "./content/AACContent";
import EmotionContent from "./content/EmotionContent";
import ElementContent from "./content/ElementContent";
import ImageLibraryContent from "./content/ImageLibraryContent";
import TextContent from "./content/TextContent";
import FontContent from "./content/FontContent";
import TemplateContent from "./content/TemplateContent";
import DesignContent from "./content/DesignContent";
import PageContent from "./content/PageContent";
import TableContent from "./content/TableContent";
import { useSideBarStore, type SideBarMenu } from "@/features/editor/store/sideBarStore";

type MenuItemId = Exclude<SideBarMenu, null | "font">;

const MENU_LABELS: Record<Exclude<SideBarMenu, null>, string> = {
  design: "AI 이미지",
  page: "페이지",
  template: "템플릿",
  emotion: "감정",
  element: "요소",
  image: "이미지",
  text: "텍스트",
  font: "글꼴",
  upload: "업로드",
  aac: "AAC",
  table: "표",
};

const MENU_ITEMS: Array<{ id: MenuItemId; icon: typeof PenTool }> = [
  { id: "design", icon: PenTool },
  { id: "page", icon: FileText },
  { id: "template", icon: Layout },
  { id: "emotion", icon: Smile },
  { id: "element", icon: Box },
  { id: "image", icon: Image },
  { id: "text", icon: Type },
  { id: "upload", icon: Upload },
  { id: "aac", icon: Grid2X2Icon },
];

// 메뉴 id와 콘텐츠 컴포넌트를 1:1 매핑해 토글 로직을 단순화하고, 메뉴 확장 시 분기 누락을 줄인다.
const CONTENT_COMPONENTS: Record<
  Exclude<SideBarMenu, null>,
  ComponentType
> = {
  design: DesignContent,
  page: PageContent,
  template: TemplateContent,
  emotion: EmotionContent,
  element: ElementContent,
  image: ImageLibraryContent,
  text: TextContent,
  font: FontContent,
  upload: UploadContent,
  aac: AACContent,
  table: TableContent,
};

const SideBar = () => {
  const selectedMenu = useSideBarStore((state) => state.selectedMenu);
  const toggleMenu = useSideBarStore((state) => state.toggleMenu);
  const activeTitle = selectedMenu ? MENU_LABELS[selectedMenu] : "";
  const ActiveContent = selectedMenu ? CONTENT_COMPONENTS[selectedMenu] : null;

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
                  ? "bg-[#5500ff]/20"
                  : "hover:bg-black-10"
              }`}
            >
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
