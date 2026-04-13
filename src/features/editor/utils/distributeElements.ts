/**
 * 다중 선택 요소의 정렬/간격 분배 계산 유틸을 제공하는 모듈.
 * 같은 groupId를 가진 요소들은 1개의 단위(바운딩 박스)로 묶어서 처리한다.
 */
import type { CanvasElement } from "../model/canvasTypes";
import { getRectFromElement } from "./designPaperUtils";

type Rect = { x: number; y: number; width: number; height: number };

/** 그룹 또는 개별 요소를 1단위로 표현 */
type Unit = {
  /** 단위 내 요소 ID 목록 (개별이면 1개, 그룹이면 여러 개) */
  ids: string[];
  /** 단위의 바운딩 박스 */
  rect: Rect;
};

// 분배 계산은 사각 경계가 있는 요소만 대상으로 하므로 line/arrow도 rect 변환 후 동일 처리한다.
const getElementRect = (el: CanvasElement): Rect | null => getRectFromElement(el);

/**
 * 요소 배열을 groupId 기준으로 단위(Unit)로 묶는다.
 * - 같은 groupId → 1단위 (바운딩 박스 합산)
 * - groupId 없음 → 개별 1단위
 * - locked 요소가 포함된 그룹은 전체를 locked로 취급 (이동 스킵)
 */
const groupIntoUnits = (elements: CanvasElement[]): Unit[] => {
  const groupMap = new Map<string, CanvasElement[]>();
  const individuals: CanvasElement[] = [];

  for (const el of elements) {
    const rect = getElementRect(el);
    if (!rect) continue;

    if (el.groupId) {
      const group = groupMap.get(el.groupId) ?? [];
      group.push(el);
      groupMap.set(el.groupId, group);
    } else {
      individuals.push(el);
    }
  }

  const units: Unit[] = [];

  // 그룹 → 바운딩 박스
  for (const [, groupEls] of groupMap) {
    const rects = groupEls
      .map((el) => ({ id: el.id, rect: getElementRect(el)! }))
      .filter((item) => item.rect !== null);
    if (rects.length === 0) continue;

    const minX = Math.min(...rects.map((r) => r.rect.x));
    const minY = Math.min(...rects.map((r) => r.rect.y));
    const maxRight = Math.max(...rects.map((r) => r.rect.x + r.rect.width));
    const maxBottom = Math.max(...rects.map((r) => r.rect.y + r.rect.height));

    units.push({
      ids: rects.map((r) => r.id),
      rect: { x: minX, y: minY, width: maxRight - minX, height: maxBottom - minY },
    });
  }

  // 개별 요소 → 1단위
  for (const el of individuals) {
    const rect = getElementRect(el);
    if (!rect) continue;
    units.push({ ids: [el.id], rect });
  }

  return units;
};

/** 단위 수 계산 (canDistribute/canAlign 체크용) */
export const getUnitCount = (elements: CanvasElement[]): number =>
  groupIntoUnits(elements).length;

/**
 * 단위 기반 분배 결과를 개별 요소의 position map으로 변환.
 * 그룹 단위가 이동하면, 그룹 내 모든 요소에 동일한 delta를 적용한다.
 */
const unitsToPositionMap = (
  units: Unit[],
  newPositions: Map<Unit, number>,
  axis: "x" | "y",
  elements: CanvasElement[],
): Map<string, number> => {
  const positionMap = new Map<string, number>();

  for (const unit of units) {
    const newPos = newPositions.get(unit);
    if (newPos === undefined) continue;

    const oldPos = axis === "x" ? unit.rect.x : unit.rect.y;
    const delta = newPos - oldPos;

    // 그룹 내 locked 요소가 있으면 전체 이동 스킵
    const hasLocked = unit.ids.some((id) => {
      const el = elements.find((e) => e.id === id);
      return el?.locked;
    });
    if (hasLocked) continue;

    for (const id of unit.ids) {
      const el = elements.find((e) => e.id === id);
      if (!el) continue;
      const elRect = getElementRect(el);
      if (!elRect) continue;
      const currentPos = axis === "x" ? elRect.x : elRect.y;
      positionMap.set(id, currentPos + delta);
    }
  }

  return positionMap;
};

// --- 분배 (Distribution) ---

