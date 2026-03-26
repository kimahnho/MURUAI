/**
 * 감정 이미지, AAC 카드, 이미지 라이브러리를 탭으로 전환해 제공하는 통합 패널 컴포넌트.
 */
import { useState } from "react";
import { MessageSquarePlus, Search } from "lucide-react";

import {
  useElementPanelStore,
  type AacPanelData,
} from "@/features/editor/store/elementPanelStore";
import { useAuthStore } from "@/shared/store/useAuthStore";

import EmotionContent from "./EmotionContent";
import AACContent from "./AACContent";
import AacPropsContent from "./AacPropsContent";
import ImageLibraryContent from "./ImageLibraryContent";
import AllImagesContent from "./AllImagesContent";
import ImageRequestModal from "./ImageRequestModal";

type Tab = "all" | "emotion" | "aac" | "image";

const TAB_ITEMS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "전체" },
  { id: "emotion", label: "감정" },
  { id: "aac", label: "AAC" },
  { id: "image", label: "이미지" },
];

const EmotionAACContent = () => {
  const panelData = useElementPanelStore((s) => s.panelData);
  const isAacSelected = panelData?.type === "aac";
  const aacHasImage = isAacSelected && (panelData as AacPanelData).hasImage;
  const [activeTab, setActiveTab] = useState<Tab>(isAacSelected ? "aac" : "all");
  const [prevAacSelected, setPrevAacSelected] = useState(isAacSelected);
  if (isAacSelected !== prevAacSelected) {
    setPrevAacSelected(isAacSelected);
    if (isAacSelected) setActiveTab("aac");
  }
  const userId = useAuthStore((s) => s.user?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-full">
      {/* 이미지 요청 안내 */}
      {userId && (
        <div className="flex items-center justify-between shrink-0 rounded-lg bg-indigo-50 px-3 py-2 mb-3">
          <span className="text-12-regular text-indigo-600">
            원하는 이미지가 없나요?
          </span>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1 text-12-semibold text-white-100 transition hover:bg-indigo-600"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            요청하기
          </button>
        </div>
      )}

      {/* 통합 검색 */}
      <div className="relative shrink-0 mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 icon-xs text-black-50" />
        <input
          type="text"
          placeholder="이미지 검색..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); }}
          className="w-full pl-9 pr-4 py-2.5 border border-black-25 rounded-lg text-14-regular text-black-90 placeholder:text-black-50 focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* 전체 / 감정 / AAC / 이미지 탭 전환 */}
      <div className="flex shrink-0 gap-0 mb-3 border-b border-black-25">
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
            }}
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
        {activeTab === "all" && <AllImagesContent externalSearch={searchQuery} />}
        {activeTab === "emotion" && <EmotionContent externalSearch={searchQuery} />}
        {activeTab === "aac" && (
          <div className="flex flex-col gap-4">
            {aacHasImage && (
              <>
                <AacPropsContent />
                <div className="border-t border-black-25" />
              </>
            )}
            <AACContent externalSearch={searchQuery} />
          </div>
        )}
        {activeTab === "image" && <ImageLibraryContent externalSearch={searchQuery} />}
      </div>

      <ImageRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default EmotionAACContent;
