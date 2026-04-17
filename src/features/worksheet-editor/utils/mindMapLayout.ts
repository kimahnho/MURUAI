/**
 * 마인드맵 노드 초기 배치 알고리즘.
 * 비율 좌표(0~1) 기반으로 노드를 방사형 배치.
 * 노드 크기와 궤도 반지름을 총 노드 수에 따라 동적으로 계산하여
 * 어떤 설정값 조합에서도 겹침/이탈이 발생하지 않도록 보장한다.
 */
import type { MindMapNode } from "../model/types";

// A4 콘텐츠 영역 (mm): 양쪽 15mm 여백 제외
const VERTICAL_CONTENT = { w: 180, h: 267 } as const;
const HORIZONTAL_CONTENT = { w: 267, h: 180 } as const;
// 겹침 방지 최소 간격 (mm)
const MIN_GAP_MM = 3;

/** 1차 노드가 이 수 이상이면 2차 도형을 숨기고 짧은 가지선만 그린다. */
export const MIND_MAP_L2_SHAPE_HIDDEN_THRESHOLD = 7;

const degToRad = (deg: number) => (deg * Math.PI) / 180;

const getContentDims = (orientation: "horizontal" | "vertical" = "vertical") =>
  orientation === "horizontal" ? HORIZONTAL_CONTENT : VERTICAL_CONTENT;

/** 기본 노드 크기 (mm) — 요소 단독 시 겹침 없이 충분히 크게 보이는 값.
 * L2는 글자 입력이 가능하도록 충분한 크기(>= 15mm)를 목표로 한다. */
const BASE_NODE_DIAMETERS = { 0: 44, 1: 34, 2: 26 } as const;

/** 1차당 2차 개수 배열을 구하는 헬퍼 — per-node override가 있으면 그것을, 없으면 균일값 */
function resolveLevel2Counts(
  level1Count: number,
  level2CountPerNode: number,
  level2CountsOverride?: number[],
): number[] {
  if (level2CountsOverride && level2CountsOverride.length > 0) {
    // 길이를 level1Count에 맞춰 조정 (길면 자르고, 짧으면 기본값으로 채움)
    const result: number[] = [];
    for (let i = 0; i < level1Count; i++) {
      result.push(level2CountsOverride[i] ?? level2CountPerNode);
    }
    return result;
  }
  return Array.from({ length: level1Count }, () => level2CountPerNode);
}

/**
 * 노드 수에 따른 동적 크기 계산.
 * 총 노드가 많을수록 노드를 작게, 적으면 크게.
 * level2CountsOverride가 있으면 합계 기준으로 계산.
 */
function computeDynamicSizes(
  level1Count: number,
  level2CountPerNode: number,
  level2CountsOverride?: number[],
) {
  const l2Counts = resolveLevel2Counts(level1Count, level2CountPerNode, level2CountsOverride);
  const totalL2 = l2Counts.reduce((a, b) => a + b, 0);
  const totalNodes = 1 + level1Count + totalL2;

  // 총 노드 수에 따른 기본 축소 비율 (5개 → 1.0, 51개 → 0.55)
  const shrink = Math.max(0.55, Math.min(1.0, 1.0 - (totalNodes - 5) * 0.01));
  // 2차 노드는 가지가 많고 밀도가 높을 때 추가 축소 — 이웃 가지끼리 겹치지 않도록.
  // totalL2가 12개 이하에서는 1.0 유지, 48개에서 0.45까지 내려감.
  const l2DensityShrink = Math.max(0.45, Math.min(1.0, 1.0 - Math.max(0, totalL2 - 12) * 0.015));

  return {
    d0: BASE_NODE_DIAMETERS[0] * shrink,
    d1: BASE_NODE_DIAMETERS[1] * shrink,
    d2: BASE_NODE_DIAMETERS[2] * shrink * l2DensityShrink,
    shrink,
  };
}

/**
 * 궤도 반지름 계산.
 * R1: 중심→1차 거리. R2: 1차→2차 거리 (1차별 가변 2차 수 중 최댓값 기준).
 * 노드 크기 + 간격을 고려하여 겹치지 않는 최소 반지름을 보장.
 */
