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

    // 드롭 시점의 elements를 캡처 — 업로드 중 페이지 전환해도 드롭한 페이지에 삽입
    const elementsAtDrop = getElements();

    showToast("이미지를 업로드하고 있어요...", "primary");

    // 1. Cloudinary 업로드 완료까지 대기
    const cloudinaryUrl = await uploadImage(file);
    if (!mountedRef.current) return;

    if (!cloudinaryUrl) {
      showToast("이미지 업로드에 실패했어요.");
      return;
    }

    // 2. 로컬 이미지에서 원본 크기 읽기
    const localUrl = URL.createObjectURL(file);
    const img = new Image();

    const insertElement = (w: number, h: number) => {
      URL.revokeObjectURL(localUrl);
      if (!mountedRef.current) return;

      const elementId = crypto.randomUUID();
      const newElement: CanvasElement = {
        id: elementId,
        type: "rect",
        x: Math.round(dropX - w / 2),
        y: Math.round(dropY - h / 2),
        w,
        h,
        fill: `url(${cloudinaryUrl})`,
        imageBox: { x: 0, y: 0, w, h },
        isStandaloneImage: true,
      };
      // 드롭 시점 elements 기반으로 삽입 (현재 페이지가 바뀌어도 원래 페이지에 삽입)
      onElementsChange([...elementsAtDrop, newElement]);

      triggerRefetch();
      mp.track("이미지 파일 드롭");
      void trackImageUsageEvent(cloudinaryUrl, "upload");
    };

    img.onload = () => {
      const { w, h } = scaleToMax(img.naturalWidth, img.naturalHeight, 300);
      insertElement(w, h);
    };
    img.onerror = () => insertElement(200, 200);
    img.src = localUrl;
  };

  return { handleFileDrop };
};
