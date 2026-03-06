/**
 * 감정 이미지와 AAC 카드를 탭으로 전환해 제공하는 통합 패널 컴포넌트.
 */
import { useState } from "react";
import EmotionContent from "./EmotionContent";
import AACContent from "./AACContent";

type Tab = "emotion" | "aac";

const EmotionAACContent = () => {
  const [activeTab, setActiveTab] = useState<Tab>("emotion");

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
        {activeTab === "emotion" ? <EmotionContent /> : <AACContent />}
      </div>
    </div>
  );
};

export default EmotionAACContent;