function computeOrbits(
  level1Count: number,
  maxLevel2Count: number,
  sizes: { d0: number; d1: number; d2: number },
  contentDims: { w: number; h: number },
) {
  const shortSide = Math.min(contentDims.w, contentDims.h);

  // 원형 R1 — 마인드맵 전체가 정사각 프레임 안에 들어가도록 짧은 축 기준 반지름 사용.
  // 세로 캔버스든 가로 캔버스든 1차 노드는 중심에서 같은 거리에 배치되어 보이게 한다.
  const minR1FromCenter = sizes.d0 / 2 + sizes.d1 / 2 + MIN_GAP_MM + 8;
  const minR1FromL1 = level1Count > 1
    ? (sizes.d1 + MIN_GAP_MM) / (2 * Math.sin(Math.PI / level1Count))
    : minR1FromCenter;
  const R1 = Math.min(shortSide * 0.4, Math.max(minR1FromCenter, minR1FromL1));

  // 1차가 많은 "컴팩트 모드": 2차는 짧은 가지선으로만 표시되므로 R2를 짧게 고정
  const isCompactMode = level1Count >= MIND_MAP_L2_SHAPE_HIDDEN_THRESHOLD;

  let R2 = 0;
  if (maxLevel2Count > 0) {
    if (isCompactMode) {
      // 1차 가장자리에서 약 10mm 튀어나오는 짧은 가지선 길이
      R2 = sizes.d1 / 2 + 10;
    } else {
      const minR2FromL1 = sizes.d1 / 2 + sizes.d2 / 2 + MIN_GAP_MM;
      const spreadDeg = computeFanSpread(maxLevel2Count, level1Count);
      const siblingStepRad = maxLevel2Count > 1 && spreadDeg > 0
        ? degToRad(spreadDeg / (maxLevel2Count - 1))
        : 0;
      const minR2FromSiblings = siblingStepRad > 0
        ? (sizes.d2 + MIN_GAP_MM) / (2 * Math.sin(siblingStepRad / 2))
        : minR2FromL1;
      // L2가 영역 밖으로 나가지 않도록 상한 설정 (짧은 축 기준 — 가장 제약적인 방향)
      const pageR2Max = shortSide / 2 - R1 - sizes.d2 / 2;
      const R2Upper = Math.max(minR2FromL1 + 1, Math.min(shortSide * 0.32, pageR2Max));
      R2 = Math.min(R2Upper, Math.max(minR2FromL1, minR2FromSiblings));
    }
  }

  return { R1, R2 };
}

/**
 * 주어진 R2 하에서 2차 가지가 겹치지 않는 최대 부채꼴 각도(도) 계산.
 * 이 각도를 넘어서면 형제 L2 노드끼리 겹친다.
 */
function computeSafeFanDeg(l2Count: number, R2: number, d2: number): number {
  if (l2Count <= 1 || R2 <= 0) return 0;
  // sibling 중심 거리 최소값: d2 + MIN_GAP
  const ratio = (d2 + MIN_GAP_MM) / (2 * R2);
  if (ratio >= 1) return 0; // 물리적으로 불가능 — 0 반환
  const maxStepRad = 2 * Math.asin(ratio);
  const maxStepDeg = (maxStepRad * 180) / Math.PI;
  return maxStepDeg * (l2Count - 1);
}

/**
 * 부채꼴 총 각도 — 1차 노드 수에 따라 동적 축소.
 * 이웃 가지와의 각 간격이 형제 노드 간 각 간격 이상이 되도록 제한하여
 * 이웃 가지의 2차 노드와도 겹치지 않게 보장한다.
 */
