/**
 * OS 파일 탐색기에서 캔버스로 드래그 앤 드롭된 이미지 파일을 업로드하고 요소로 삽입하는 훅.
 * 로컬 프리뷰를 즉시 표시하고, 백그라운드 업로드 완료 후 Cloudinary URL로 교체한다.
 */
import { useEffect, useRef } from "react";
import type { CanvasElement } from "../model/canvasTypes";
import { useImageUploadToCloudinary } from "../sections/sidebar/hooks/useImageUploadToCloudinary";
import { useToastStore } from "../store/toastStore";
import { useUploadListStore } from "../store/useUploadListStore";
import { mp } from "@/shared/utils/mixpanel";
import { trackImageUsageEvent } from "@/shared/utils/trackEvents";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/svg+xml"];

const scaleToMax = (
  w: number,
  h: number,
  maxSize: number,
): { w: number; h: number } => {
  if (w <= maxSize && h <= maxSize) return { w, h };
  if (w >= h) {
    return { w: maxSize, h: Math.round((h / w) * maxSize) };
  }
  return { w: Math.round((w / h) * maxSize), h: maxSize };
};

export const useCanvasFileDrop = (
  onElementsChange: (elements: CanvasElement[]) => void,
  getElements: () => CanvasElement[],
) => {
  const { uploadImage } = useImageUploadToCloudinary();
  const showToast = useToastStore((s) => s.showToast);
  const triggerRefetch = useUploadListStore((s) => s.triggerRefetch);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleFileDrop = async (file: File, dropX: number, dropY: number) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      showToast("JPG, PNG, SVG 파일만 추가할 수 있어요.");
      return;
    }

    const localUrl = URL.createObjectURL(file);
    const elementId = crypto.randomUUID();

    // 로컬 파일에서 이미지 크기를 즉시 읽어 프리뷰 요소를 삽입한다.
    const img = new Image();
    img.onload = () => {
      const { w, h } = scaleToMax(img.naturalWidth, img.naturalHeight, 300);
      const previewElement: CanvasElement = {
        id: elementId,
        type: "rect",
        x: Math.round(dropX - w / 2),
        y: Math.round(dropY - h / 2),
        w,
        h,
        fill: `url(${localUrl})`,
        imageBox: { x: 0, y: 0, w, h },
        isStandaloneImage: true,
      };
      onElementsChange([...getElements(), previewElement]);
    };
    img.onerror = () => {
      // 크기 판별 실패 시 기본 200×200으로 프리뷰 삽입
      const DEFAULT_SIZE = 200;
      const previewElement: CanvasElement = {
        id: elementId,
        type: "rect",
        x: Math.round(dropX - DEFAULT_SIZE / 2),
        y: Math.round(dropY - DEFAULT_SIZE / 2),
        w: DEFAULT_SIZE,
        h: DEFAULT_SIZE,
        fill: `url(${localUrl})`,
        imageBox: { x: 0, y: 0, w: DEFAULT_SIZE, h: DEFAULT_SIZE },
        isStandaloneImage: true,
      };
      onElementsChange([...getElements(), previewElement]);
    };
    img.src = localUrl;

    // 백그라운드 업로드 → 완료 후 로컬 URL을 Cloudinary URL로 교체
    const cloudinaryUrl = await uploadImage(file);
    URL.revokeObjectURL(localUrl);

    // 언마운트 후 비동기 완료 시 state 업데이트를 방지한다.
    if (!mountedRef.current) return;

    if (!cloudinaryUrl) {
      // 업로드 실패 시 프리뷰 요소 제거
      const current = getElements();
      onElementsChange(current.filter((el) => el.id !== elementId));
      return;
    }

    triggerRefetch();
    mp.track("이미지 파일 드롭");
    void trackImageUsageEvent(cloudinaryUrl, "upload");

    // 요소가 아직 존재하면 fill을 Cloudinary URL로 교체
    const current = getElements();
    const target = current.find((el) => el.id === elementId);
    if (target) {
      onElementsChange(
        current.map((el) =>
          el.id === elementId
            ? { ...el, fill: `url(${cloudinaryUrl})` }
            : el,
        ),
      );
    }
  };

  return { handleFileDrop };
};
