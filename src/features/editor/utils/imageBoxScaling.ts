type ImageBox = { x: number; y: number; w: number; h: number };

export const computeScaledImageBox = (
  oldImageBox: ImageBox | undefined,
  newWidth: number,
  newHeight: number,
): ImageBox => {
  if (!oldImageBox) {
    return { x: 0, y: 0, w: newWidth, h: newHeight };
  }

  const imageAspectRatio = oldImageBox.w / oldImageBox.h;
  const newElementAspectRatio = newWidth / newHeight;

  let newBoxW: number;
  let newBoxH: number;

  if (imageAspectRatio > newElementAspectRatio) {
    newBoxH = newHeight;
    newBoxW = newHeight * imageAspectRatio;
  } else {
    newBoxW = newWidth;
    newBoxH = newWidth / imageAspectRatio;
  }

  return {
    x: (newWidth - newBoxW) / 2,
    y: (newHeight - newBoxH) / 2,
    w: newBoxW,
    h: newBoxH,
  };
};

export const isImageFillElement = (element: {
  type: string;
  fill?: string;
}): boolean =>
  (element.type === "rect" ||
    element.type === "roundRect" ||
    element.type === "ellipse") &&
  !!element.fill &&
  (element.fill.startsWith("url(") || element.fill.startsWith("data:"));