function computeFanSpread(l2Count: number, l1Count: number): number {
  if (l2Count <= 1) return 0;
  // 이웃 가지 간 각도
  const branchAngle = 360 / Math.max(l1Count, 1);
  // 가지당 사용 가능한 총 각도: 이웃과 안전 마진 확보 (가지 많을수록 마진 축소)
  const margin = l1Count >= 8 ? 4 : l1Count >= 6 ? 8 : 15;
  const maxSpread = Math.max(16, branchAngle - margin);
  // 이웃 가지 L2와 겹치지 않도록 총 spread는 branchAngle*(l2-1)/l2 이내여야 한다.
  // (형제 사이 간격 = spread/(l2-1), 이웃 경계 여유 = branchAngle - spread;
  //  이웃 여유가 형제 간격과 같아야 이웃 가지 L2와도 대칭적으로 떨어짐)
  const feasibleSpread = (branchAngle * (l2Count - 1)) / l2Count;
  // 2차 노드 수 기반 기본 부채꼴 (작은 값으로 시작)
  const baseSpread = 20 + l2Count * 12; // 2개→44°, 3개→56°, 4개→68°
  return Math.min(baseSpread, maxSpread, feasibleSpread);
}

/** 2차 노드 부채꼴 각도 배열 — 형제 겹침 방지를 위해 필요 시 spread를 넓힌다 */
function fanAnglesForL1(l2Count: number, l1Count: number, R2: number, d2: number): number[] {
  if (l2Count <= 0) return [];
  if (l2Count === 1) return [0];
  const requested = computeFanSpread(l2Count, l1Count);
  const siblingMinSpread = computeSafeFanDeg(l2Count, R2, d2);
  // 형제 겹침을 막으려면 spread가 최소 siblingMinSpread 이상이어야 한다.
  // requested가 더 크면 그대로 사용; 작으면 siblingMinSpread로 확장.
  // 단 320°를 넘지 않도록(부모/중심 방향을 덮지 않도록) 안전장치.
  const totalSpread = Math.min(320, Math.max(requested, siblingMinSpread));
  const step = totalSpread / (l2Count - 1);
  const start = -totalSpread / 2;
  return Array.from({ length: l2Count }, (_, i) => start + step * i);
}

/**
 * 마인드맵 노드 배열 생성 (초기 배치).
 * level2CountsOverride가 있으면 각 1차 노드에 대응하는 개수로 2차 노드를 생성.
 */
export function generateMindMapNodes(
  level1Count: number,
  level2CountPerNode: number,
  existingNodes?: MindMapNode[],
  level2CountsOverride?: number[],
  orientation: "horizontal" | "vertical" = "vertical",
): MindMapNode[] {
  // 기존 텍스트 보존
  const textMap = new Map<string, string>();
  if (existingNodes) {
    for (const n of existingNodes) textMap.set(n.id, n.text);
  }
  const getText = (id: string) => textMap.get(id) ?? "";

  const dims = getContentDims(orientation);
  const cx = dims.w / 2;
  const cy = dims.h / 2;

  const l2Counts = resolveLevel2Counts(level1Count, level2CountPerNode, level2CountsOverride);
  const maxL2 = l2Counts.reduce((m, v) => Math.max(m, v), 0);

  const sizes = computeDynamicSizes(level1Count, level2CountPerNode, level2CountsOverride);
  const { R1, R2 } = computeOrbits(level1Count, maxL2, sizes, dims);

  const nodes: MindMapNode[] = [];

  const mmToRatio = (mx: number, my: number) => ({ x: mx / dims.w, y: my / dims.h });

  // 중심 노드
  nodes.push({
    id: "center",
    level: 0,
    parent_id: null,
    text: getText("center"),
    position: mmToRatio(cx, cy),
  });

  for (let i = 0; i < level1Count; i++) {
    const angle = (2 * Math.PI * i) / level1Count - Math.PI / 2;
    const mx = cx + R1 * Math.cos(angle);
    const my = cy + R1 * Math.sin(angle);

    const l1Id = `L1-${i}`;
    nodes.push({
      id: l1Id,
      level: 1,
      parent_id: "center",
      text: getText(l1Id),
      position: mmToRatio(mx, my),
    });

    const thisL2Count = l2Counts[i];
    const angles = fanAnglesForL1(thisL2Count, level1Count, R2, sizes.d2);
    for (let j = 0; j < thisL2Count; j++) {
      const fanDeg = angles[j] ?? 0;
      const l2Angle = angle + degToRad(fanDeg);
      const l2x = mx + R2 * Math.cos(l2Angle);
      const l2y = my + R2 * Math.sin(l2Angle);

      const l2Id = `L2-${i}-${j}`;
      nodes.push({
        id: l2Id,
        level: 2,
        parent_id: l1Id,
        text: getText(l2Id),
        position: mmToRatio(l2x, l2y),
      });
    }
  }

  // 경계 클램핑
  for (const n of nodes) {
    const r = (n.level === 0 ? sizes.d0 : n.level === 1 ? sizes.d1 : sizes.d2) / 2;
    const mx = r / dims.w;
    const my = r / dims.h;
    n.position.x = Math.max(mx, Math.min(1 - mx, n.position.x));
    n.position.y = Math.max(my, Math.min(1 - my, n.position.y));
  }

  return nodes;
}

