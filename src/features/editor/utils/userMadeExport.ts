/**
 * 사용자 문서를 이미지/PDF로 내보내는 렌더링 유틸리티 모듈.
 */
import { supabase } from "@/shared/api/supabase";
import { logPerf, measurePerf } from "./perfLogger";

type SaveUserMadeOptions = {
  userId: string;
  name: string;
  canvasData: unknown;
};

type AssignTargetOptions = {
  userMadeId: string;
  targetType: "child" | "group";
  targetId: string;
};

export const saveUserMadeVersion = async ({
  userId,
  name,
  canvasData,
}: SaveUserMadeOptions): Promise<{ id: string }> => {
  if (!userId) {
    console.error("saveUserMadeVersion: missing userId");
  }
  if (!name) {
    console.warn("saveUserMadeVersion: empty name");
  }
  if (canvasData == null) {
    console.error("saveUserMadeVersion: missing canvasData", canvasData);
  }

  const payload = {
    user_id: userId,
    name,
    canvas_data: canvasData,
  };

  const { data, error } = await supabase
    .from("user_made_n")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data) {
    console.error("saveUserMadeVersion failed", {
      error,
      hasUserId: Boolean(userId),
      name,
      canvasDataType: typeof canvasData,
      payloadKeys: Object.keys(payload),
    });
    throw error ?? new Error("Failed to save user_made_n");
  }

  return { id: data.id };
};

type UpdateUserMadeOptions = {
  docId: string;
  name: string;
  canvasData: unknown;
};

export const updateUserMadeVersion = async ({
  docId,
  name,
  canvasData,
}: UpdateUserMadeOptions): Promise<void> => {
  if (!docId) {
    console.error("updateUserMadeVersion: missing docId");
    throw new Error("Missing document ID");
  }
  if (!name) {
    console.warn("updateUserMadeVersion: empty name");
  }
  if (canvasData == null) {
    console.error("updateUserMadeVersion: missing canvasData", canvasData);
  }

  const payload = {
    name,
    canvas_data: canvasData,
  };

  const { error } = await supabase
    .from("user_made_n")
    .update(payload)
    .eq("id", docId);

  if (error) {
    console.error("updateUserMadeVersion failed", {
      error,
      docId,
      name,
      canvasDataType: typeof canvasData,
    });
    throw error;
  }

  // 백업은 DB 트리거가 처리하므로 애플리케이션 레벨 이중 호출을 피한다.
};

