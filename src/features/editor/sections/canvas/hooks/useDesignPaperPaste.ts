/**
 * 붙여넣기 이벤트를 해석해 요소 복제와 좌표 보정을 수행하는 훅.
 * 외부 이미지(구글 등에서 복사한 클립보드 이미지)도 붙여넣기로 삽입할 수 있다.
 */
import {
  useEffect,
  useRef,
  type MutableRefObject,
  type RefObject,
} from "react";
import { mp } from "@/shared/utils/mixpanel";
import { trackImageUsageEvent } from "@/shared/utils/trackEvents";
import type { CanvasElement, TextElement } from "../../../model/canvasTypes";
import { measureTextBoxSize } from "../../../utils/textMeasure";
import {
  DEFAULT_TEXT_LINE_HEIGHT,
  isEditableTarget,
} from "../../../utils/designPaperUtils";
import { useImageUploadToCloudinary } from "../../../sections/sidebar/hooks/useImageUploadToCloudinary";
import { useUploadListStore } from "../../../store/useUploadListStore";
import { useToastStore } from "../../../store/toastStore";
import { CLIPBOARD_MARKER } from "./useDesignPaperClipboard";

const DEFAULT_TEXT_FONT_SIZE = 14;
const PASTE_TEXT_WIDTH = 400;
const IMAGE_PASTE_ACCEPTED = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

type UseDesignPaperPasteProps = {
  readOnly: boolean;
  elements: CanvasElement[];
  onElementsChange?: (elements: CanvasElement[]) => void;
  selectedIdsRef: MutableRefObject<string[]>;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  lastPointerRef: MutableRefObject<{ x: number; y: number } | null>;
  pasteElements: (position?: { x: number; y: number }) => void;
};

const scaleToMax = (
  w: number,
  h: number,
  maxSize: number,
): { w: number; h: number } => {
  if (w <= maxSize && h <= maxSize) return { w, h };
  if (w >= h) return { w: maxSize, h: Math.round((h / w) * maxSize) };
  return { w: Math.round((w / h) * maxSize), h: maxSize };
};

