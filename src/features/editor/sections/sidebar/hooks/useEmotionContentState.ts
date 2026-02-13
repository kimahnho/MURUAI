/**
 * 감정 콘텐츠 패널의 탭/필터/선택 상태를 관리하는 훅.
 */
import { useImageFillStore } from "@/features/editor/store/imageFillStore";

const EMOTION_CARD_SIZE = { width: 200, height: 260 };

export const useEmotionContentState = () => {
  const requestImageFill = useImageFillStore(
    (state) => state.requestImageFill
  );

  const onSelectEmotion = (url: string, label: string) => {
    requestImageFill(url, label, EMOTION_CARD_SIZE, { forceInsert: true, source: "emotion" });
  };

  return { onSelectEmotion };
};
