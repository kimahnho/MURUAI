import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { supabase } from "@/shared/supabase/supabase";

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

  // ✅ 백업은 DB 트리거가 자동으로 처리 (60초 throttle 적용)
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

export const generatePdfFromDomPages = async ({
  quality = 2,
  pageIds,
}: {
  quality?: number;
  pageIds?: string[];
} = {}): Promise<Blob> => {
  const pages = Array.from(document.querySelectorAll<HTMLElement>(".pdf-page"))
    .filter((page) => {
      if (!pageIds || pageIds.length === 0) return true;
      const pageId = page.dataset.pageId;
      return pageId ? pageIds.includes(pageId) : false;
    });
  if (pages.length === 0) {
    throw new Error("No .pdf-page elements found");
  }

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
          await img.decode();
        } catch {
          await new Promise<void>((resolve) => {
            const done = () => { resolve(); };
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        }
      })
    );
  };

  const waitForNextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => { resolve(); }));

  const normalizePdfTextLayout = (root: HTMLElement) => {
    const pdfTextYOffset = -10;
    const restores: Array<() => void> = [];
    const boxes = Array.from(
      root.querySelectorAll<HTMLElement>("[data-textbox=\"true\"]")
    );
    boxes.forEach((box) => {
      const content = box.querySelector<HTMLElement>(
        "[data-textbox-content=\"true\"]"
      );
      if (!content) return;
      const boxRect = box.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const alignItems = getComputedStyle(box).alignItems;
      let offsetY = 0;
      if (alignItems === "center") {
        offsetY = (boxRect.height - contentRect.height) / 2;
      } else if (alignItems === "flex-end") {
        offsetY = boxRect.height - contentRect.height;
      }
      offsetY += pdfTextYOffset;
      const prevBoxStyle = {
        display: box.style.display,
      };
      const prevContentStyle = {
        position: content.style.position,
        top: content.style.top,
        left: content.style.left,
        right: content.style.right,
        width: content.style.width,
        marginTop: content.style.marginTop,
        transform: content.style.transform,
      };
      box.style.display = "block";
      content.style.position = "absolute";
      content.style.left = "0";
      content.style.right = "0";
      content.style.width = "100%";
      content.style.top = `${Math.round(offsetY * 100) / 100}px`;
      content.style.marginTop = "0";
      content.style.transform = "none";
      restores.push(() => {
        box.style.display = prevBoxStyle.display;
        content.style.position = prevContentStyle.position;
        content.style.top = prevContentStyle.top;
        content.style.left = prevContentStyle.left;
        content.style.right = prevContentStyle.right;
        content.style.width = prevContentStyle.width;
        content.style.marginTop = prevContentStyle.marginTop;
        content.style.transform = prevContentStyle.transform;
      });
    });
    return () => {
      restores.forEach((restore) => { restore(); });
    };
  };

  const normalizePdfImageLayout = (root: HTMLElement) => {
    const restores: Array<() => void> = [];

    // 이미지를 포함하는 절대 위치 요소들을 찾아서 정수 픽셀로 고정
    const imageContainers = Array.from(
      root.querySelectorAll<HTMLElement>("img")
    ).map((img) => img.parentElement).filter((el): el is HTMLElement => el !== null);

    imageContainers.forEach((container) => {
      const style = getComputedStyle(container);
      if (style.position !== "absolute") return;

      const prevStyle = {
        left: container.style.left,
        top: container.style.top,
        width: container.style.width,
        height: container.style.height,
      };

      // 현재 계산된 값을 정수 픽셀로 고정
      const rect = container.getBoundingClientRect();
      const parentRect = container.offsetParent?.getBoundingClientRect() ?? rect;

      const left = Math.round(rect.left - parentRect.left);
      const top = Math.round(rect.top - parentRect.top);
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      container.style.left = `${left}px`;
      container.style.top = `${top}px`;
      container.style.width = `${width}px`;
      container.style.height = `${height}px`;

      restores.push(() => {
        container.style.left = prevStyle.left;
        container.style.top = prevStyle.top;
        container.style.width = prevStyle.width;
        container.style.height = prevStyle.height;
      });
    });

    return () => {
      restores.forEach((restore) => { restore(); });
    };
  };

  await waitForFonts();
  await waitForNextFrame();
  await waitForNextFrame();

  const getPageSize = (orientation: "horizontal" | "vertical") =>
    orientation === "horizontal"
      ? { width: 297, height: 210 }
      : { width: 210, height: 297 };

  const resolveOrientation = (page: HTMLElement): "horizontal" | "vertical" => {
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
    orientation: firstSize.width > firstSize.height ? "landscape" : "portrait",
  });
  const imageQuality = 0.7;

  for (let i = 0; i < pages.length; i += 1) {
    const orientation = resolveOrientation(pages[i]);
    const { width: pdfW, height: pdfH } = getPageSize(orientation);
    const rect = pages[i].getBoundingClientRect();
    const width = Math.ceil(pages[i].offsetWidth || rect.width);
    const height = Math.ceil(pages[i].offsetHeight || rect.height);

    await waitForImages(pages[i]);
    await waitForNextFrame();

    const restoreTextLayout = normalizePdfTextLayout(pages[i]);
    const restoreImageLayout = normalizePdfImageLayout(pages[i]);
    await waitForNextFrame();
    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(pages[i], {
        scale: quality,
        useCORS: true,
        backgroundColor: "#ffffff",
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });
    } finally {
      restoreTextLayout();
      restoreImageLayout();
    }
    const imgData = canvas.toDataURL("image/jpeg", imageQuality);
    const props = pdf.getImageProperties(imgData);

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
    pdf.addImage(imgData, "JPEG", x, y, w, h);
  }

  return pdf.output("blob");
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
