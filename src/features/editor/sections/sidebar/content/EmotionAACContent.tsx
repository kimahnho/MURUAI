/**
 * 감정 이미지와 AAC 카드를 탭으로 전환해 제공하는 통합 패널 컴포넌트.
 */
import { useState, useEffect } from "react";
import EmotionContent from "./EmotionContent";
import AACContent from "./AACContent";
import AacPropsContent from "./AacPropsContent";
import { useElementPanelStore, type AacPanelData } from "@/features/editor/store/elementPanelStore";

type Tab = "emotion" | "aac";

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
      {/* 감정 / AAC 탭 전환 */}
      <div className="flex shrink-0 gap-0 mb-3 border-b border-black-25">
        <button
          type="button"
          onClick={() => { setActiveTab("emotion"); }}
          className={`flex-1 py-2 text-14-semibold transition-all border-b-2 ${
            activeTab === "emotion"
              ? "border-primary text-primary"
              : "border-transparent text-black-50 hover:text-black-90"
          }`}
        >
          감정
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab("aac"); }}
          className={`flex-1 py-2 text-14-semibold transition-all border-b-2 ${
            activeTab === "aac"
              ? "border-primary text-primary"
              : "border-transparent text-black-50 hover:text-black-90"
          }`}
        >
          AAC
        </button>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        {activeTab === "emotion" ? (
          <EmotionContent />
        ) : (
          <div className="flex flex-col gap-4">
            {/* 이미지가 삽입된 카드 선택 시 카드 설정 + 이미지 목록을 함께 표시 */}
            {aacHasImage && (
              <>
                <AacPropsContent />
                <div className="border-t border-black-25" />
              </>
            )}
            <AACContent />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmotionAACContent;
