type ThumbnailOptions = {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
};

export const getThumbnailUrl = (
  url: string,
  _options: ThumbnailOptions = {}
) => {
  // Cloudinary 변환 제거 — 크레딧 소모 방지. CSS object-fit으로 축소 표시.
  return url;
};