export const assignUserMadeToTarget = async ({
  userMadeId,
  targetType,
  targetId,
}: AssignTargetOptions): Promise<void> => {
  const payload =
    targetType === "child"
      ? { user_made_id: userMadeId, child_id: targetId }
      : { user_made_id: userMadeId, group_id: targetId };

  const { error } = await supabase.from("user_made_targets_n").insert(payload);

  if (error) {
    throw error;
  }
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type DevicePerformanceTier = "low" | "mid" | "high";

const getDevicePerformanceTier = (): DevicePerformanceTier => {
  if (typeof navigator === "undefined") return "mid";
  const deviceMemory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cpuThreads = navigator.hardwareConcurrency ?? 4;
  if (deviceMemory <= 2 || cpuThreads <= 4) return "low";
  if (deviceMemory <= 4 || cpuThreads <= 8) return "mid";
  return "high";
};

const getAdaptiveCaptureScale = ({
  requestedQuality,
  width,
  height,
}: {
  requestedQuality: number;
  width: number;
  height: number;
}) => {
  const tier = getDevicePerformanceTier();
  const requested = clampNumber(requestedQuality, 1, 3);
  const maxByTier = tier === "low" ? 1.35 : tier === "mid" ? 1.8 : 2.25;
  const pixelBudget =
    tier === "low" ? 5_000_000 : tier === "mid" ? 9_000_000 : 14_000_000;
  const area = Math.max(1, width * height);
  const areaLimited = Math.sqrt(pixelBudget / area);
  return clampNumber(Math.min(requested, maxByTier, areaLimited), 1, 3);
};

export const generatePdfFromDomPages = async ({
  quality = 2,
  pageIds,
  onProgress,
  signal,
}: {
  quality?: number;
  pageIds?: string[];
  onProgress?: (progress: { current: number; total: number }) => void;
  signal?: AbortSignal;
} = {}): Promise<Blob> => {
  return measurePerf(
    "pdf.generate.total",
    async () => {
      const deviceTier = getDevicePerformanceTier();
      const [htmlToImage, { default: jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const pages = Array.from(
        document.querySelectorAll<HTMLElement>(".pdf-page"),
      ).filter((page) => {
        if (!pageIds || pageIds.length === 0) return true;
        const pageId = page.dataset.pageId;
        return pageId ? pageIds.includes(pageId) : false;
      });
      if (pages.length === 0) {
        throw new Error("No .pdf-page elements found");
      }
      if (signal?.aborted) {
        throw new DOMException("PDF generation aborted", "AbortError");
      }
      onProgress?.({ current: 0, total: pages.length });

      const waitForFonts = async () => {
        if (document.fonts?.ready) {
          await document.fonts.ready;
        }
      };

      const waitForImages = async (root: HTMLElement) => {
        const images = Array.from(root.querySelectorAll("img"));
        if (images.length === 0) return;
        await Promise.all(
          images.map(async (img) => {
            if (img.complete && img.naturalWidth > 0) return;
            try {
              await Promise.race([
                img.decode(),
                new Promise<void>((resolve) => {
                  window.setTimeout(() => {
                    resolve();
                  }, 3000);
                }),
              ]);
            } catch {
              await new Promise<void>((resolve) => {
                const done = () => {
                  resolve();
                };
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
              });
            }
          }),
        );
      };

      const waitForNextFrame = () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => {
            resolve();
          }),
        );

      await waitForFonts();
      await waitForNextFrame();
      await waitForNextFrame();

      const getPageSize = (orientation: "horizontal" | "vertical") =>
        orientation === "horizontal"
          ? { width: 297, height: 210 }
          : { width: 210, height: 297 };

      const resolveOrientation = (
        page: HTMLElement,
      ): "horizontal" | "vertical" => {
        const datasetOrientation = page.dataset.orientation;
        if (datasetOrientation === "horizontal") return "horizontal";
        if (datasetOrientation === "vertical") return "vertical";
        const rect = page.getBoundingClientRect();
        return rect.width > rect.height ? "horizontal" : "vertical";
      };

      const firstOrientation = resolveOrientation(pages[0]);
      const firstSize = getPageSize(firstOrientation);
      const pdf = new jsPDF({
        unit: "mm",
        format: [firstSize.width, firstSize.height],
        orientation:
          firstSize.width > firstSize.height ? "landscape" : "portrait",
      });

      for (let i = 0; i < pages.length; i += 1) {
        if (signal?.aborted) {
          throw new DOMException("PDF generation aborted", "AbortError");
        }
        const page = pages[i];
        const orientation = resolveOrientation(page);
        const { width: pdfW, height: pdfH } = getPageSize(orientation);
        const rect = page.getBoundingClientRect();
        const width = Math.ceil(page.offsetWidth || rect.width);
        const height = Math.ceil(page.offsetHeight || rect.height);
        const adaptiveScale = getAdaptiveCaptureScale({
          requestedQuality: quality,
          width,
          height,
        });

        await waitForImages(page);
        await waitForNextFrame();

        // html-to-image는 브라우저 엔진이 직접 SVG foreignObject로 렌더하므로
        // flex/폰트 레이아웃 보정 없이 에디터와 동일한 결과를 얻는다.
        const dataUrl = await measurePerf(
          "pdf.render.page",
          () =>
            htmlToImage.toJpeg(page, {
              pixelRatio: adaptiveScale,
              backgroundColor: "#ffffff",
              skipFonts: false,
              fetchRequestInit: { cache: "force-cache" },
            }),
          {
            index: i + 1,
            total: pages.length,
            width,
            height,
            requestedQuality: quality,
            adaptiveScale,
            deviceTier,
          },
        );

        const props = pdf.getImageProperties(dataUrl);

        let w = pdfW;
        let h = (props.height * w) / props.width;
        if (h > pdfH) {
          h = pdfH;
          w = (props.width * h) / props.height;
        }
        const x = (pdfW - w) / 2;
        const y = 0;

        if (i > 0) {
          pdf.addPage([pdfW, pdfH], pdfW > pdfH ? "landscape" : "portrait");
        }
        pdf.addImage(dataUrl, "JPEG", x, y, w, h, undefined, "FAST");
        if (i % 2 === 1) {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 0);
          });
        }
        logPerf("pdf.render.page.scale", {
          index: i + 1,
          total: pages.length,
          requestedQuality: quality,
          adaptiveScale,
          deviceTier,
        });
        onProgress?.({ current: i + 1, total: pages.length });
      }

      logPerf("pdf.generate.summary", {
        pageCount: pages.length,
        selectedMode: Boolean(pageIds && pageIds.length > 0),
        quality,
      });
      return pdf.output("blob");
    },
    {
      requestedPageCount: pageIds?.length ?? 0,
      quality,
    },
  );
};

export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
