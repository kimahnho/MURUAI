/**
 * 회전 중심/각도 계산에 필요한 기하 연산 유틸을 제공하는 모듈.
 */
import type { Rect } from "./designPaperUtils";

export const getRotatedCorners = (rect: Rect, rotationDeg: number) => {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const corners = [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
  ];
  // 중심점 기준 회전 변환으로 사각형의 실제 화면 좌표 꼭짓점을 계산한다.
  return corners.map((pt) => ({
    x: cx + pt.x * cos - pt.y * sin,
    y: cy + pt.x * sin + pt.y * cos,
  }));
};

export const getBottomCenterAnchor = (
  rect: Rect,
  rotationDeg: number,
  offset: number,
) => {
  const corners = getRotatedCorners(rect, rotationDeg);
  const xs = corners.map((pt) => pt.x);
  const ys = corners.map((pt) => pt.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: (minX + maxX) / 2,
    y: maxY + offset,
  };
};

export const getTopCenterAnchor = (
  rect: Rect,
  rotationDeg: number,
  offset: number,
) => {
  const corners = getRotatedCorners(rect, rotationDeg);
  const xs = corners.map((pt) => pt.x);
  const ys = corners.map((pt) => pt.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  return {
    x: (minX + maxX) / 2,
    y: minY - offset,
  };
};

export const getRotatedLocalAnchor = (
  rect: Rect,
  rotationDeg: number,
  ax: number,
  ay: number,
) => {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: cx + ax * cos - ay * sin,
    y: cy + ax * sin + ay * cos,
  };
};
