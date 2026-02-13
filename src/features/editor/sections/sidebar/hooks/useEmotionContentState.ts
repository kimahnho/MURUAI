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
