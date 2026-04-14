/**
 * Canvas flood-fill 기반 이미지 배경 제거 유틸리티.
 * spectrum-agent-team의 bgRemovalAgent.ts에서 이식.
 * 결과를 Cloudinary에 업로드하여 URL로 반환.
 */
import { supabase } from "@/shared/api/supabase";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

// ─── 배경 제거 알고리즘 (Canvas flood-fill) ───

const BG_TOLERANCE = 40;
const FEATHER_RADIUS = 3;

function colorDist(r: number, g: number, b: number, br: number, bg: number, bb: number): number {
  return Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2);
}


/**
 * Canvas flood-fill로 배경을 제거한다.
 * 이미지 가장자리에서 BFS로 배경색과 유사한 픽셀을 탐색하여 투명화.
 * @returns 배경이 제거된 PNG Blob
 */
function removeBackgroundFromImage(img: HTMLImageElement): Blob | null {
  const W = img.width;
  const H = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  // 1. 코너 4픽셀로 배경색 샘플링
  const corners = [
    0,
    (W - 1) * 4,
    (H - 1) * W * 4,
    ((H - 1) * W + W - 1) * 4,
  ];
  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const c of corners) {
    bgR += data[c];
    bgG += data[c + 1];
    bgB += data[c + 2];
  }
  bgR /= 4;
  bgG /= 4;
  bgB /= 4;

  const isBgColor = (pi: number) =>
    colorDist(data[pi], data[pi + 1], data[pi + 2], bgR, bgG, bgB) < BG_TOLERANCE;

  // 2. BFS flood-fill (가장자리 → 배경 마스크)
  const bgMask = new Uint8Array(W * H);
  const queue = new Int32Array(W * H);
  let head = 0;
  let tail = 0;

  const enqueue = (idx: number) => {
    if (bgMask[idx] === 0 && isBgColor(idx * 4)) {
      bgMask[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < W; x++) {
    enqueue(x);
    enqueue((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    enqueue(y * W);
    enqueue(y * W + W - 1);
  }

  while (head < tail) {
    const i = queue[head++];
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0) enqueue(i - 1);
    if (x < W - 1) enqueue(i + 1);
    if (y > 0) enqueue(i - W);
    if (y < H - 1) enqueue(i + W);
  }

  // 3. 경계 페더링 거리 계산
  const featherDist = new Float32Array(W * H).fill(Infinity);
  const fQueue = new Int32Array(W * H);
  let fHead = 0;
  let fTail = 0;

  for (let i = 0; i < W * H; i++) {
    if (bgMask[i] !== 1) continue;
    const x = i % W;
    const y = (i / W) | 0;
    const neighbors = [
      x > 0 ? i - 1 : -1,
      x < W - 1 ? i + 1 : -1,
      y > 0 ? i - W : -1,
      y < H - 1 ? i + W : -1,
    ];
    for (const ni of neighbors) {
      if (ni >= 0 && bgMask[ni] === 0 && featherDist[ni] === Infinity) {
        featherDist[ni] = 1;
        fQueue[fTail++] = ni;
      }
    }
  }

  while (fHead < fTail) {
    const i = fQueue[fHead++];
    if (featherDist[i] >= FEATHER_RADIUS) continue;
    const x = i % W;
    const y = (i / W) | 0;
    const neighbors = [
      x > 0 ? i - 1 : -1,
      x < W - 1 ? i + 1 : -1,
      y > 0 ? i - W : -1,
      y < H - 1 ? i + W : -1,
    ];
    for (const ni of neighbors) {
      if (ni >= 0 && bgMask[ni] === 0 && featherDist[ni] === Infinity) {
        featherDist[ni] = featherDist[i] + 1;
        fQueue[fTail++] = ni;
      }
    }
  }

  // 4. alpha 적용 (배경 투명화 + 경계 페더링)
  for (let i = 0; i < W * H; i++) {
    const pi = i * 4;
    if (bgMask[i] === 1) {
      data[pi + 3] = 0;
    } else if (featherDist[i] <= FEATHER_RADIUS) {
      const alpha = Math.round(255 * (featherDist[i] / FEATHER_RADIUS));
      data[pi + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // canvas → Blob (동기적 toDataURL → Blob 변환)
  const dataUrl = canvas.toDataURL("image/png");
  const byteString = atob(dataUrl.split(",")[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: "image/png" });
}

// ─── 이미지 로드 헬퍼 ───

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    // 1차: crossOrigin으로 시도 (canvas getImageData 허용)
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // 2차: crossOrigin 없이 재시도
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = () => {
        // 3차: fetch → blob URL로 시도
        fetch(src)
          .then((res) => res.blob())
          .then((blob) => {
            const blobUrl = URL.createObjectURL(blob);
            const img3 = new Image();
            img3.onload = () => {
              resolve(img3);
              URL.revokeObjectURL(blobUrl);
            };
            img3.onerror = () => {
              URL.revokeObjectURL(blobUrl);
              reject(new Error("이미지를 불러올 수 없어요."));
            };
            img3.src = blobUrl;
          })
          .catch(() => reject(new Error("이미지를 불러올 수 없어요.")));
      };
      img2.src = src;
    };
    img.src = src;
  });
}

// ─── 공개 API ───

/**
 * fill 문자열에서 이미지 소스 URL/base64를 추출한다.
 */
export const extractImageSrc = (fill: string): string | null => {
  if (fill.startsWith("url(")) {
    return fill.slice(4, -1).replace(/(^['"]|['"]$)/g, "");
  }
  if (fill.startsWith("data:")) {
    return fill;
  }
  return null;
};

/**
 * 이미지 fill인지 판별한다.
 */
export const isImageFill = (fill: string | undefined): boolean => {
  if (!fill) return false;
  return fill.startsWith("url(") || fill.startsWith("data:");
};

/**
 * 이미지 소스에서 배경을 제거하고, Cloudinary에 업로드하여 fill 포맷 URL을 반환한다.
 */
export const removeImageBackground = async (
  imageSrc: string,
): Promise<string> => {
  const img = await loadImage(imageSrc);
  const resultBlob = removeBackgroundFromImage(img);
  if (!resultBlob) throw new Error("배경 제거에 실패했어요.");

  const cloudinaryUrl = await uploadBgRemovedToCloudinary(resultBlob);
  return `url(${cloudinaryUrl})`;
};

// ─── Cloudinary 업로드 ───

const uploadBgRemovedToCloudinary = async (
  blob: Blob,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return blobToDataUrl(blob);
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id ?? "anonymous";

  // PNG → WebP 변환 (투명도 유지)
  const webpBlob = await new Promise<Blob>((resolve) => {
    const cvs = document.createElement("canvas");
    const bmpImg = new Image();
    bmpImg.onload = () => {
      cvs.width = bmpImg.width;
      cvs.height = bmpImg.height;
      const ctx = cvs.getContext("2d");
      if (ctx) ctx.drawImage(bmpImg, 0, 0);
      cvs.toBlob((b) => resolve(b ?? blob), "image/webp", 0.9);
      URL.revokeObjectURL(bmpImg.src);
    };
    bmpImg.onerror = () => resolve(blob);
    bmpImg.src = URL.createObjectURL(blob);
  });

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  formData.append("file", webpBlob);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `muru-bg-removed/${userId}`);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    return blobToDataUrl(blob);
  }

  const payload = (await response.json()) as {
    public_id: string;
    format?: string;
  };
  const imagePath = payload.format
    ? `${payload.public_id}.${payload.format}`
    : payload.public_id;

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${imagePath}`;
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
