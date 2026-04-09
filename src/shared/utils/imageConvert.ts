/**
 * base64 PNG → WebP 변환 유틸.
 * canvas API로 클라이언트에서 변환하여 Cloudinary 업로드 용량을 60~80% 절감.
 */

/** base64 PNG를 WebP로 변환한다. 실패 시 원본을 그대로 반환. */
export const convertToWebP = (
  base64Png: string,
  quality = 0.85,
): Promise<{ data: string; mimeType: "image/webp" | "image/png" }> =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ data: base64Png, mimeType: "image/png" });
          return;
        }
        ctx.drawImage(img, 0, 0);
        const webpDataUrl = canvas.toDataURL("image/webp", quality);
        const webpBase64 = webpDataUrl.split(",")[1];
        resolve({ data: webpBase64, mimeType: "image/webp" });
      } catch {
        resolve({ data: base64Png, mimeType: "image/png" });
      }
    };
    img.onerror = () => {
      resolve({ data: base64Png, mimeType: "image/png" });
    };
    img.src = `data:image/png;base64,${base64Png}`;
  });