export const useDesignPaperPaste = ({
  readOnly,
  elements,
  onElementsChange,
  selectedIdsRef,
  onSelectedIdsChange,
  onEditingTextIdChange,
  containerRef,
  lastPointerRef,
  pasteElements,
}: UseDesignPaperPasteProps) => {
  const { uploadImage } = useImageUploadToCloudinary();
  const triggerRefetch = useUploadListStore((s) => s.triggerRefetch);
  const showToast = useToastStore((s) => s.showToast);
  const mountedRef = useRef(true);
  // 비동기 업로드 완료 시 최신 elements를 참조하기 위한 ref
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (readOnly || !onElementsChange) return;

    // 클립보드 이미지(blob)를 캔버스에 삽입하고 Cloudinary에 업로드한다.
    const handleImagePaste = (file: File) => {
      const localUrl = URL.createObjectURL(file);
      const elementId = crypto.randomUUID();

      const container = containerRef.current;
      const basePoint = lastPointerRef.current;
      const centerX = basePoint?.x ?? (container?.offsetWidth ?? 800) / 2;
      const centerY = basePoint?.y ?? (container?.offsetHeight ?? 600) / 2;

      const img = new Image();
      img.onload = () => {
        const { w, h } = scaleToMax(img.naturalWidth, img.naturalHeight, 300);
        const previewElement: CanvasElement = {
          id: elementId,
          type: "rect",
          x: Math.round(centerX - w / 2),
          y: Math.round(centerY - h / 2),
          w,
          h,
          fill: `url(${localUrl})`,
          imageBox: { x: 0, y: 0, w, h },
          isStandaloneImage: true,
        };
        onElementsChange([...elementsRef.current, previewElement]);
        selectedIdsRef.current = [elementId];
        onSelectedIdsChange?.([elementId]);
        onEditingTextIdChange?.(null);
        mp.track("이미지 붙여넣기", { source: "clipboard" });
      };
      img.onerror = () => {
        const DEFAULT_SIZE = 200;
        const previewElement: CanvasElement = {
          id: elementId,
          type: "rect",
          x: Math.round(centerX - DEFAULT_SIZE / 2),
          y: Math.round(centerY - DEFAULT_SIZE / 2),
          w: DEFAULT_SIZE,
          h: DEFAULT_SIZE,
          fill: `url(${localUrl})`,
          imageBox: { x: 0, y: 0, w: DEFAULT_SIZE, h: DEFAULT_SIZE },
          isStandaloneImage: true,
        };
        onElementsChange([...elementsRef.current, previewElement]);
        selectedIdsRef.current = [elementId];
        onSelectedIdsChange?.([elementId]);
      };
      img.src = localUrl;

      // 백그라운드 업로드 → 완료 후 로컬 URL을 Cloudinary URL로 교체
      void (async () => {
        const cloudinaryUrl = await uploadImage(file);

        if (!mountedRef.current) {
          URL.revokeObjectURL(localUrl);
          return;
        }

        if (!cloudinaryUrl) {
          // 업로드 실패 시 로컬 프리뷰 유지 (blob URL revoke 안 함)
          // blob URL은 탭이 닫힐 때 자동 해제됨
          showToast("이미지 업로드에 실패했어요. 저장하려면 파일로 업로드해 주세요.");
          return;
        }

        triggerRefetch();
        void trackImageUsageEvent(cloudinaryUrl, "clipboard-paste");

        // React 렌더링 보장을 위해 requestAnimationFrame 후 URL 교체
        requestAnimationFrame(() => {
          if (!mountedRef.current) {
            URL.revokeObjectURL(localUrl);
            return;
          }
          const current = elementsRef.current;
          if (current.some((el) => el.id === elementId)) {
            onElementsChange(
              current.map((el) =>
                el.id === elementId
                  ? { ...el, fill: `url(${cloudinaryUrl})` }
                  : el,
              ),
            );
          }
          // Cloudinary URL로 교체 완료 후 blob URL 해제
          setTimeout(() => URL.revokeObjectURL(localUrl), 500);
        });
      })();
    };

    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const rawText = event.clipboardData?.getData("text/plain") ?? "";

      // 앱 내부 요소 복사 마커 → 요소 붙여넣기
      if (rawText === CLIPBOARD_MARKER) {
        event.preventDefault();
        pasteElements();
        return;
      }

      // 클립보드 이미지 감지 (구글 등 외부 이미지 복사 지원)
      const items = event.clipboardData?.items;
      if (items) {
        for (const item of items) {
          if (IMAGE_PASTE_ACCEPTED.includes(item.type)) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              handleImagePaste(file);
              return;
            }
          }
        }
      }

      if (!rawText.trim()) {
        return;
      }

      event.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const basePoint = lastPointerRef.current;
      const centerX = basePoint?.x ?? container.offsetWidth / 2;
      const centerY = basePoint?.y ?? container.offsetHeight / 2;

      // 포인터 위치가 있으면 해당 지점, 없으면 캔버스 중앙에 텍스트를 생성한다.
      const { height } = measureTextBoxSize(
        rawText,
        DEFAULT_TEXT_FONT_SIZE,
        "normal",
        {
          lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
          maxWidth: PASTE_TEXT_WIDTH,
        }
      );
      const x = centerX - PASTE_TEXT_WIDTH / 2;
      const y = centerY - Math.max(height, 1) / 2;

      const newTextElement: Omit<TextElement, "id"> = {
        type: "text",
        text: rawText,
        richText: undefined,
        x,
        y,
        w: PASTE_TEXT_WIDTH,
        h: Math.max(height, 1),
        widthMode: "fixed",
        style: {
          fontSize: DEFAULT_TEXT_FONT_SIZE,
          fontWeight: "normal",
          color: "#000000",
          underline: false,
          alignX: "center",
          alignY: "middle",
          lineHeight: DEFAULT_TEXT_LINE_HEIGHT,
          letterSpacing: 0,
        },
        locked: false,
        visible: true,
      };

      const newId = crypto.randomUUID();
      const newElement: TextElement = { ...newTextElement, id: newId };

      onElementsChange([...elements, newElement]);
      mp.track("요소 붙여넣기", { element_count: 1 });
      selectedIdsRef.current = [newId];
      onSelectedIdsChange?.([newId]);
      onEditingTextIdChange?.(null);
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [
    readOnly,
    onElementsChange,
    elements,
    onSelectedIdsChange,
    onEditingTextIdChange,
    containerRef,
    lastPointerRef,
    selectedIdsRef,
    pasteElements,
    uploadImage,
    triggerRefetch,
    showToast,
  ]);
};
