/**
 * 이미지 요청 모달 — 대표단어 + 이미지 디테일 2-필드 폼, 중복 방지.
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useToastStore } from "@/features/editor/store/toastStore";

interface ImageRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultKeyword?: string;
}

const ImageRequestModal = ({
  isOpen,
  onClose,
  defaultKeyword = "",
}: ImageRequestModalProps) => {
  const userId = useAuthStore((s) => s.user?.id);
  const showToast = useToastStore((s) => s.showToast);

  const [keyword, setKeyword] = useState(defaultKeyword);
  const [detail, setDetail] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  // defaultKeyword가 변경되면 동기화
  useEffect(() => {
    if (isOpen) {
      setKeyword(defaultKeyword);
      setDetail("");
    }
  }, [isOpen, defaultKeyword]);

  const handleSubmit = async () => {
    const trimmedKeyword = keyword.trim();
    const trimmedDetail = detail.trim();
    if (!userId || !trimmedKeyword || !trimmedDetail) return;

    setIsRequesting(true);

    // 중복 방지: 같은 사용자의 같은 키워드로 pending 상태 요청이 있는지 확인
    const { data: existing } = await supabase
      .from("image_request")
      .select("id")
      .eq("user_id", userId)
      .eq("keyword", trimmedKeyword)
      .eq("status", "pending")
      .limit(1);

    if (existing && existing.length > 0) {
      showToast("이미 같은 이미지를 요청했어요");
      setIsRequesting(false);
      return;
    }

    const { error } = await supabase.from("image_request").insert({
      user_id: userId,
      keyword: trimmedKeyword,
      detail: trimmedDetail,
      display_text: `${trimmedKeyword}(${trimmedDetail})`,
      status: "pending",
    });

    setIsRequesting(false);

    if (error) {
      showToast("요청에 실패했어요. 다시 시도해주세요.");
      return;
    }

    showToast("이미지 요청이 접수되었어요!");
    setKeyword("");
    setDetail("");
    onClose();
  };

  if (!isOpen) return null;

  const isValid = keyword.trim().length > 0 && detail.trim().length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-96 rounded-2xl bg-white-100 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-title-18-semibold text-black-90 mb-1">
          이미지 요청
        </h3>
        <p className="text-13-regular text-black-50 mb-5">
          필요한 이미지를 설명해주세요.
        </p>

        {/* 대표단어 */}
        <label className="text-13-semibold text-black-80 mb-1.5 block">
          대표단어 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="예: 소방차, 거위"
          className="w-full rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-90 outline-none focus:border-primary mb-4"
          autoFocus
        />

        {/* 이미지 디테일 */}
        <label className="text-13-semibold text-black-80 mb-1.5 block">
          이미지 디테일 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="어떤 이미지가 필요한지 설명해주세요"
          rows={3}
          className="w-full rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-90 outline-none focus:border-primary mb-5 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && isValid) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setDetail("");
              onClose();
            }}
            className="rounded-lg px-4 py-2 text-13-semibold text-black-60 transition hover:bg-black-5"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isRequesting}
            className="rounded-lg bg-primary px-4 py-2 text-13-semibold text-white-100 transition hover:opacity-90 disabled:opacity-50"
          >
            {isRequesting ? "요청 중..." : "요청하기"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ImageRequestModal;
