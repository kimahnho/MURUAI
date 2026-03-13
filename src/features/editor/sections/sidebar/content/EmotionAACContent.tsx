/**
 * 감정 이미지, AAC 카드, 이미지 라이브러리를 탭으로 전환해 제공하는 통합 패널 컴포넌트.
 */
import { useState, useEffect } from "react";
import EmotionContent from "./EmotionContent";
import AACContent from "./AACContent";
import AacPropsContent from "./AacPropsContent";
import ImageLibraryContent from "./ImageLibraryContent";
import { useElementPanelStore, type AacPanelData } from "@/features/editor/store/elementPanelStore";

type Tab = "emotion" | "aac" | "image";

const TAB_ITEMS: Array<{ id: Tab; label: string }> = [
  { id: "emotion", label: "감정" },
  { id: "aac", label: "AAC" },
  { id: "image", label: "이미지" },
];

const EmotionAACContent = () => {
  const [activeTab, setActiveTab] = useState<Tab>("emotion");
  const panelData = useElementPanelStore((s) => s.panelData);
  const isAacSelected = panelData?.type === "aac";
  // 이미지가 삽입된 카드를 선택한 경우에만 카드 설정을 표시한다.
  const aacHasImage = isAacSelected && (panelData as AacPanelData).hasImage;

  // AAC 카드 선택 시 AAC 탭으로 자동 전환
  useEffect(() => {
    if (isAacSelected) setActiveTab("aac");
  }, [isAacSelected]);

  return (
    <div className="flex flex-col h-full">
      {/* 감정 / AAC / 이미지 탭 전환 */}
      <div className="flex shrink-0 gap-0 mb-3 border-b border-black-25">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); }}
            className={`flex-1 py-2 text-14-semibold transition-all border-b-2 ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-black-50 hover:text-black-90"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {activeTab === "emotion" && <EmotionContent />}
        {activeTab === "aac" && (
          <div className="flex flex-col gap-4">
            {aacHasImage && (
              <>
                <AacPropsContent />
                <div className="border-t border-black-25" />
              </>
            )}
            <AACContent />
          </div>
        )}
        {activeTab === "image" && <ImageLibraryContent />}
      </div>
    </div>
  );
};

export default EmotionAACContent;
