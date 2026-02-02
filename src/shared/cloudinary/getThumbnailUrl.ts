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
  const quality = options.quality ?? "auto";
  const format = options.format ?? "auto";
  const transform = `w_${width},h_${height},c_fit,q_${quality},f_${format}`;

  return url.replace("/image/upload/", `/image/upload/${transform}/`);
};
