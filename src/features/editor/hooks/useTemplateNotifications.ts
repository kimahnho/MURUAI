/**
 * 템플릿 적용 결과를 사용자 토스트 메시지로 안내하는 훅.
 */
import { useCallback } from "react";
import { useToastStore } from "../store/toastStore";

export const useTemplateNotifications = () => {
  const showToast = useToastStore((state) => state.showToast);

  const showEmotionInferenceToast = useCallback(() => {
    showToast("자료 제작을 위한 기본세트 페이지 3장이 적용되었습니다.", "success");
  }, [showToast]);

  return { showEmotionInferenceToast };
};