export const buildHorizontalDistribution = (
  elements: CanvasElement[],
): Map<string, number> | null => {
  const units = groupIntoUnits(elements);
  if (units.length < 3) return null;

  units.sort((a, b) => a.rect.x - b.rect.x);

  const first = units[0];
  const last = units[units.length - 1];
  const totalUnitWidth = units.reduce((sum, u) => sum + u.rect.width, 0);
  const totalSpan = last.rect.x + last.rect.width - first.rect.x;
  const gap = (totalSpan - totalUnitWidth) / (units.length - 1);

  const newPositions = new Map<Unit, number>();
  let currentX = first.rect.x;
  for (const unit of units) {
    newPositions.set(unit, currentX);
    currentX += unit.rect.width + gap;
  }

  return unitsToPositionMap(units, newPositions, "x", elements);
};

export const buildVerticalDistribution = (
  elements: CanvasElement[],
): Map<string, number> | null => {
  const units = groupIntoUnits(elements);
  if (units.length < 3) return null;

  units.sort((a, b) => a.rect.y - b.rect.y);

  const first = units[0];
  const last = units[units.length - 1];
  const totalUnitHeight = units.reduce((sum, u) => sum + u.rect.height, 0);
  const totalSpan = last.rect.y + last.rect.height - first.rect.y;
  const gap = (totalSpan - totalUnitHeight) / (units.length - 1);

  const newPositions = new Map<Unit, number>();
  let currentY = first.rect.y;
  for (const unit of units) {
    newPositions.set(unit, currentY);
    currentY += unit.rect.height + gap;
  }

  return unitsToPositionMap(units, newPositions, "y", elements);
};

// --- 정렬 (Alignment) ---

const buildAlignment = (
  elements: CanvasElement[],
  axis: "x" | "y",
  getTarget: (units: Unit[]) => number,
  getUnitPos: (unit: Unit, target: number) => number,
): Map<string, number> | null => {
  const units = groupIntoUnits(elements);
  if (units.length < 2) return null;

  const target = getTarget(units);
  const newPositions = new Map<Unit, number>();
  for (const unit of units) {
    newPositions.set(unit, getUnitPos(unit, target));
  }

  return unitsToPositionMap(units, newPositions, axis, elements);
};

export const buildAlignLeft = (elements: CanvasElement[]) =>
  buildAlignment(elements, "x",
    (units) => Math.min(...units.map((u) => u.rect.x)),
    (_unit, target) => target,
  );

export const buildAlignCenterH = (elements: CanvasElement[]) =>
  buildAlignment(elements, "x",
    (units) => {
      const minX = Math.min(...units.map((u) => u.rect.x));
      const maxRight = Math.max(...units.map((u) => u.rect.x + u.rect.width));
      return (minX + maxRight) / 2;
    },
    (unit, center) => center - unit.rect.width / 2,
  );

export const buildAlignRight = (elements: CanvasElement[]) =>
  buildAlignment(elements, "x",
    (units) => Math.max(...units.map((u) => u.rect.x + u.rect.width)),
    (unit, target) => target - unit.rect.width,
  );

export const buildAlignTop = (elements: CanvasElement[]) =>
  buildAlignment(elements, "y",
    (units) => Math.min(...units.map((u) => u.rect.y)),
    (_unit, target) => target,
  );

export const buildAlignCenterV = (elements: CanvasElement[]) =>
  buildAlignment(elements, "y",
    (units) => {
      const minY = Math.min(...units.map((u) => u.rect.y));
      const maxBottom = Math.max(...units.map((u) => u.rect.y + u.rect.height));
      return (minY + maxBottom) / 2;
    },
    (unit, center) => center - unit.rect.height / 2,
  );

export const buildAlignBottom = (elements: CanvasElement[]) =>
  buildAlignment(elements, "y",
    (units) => Math.max(...units.map((u) => u.rect.y + u.rect.height)),
    (unit, target) => target - unit.rect.height,
  );

// --- 요소 위치 적용 ---

const applyPositionToElement = (
  el: CanvasElement,
  axis: "x" | "y",
  positionMap: Map<string, number>,
): CanvasElement => {
  const newPos = positionMap.get(el.id);
  if (newPos === undefined || el.locked) return el;
  if (el.type === "line" || el.type === "arrow") {
    const rect = getElementRect(el);
    if (!rect) return el;
    const delta = newPos - (axis === "x" ? rect.x : rect.y);
    if (axis === "x") {
      return {
        ...el,
        start: { x: el.start.x + delta, y: el.start.y },
        end: { x: el.end.x + delta, y: el.end.y },
      };
    }
    return {
      ...el,
      start: { x: el.start.x, y: el.start.y + delta },
      end: { x: el.end.x, y: el.end.y + delta },
    };
  }
  return axis === "x"
    ? ({ ...el, x: newPos } as CanvasElement)
    : ({ ...el, y: newPos } as CanvasElement);
};

export { applyPositionToElement };
