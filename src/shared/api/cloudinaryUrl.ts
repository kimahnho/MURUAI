/**
 * Cloudinary 이미지 URL 빌더.
 * 상대 경로를 받으면 WebP 버전(_webp.webp)의 full URL을 생성한다.
 * 이미 full URL이면 그대로 반환한다.
 */

const CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;

const UPLOAD_BASE = CLOUD_NAME
  ? `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/`
  : "";

/**
 * DB에 저장된 상대 경로(image_path)를 WebP full URL로 변환한다.
 *
 * - 상대 경로: `folder/uuid.png` → `https://.../folder/uuid_webp.webp`
 * - full URL: 그대로 반환 (이미 canvas_data에서 교체 완료)
 * - SVG, data:, 로컬 경로: 변환 없이 반환
 */
export const getCloudinaryImageUrl = (path: string): string => {
  if (!path) return path;

  const trimmed = path.trim();

  // data: URI, 로컬 경로 — 변환 불필요
  if (trimmed.startsWith("data:")) return trimmed;
  if (trimmed.startsWith("/")) return trimmed;

  // 이미 full URL — 그대로 반환
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // SVG — WebP 변환 제외
  if (trimmed.endsWith(".svg")) {
    return UPLOAD_BASE ? `${UPLOAD_BASE}${trimmed}` : trimmed;
  }

  if (!UPLOAD_BASE) return trimmed;

  // 상대 경로 → full URL 생성 (확장자 그대로 유지)
  // 마이그레이션된 파일은 DB에서 이미 _webp.webp URL로 교체 완료
  // 새로 업로드된 파일은 원본 확장자 그대로 사용
  return `${UPLOAD_BASE}${trimmed}`;
};
