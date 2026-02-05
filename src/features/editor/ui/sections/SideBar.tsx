import {
  PenTool,
  Layout,
  Smile,
  Box,
  Image,
  Type,
  Upload,
  Grid2X2Icon,
} from "lucide-react";
import type { ComponentType } from "react";
import UploadContent from "../parts/detail_content/UploadContent";
import AACContent from "../parts/detail_content/AACContent";
import EmotionContent from "../parts/detail_content/EmotionContent";
import ElementContent from "../parts/detail_content/ElementContent";
import ImageLibraryContent from "../parts/detail_content/ImageLibraryContent";
import TextContent from "../parts/detail_content/TextContent";
import FontContent from "../parts/detail_content/FontContent";
import TemplateContent from "../parts/detail_content/TemplateContent";
import DesignContent from "../parts/detail_content/DesignContent";
import { useSideBarStore, type SideBarMenu } from "../../store/sideBarStore";

type MenuItemId = Exclude<SideBarMenu, null | "font">;

const MENU_LABELS: Record<Exclude<SideBarMenu, null>, string> = {
  design: "AI 이미지",
  template: "템플릿",
  emotion: "감정",
  element: "요소",
  image: "이미지",
  text: "텍스트",
  font: "글꼴",
  upload: "업로드",
  aac: "AAC",
};

const MENU_ITEMS: Array<{ id: MenuItemId; icon: typeof PenTool }> = [
  { id: "design", icon: PenTool },
  { id: "template", icon: Layout },
  { id: "emotion", icon: Smile },
  { id: "element", icon: Box },
  { id: "image", icon: Image },
  { id: "text", icon: Type },
  { id: "upload", icon: Upload },
  { id: "aac", icon: Grid2X2Icon },
];

const CONTENT_COMPONENTS: Record<
  Exclude<SideBarMenu, null>,
  ComponentType
> = {
  design: DesignContent,
  template: TemplateContent,
  emotion: EmotionContent,
  element: ElementContent,
  image: ImageLibraryContent,
  text: TextContent,
  font: FontContent,
  upload: UploadContent,
  aac: AACContent,
};

const SideBar = () => {
  const selectedMenu = useSideBarStore((state) => state.selectedMenu);
  const toggleMenu = useSideBarStore((state) => state.toggleMenu);
  const activeTitle = selectedMenu ? MENU_LABELS[selectedMenu] : "";
  const ActiveContent = selectedMenu ? CONTENT_COMPONENTS[selectedMenu] : null;

  return (
    <div className="flex h-full">
      {/* 아이콘 바 */}
      <div className="flex flex-col w-20 h-full px-1 pt-2 border-r border-black-25 gap-2">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => { toggleMenu(item.id); }}
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
      {/* 상세 옵션 바 */}
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
