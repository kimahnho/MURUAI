/**
 * 감정 이미지, AAC 카드, 이미지 라이브러리를 탭으로 전환해 제공하는 통합 패널 컴포넌트.
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus } from "lucide-react";
import EmotionContent from "./EmotionContent";
import AACContent from "./AACContent";
import AacPropsContent from "./AacPropsContent";
import ImageLibraryContent from "./ImageLibraryContent";
import { useElementPanelStore, type AacPanelData } from "@/features/editor/store/elementPanelStore";
import { useToastStore } from "@/features/editor/store/toastStore";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";

type Tab = "emotion" | "aac" | "image";

const TAB_ITEMS: Array<{ id: Tab; label: string }> = [
  { id: "emotion", label: "감정" },
  { id: "aac", label: "AAC" },
  { id: "image", label: "이미지 상징" },
];

const EmotionAACContent = () => {
  const [activeTab, setActiveTab] = useState<Tab>("emotion");
  const panelData = useElementPanelStore((s) => s.panelData);
  const isAacSelected = panelData?.type === "aac";
  const aacHasImage = isAacSelected && (panelData as AacPanelData).hasImage;
  const userId = useAuthStore((s) => s.user?.id);
  const showToast = useToastStore((s) => s.showToast);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestKeyword, setRequestKeyword] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  // AAC 카드 선택 시 AAC 탭으로 자동 전환
  useEffect(() => {
    if (isAacSelected) setActiveTab("aac");
  }, [isAacSelected]);

  const handleImageRequest = async () => {
    const keyword = requestKeyword.trim();
    if (!userId || !keyword) return;
    setIsRequesting(true);
    const { error } = await supabase
      .from("image_request")
      .insert({ user_id: userId, keyword });
    setIsRequesting(false);
    if (error) {
      showToast("요청에 실패했어요. 다시 시도해주세요.");
      return;
    }
    showToast("이미지 요청이 접수되었어요");
    setRequestKeyword("");
    setIsModalOpen(false);
  };

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

      {/* 이미지 요청 모달 */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-80 rounded-2xl bg-white-100 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-16-semibold text-black-90 mb-1">
                이미지 요청
              </h3>
              <p className="text-13-regular text-black-50 mb-4">
                필요한 이미지 이름을 입력해주세요.
              </p>
              <input
                type="text"
                value={requestKeyword}
                onChange={(e) => setRequestKeyword(e.target.value)}
                placeholder="예: 거위, 소방차"
                className="w-full rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-90 outline-none focus:border-primary mb-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && requestKeyword.trim()) {
                    handleImageRequest();
                  }
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setRequestKeyword("");
                  }}
                  className="rounded-lg px-4 py-2 text-13-semibold text-black-60 transition hover:bg-black-5"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleImageRequest}
                  disabled={!requestKeyword.trim() || isRequesting}
                  className="rounded-lg bg-primary px-4 py-2 text-13-semibold text-white-100 transition hover:opacity-90 disabled:opacity-50"
                >
                  {isRequesting ? "요청 중..." : "요청하기"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default EmotionAACContent;