/** 노드 직경 (mm) */
export function getNodeDiameterMm(level: 0 | 1 | 2, _scale = 1): number {
  return BASE_NODE_DIAMETERS[level];
}

/** 동적 크기 계산 export */
export { computeDynamicSizes };

/** A4 콘텐츠 영역 크기 (mm). 방향에 따라 달라진다. */
export const MIND_MAP_CONTENT = VERTICAL_CONTENT;
export const MIND_MAP_CONTENT_BY_ORIENTATION = {
  vertical: VERTICAL_CONTENT,
  horizontal: HORIZONTAL_CONTENT,
} as const;

/**
 * 컬러 테마 정의.
 * 단색 베리에이션: 중심(L0) → 1차(L1) → 2차(L2) 순으로 색이 연해짐.
 */
import type { MindMapColorTheme } from "../model/types";

interface ThemeColors {
  fill: [string, string, string];
  stroke: [string, string, string];
  text: string;
  line: string;
}

export const MIND_MAP_THEMES: Record<MindMapColorTheme, ThemeColors> = {
  gray: {
    fill: ["#E0E0E0", "#EEEEEE", "#F7F7F7"],
    stroke: ["#333333", "#666666", "#999999"],
    text: "#000000",
    line: "#666666",
  },
  pastel: {
    fill: ["#F9B2D7", "#CFECF3", "#DAF9DE"],
    stroke: ["#E08AB8", "#A0CDD8", "#A8D8AE"],
    text: "#4A4A4A",
    line: "#C0C0C0",
  },
  pink: {
    fill: ["#F0A0A8", "#F5C4C8", "#FBE4E6"],
    stroke: ["#D96B78", "#E89CA4", "#F0C0C6"],
    text: "#6B2030",
    line: "#D96B78",
  },
  blue: {
    fill: ["#8DB8E0", "#B8D4EE", "#DDE9F6"],
    stroke: ["#5A90C0", "#84ACD4", "#ADC8E6"],
    text: "#1E3A5C",
    line: "#5A90C0",
  },
  mint: {
    fill: ["#80CCB8", "#AEE0D4", "#D8F0EA"],
    stroke: ["#4CA894", "#78C0AE", "#A0D8CA"],
    text: "#1A4A3C",
    line: "#4CA894",
  },
  yellow: {
    fill: ["#EED080", "#F2DFA8", "#F8EDD0"],
    stroke: ["#C4A840", "#D4BC6A", "#E0D094"],
    text: "#4A3C10",
    line: "#C4A840",
  },
  lavender: {
    fill: ["#C8B8E8", "#DDD0F2", "#EDE6FA"],
    stroke: ["#9A82CC", "#B8A6DC", "#D0C4EA"],
    text: "#3D2E5C",
    line: "#9A82CC",
  },
};

export const MIND_MAP_THEME_LABELS: Record<MindMapColorTheme, string> = {
  gray: "기본",
  pastel: "파스텔",
  pink: "핑크",
  blue: "블루",
  mint: "민트",
  yellow: "노랑",
  lavender: "보라",
};
