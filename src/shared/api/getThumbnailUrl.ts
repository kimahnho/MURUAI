type ThumbnailOptions = {
  width?: number;
  height?: number;
  quality?: string;
  format?: string;
};

export const getThumbnailUrl = (
  url: string,
  options: ThumbnailOptions = {}
) => {
  const isCloudinary =
    url.includes("res.cloudinary.com") && url.includes("/image/upload/");
  if (!isCloudinary) return url;

  const width = options.width ?? 256;
  const height = options.height ?? 256;
  // f_auto, q_auto 제거 — WebP 마이그레이션 완료로 포맷/품질 변환 불필요 (크레딧 절감)
  const transform = `w_${width},h_${height},c_fit`;

  return url.replace("/image/upload/", `/image/upload/${transform}/`);
};
