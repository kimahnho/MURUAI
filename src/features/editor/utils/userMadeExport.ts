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
const LOW_TIER_EXPORT_Y_OFFSET_PX = -10;

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

const buildScaleFallbacks = (baseScale: number) => {
  const levels = [baseScale, Math.max(1, baseScale * 0.82), 1];
  return Array.from(new Set(levels.map((value) => Number(value.toFixed(2)))));
};

const normalizePdfElementCapturePosition = (
  page: HTMLElement,
  tier: DevicePerformanceTier,
) => {
  if (tier !== "low") {
    return () => {};
  }
  const designPaper = page.querySelector<HTMLElement>("[data-page-id]");
  if (!designPaper) {
    return () => {};
  }
  const candidates = Array.from(designPaper.children).filter((child) => {
    if (!(child instanceof HTMLElement)) return false;
    // 페이지 번호/오버레이가 아닌 캔버스 요소만 보정한다.
    return child.style.position === "absolute";
  }) as HTMLElement[];
  const prevStyles = candidates.map((node) => ({
    node,
    transform: node.style.transform,
  }));
  candidates.forEach((node) => {
    const base = node.style.transform?.trim();
    node.style.transform = base
      ? `${base} translateY(${LOW_TIER_EXPORT_Y_OFFSET_PX}px)`
      : `translateY(${LOW_TIER_EXPORT_Y_OFFSET_PX}px)`;
  });
  return () => {
    prevStyles.forEach(({ node, transform }) => {
      node.style.transform = transform;
    });
  };
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
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
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

      // html2canvas 1.x가 flex align-items를 잘못 렌더해 텍스트가 아래로 밀리는 문제를 우회한다.
      // 원본 DOM의 flex를 !important 인라인 스타일로 block으로 덮어쓰고,
      // 수직 정렬은 padding-top으로 재현한 뒤 캡처 후 복원한다.
      const normalizePdfTextLayout = (root: HTMLElement) => {
        const restores: Array<() => void> = [];
        const boxes = Array.from(
          root.querySelectorAll<HTMLElement>('[data-textbox="true"]'),
        );
        boxes.forEach((box) => {
          const content = box.querySelector<HTMLElement>(
            '[data-textbox-content="true"]',
          );
          if (!content) return;
          const boxH = box.offsetHeight;
          const contentH = content.offsetHeight;
          const classes = box.className;
          const isAlignCenter = classes.includes("items-center");
          const isAlignEnd = classes.includes("items-end");
          let paddingTop = 0;
          if (isAlignCenter) {
            paddingTop = Math.max(0, (boxH - contentH) / 2);
          } else if (isAlignEnd) {
            paddingTop = Math.max(0, boxH - contentH);
          }
          // 이전 style attribute 전체를 저장해 캡처 후 완벽 복원한다.
          const prevBoxStyleAttr = box.getAttribute("style") ?? "";
          const isClipped = box.style.overflow === "hidden";
          const currentTop = parseFloat(box.style.top) || 0;
          if (isClipped) {
            // AAC 라벨 등 overflow: hidden 박스는 소폭 Y 보정 + overflow 해제로 잘림 방지
            box.style.setProperty("top", `${currentTop - 6}px`, "important");
            box.style.setProperty("overflow", "visible", "important");
          } else {
            box.style.setProperty("top", `${currentTop - 12}px`, "important");
            // !important로 Tailwind flex 클래스를 확실히 무효화한다.
            box.style.setProperty("display", "block", "important");
            box.style.setProperty("align-items", "unset", "important");
            box.style.setProperty("justify-content", "unset", "important");
            box.style.setProperty(
              "padding-top",
              `${Math.round(paddingTop * 100) / 100}px`,
              "important",
            );
          }
          // measure div 숨기기
          const measureDiv = box.querySelector<HTMLElement>(
            '[aria-hidden="true"]',
          );
          const prevMeasureStyleAttr = measureDiv?.getAttribute("style") ?? "";
          if (measureDiv) {
            measureDiv.style.setProperty("display", "none", "important");
          }
          restores.push(() => {
            box.setAttribute("style", prevBoxStyleAttr);
            if (measureDiv) {
              measureDiv.setAttribute("style", prevMeasureStyleAttr);
            }
          });
        });
        return () => {
          restores.forEach((fn) => fn());
        };
      };

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
        const scaleFallbacks = buildScaleFallbacks(adaptiveScale);

        await waitForImages(page);
        await waitForNextFrame();

        const restoreElementOffset = normalizePdfElementCapturePosition(
          page,
          deviceTier,
        );
        const restoreTextLayout = normalizePdfTextLayout(page);
        await waitForNextFrame();
        let canvas: HTMLCanvasElement;
        let usedScale = adaptiveScale;
        try {
          let renderError: unknown = null;
          let renderedCanvas: HTMLCanvasElement | null = null;
          for (const scale of scaleFallbacks) {
            if (signal?.aborted) {
              throw new DOMException("PDF generation aborted", "AbortError");
            }
            try {
              const attemptCanvas = await measurePerf(
                "pdf.render.page",
                () =>
                  html2canvas(page, {
                    scale,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    imageTimeout: 0,
                    logging: false,
                  }),
                {
                  index: i + 1,
                  total: pages.length,
                  width,
                  height,
                  requestedQuality: quality,
                  adaptiveScale,
                  attemptScale: scale,
                },
              );
              usedScale = scale;
              renderedCanvas = attemptCanvas;
              break;
            } catch (error) {
              renderError = error;
            }
          }
          if (!renderedCanvas) {
            throw renderError ?? new Error("Failed to render page canvas");
          }
          canvas = renderedCanvas;
        } finally {
          restoreTextLayout();
          restoreElementOffset();
        }
        const props = pdf.getImageProperties(canvas);

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
        pdf.addImage(canvas, "JPEG", x, y, w, h, undefined, "FAST");
        canvas.width = 0;
        canvas.height = 0;
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
          usedScale,
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
