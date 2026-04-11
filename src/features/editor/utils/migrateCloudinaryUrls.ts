/**
 * 문서 로드 시 canvas_data 내 비WebP Cloudinary URL을 WebP URL로 자동 교체.
 * migrateLogoFill과 동일 패턴 — pages 배열을 in-place 수정, boolean 반환.
 */
import type { CanvasElement } from "../model/canvasTypes";

const CLOUDINARY_HOST = "res.cloudinary.com";

/** WebP 변환이 필요한 Cloudinary URL인지 판별 */
const needsWebpMigration = (url: string): boolean => {
  if (!url.includes(CLOUDINARY_HOST)) return false;
  if (url.includes("/raw/upload/")) return false;
  if (url.endsWith(".svg")) return false;
  if (url.includes("_webp.webp")) return false;
  if (url.endsWith(".webp")) return false;
  return true;
};

/** Cloudinary URL을 _webp.webp 버전으로 변환 */
const toWebpUrl = (url: string): string => {
  // https://res.cloudinary.com/cloud/image/upload/[v123/][transforms/]folder/name.ext
  // → https://res.cloudinary.com/cloud/image/upload/folder/name_webp.webp

  const uploadIdx = url.indexOf("/image/upload/");
  if (uploadIdx < 0) return url;

  const prefix = url.substring(0, uploadIdx + "/image/upload/".length);
  let path = url.substring(uploadIdx + "/image/upload/".length);

  // 버전 세그먼트 제거 (v12345/)
  path = path.replace(/^v\d+\//, "");
  // 변환 파라미터 제거 (f_auto,q_auto/)
  path = path.replace(/^[a-z]_[^/]+\//, "");

  // 확장자 제거 후 _webp.webp 추가
  const base = path.replace(/\.\w+$/, "");
  return `${prefix}${base}_webp.webp`;
};

/**
 * canvas_data pages 내 비WebP Cloudinary URL을 WebP로 교체.
 * @returns 변환이 발생했으면 true
 */
export const migrateCloudinaryToWebp = (
  pages: Array<{
    elements: CanvasElement[];
    background?: { type: string; imageUrl?: string };
  }>,
): boolean => {
  let migrated = false;

  for (const page of pages) {
    // 페이지 배경 이미지
    if (
      page.background &&
      page.background.type === "image" &&
      page.background.imageUrl &&
      needsWebpMigration(page.background.imageUrl)
    ) {
      page.background = {
        ...page.background,
        imageUrl: toWebpUrl(page.background.imageUrl),
      };
      migrated = true;
    }

    // 요소 fill URL
    for (let i = 0; i < page.elements.length; i++) {
      const el = page.elements[i];
      if (
        "fill" in el &&
        typeof el.fill === "string" &&
        el.fill.startsWith("url(") &&
        el.fill.length > 5
      ) {
        const innerUrl = el.fill.slice(4, -1);
        if (needsWebpMigration(innerUrl)) {
          page.elements[i] = {
            ...el,
            fill: `url(${toWebpUrl(innerUrl)})`,
          } as CanvasElement;
          migrated = true;
        }
      }
    }
  }

  return migrated;
};
