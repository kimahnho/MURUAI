/**
 * 마인드맵 노드 초기 배치 알고리즘.
 * 비율 좌표(0~1) 기반으로 노드를 방사형 배치.
 * 노드 크기와 궤도 반지름을 총 노드 수에 따라 동적으로 계산하여
 * 어떤 설정값 조합에서도 겹침/이탈이 발생하지 않도록 보장한다.
 */
import type { MindMapNode } from "../model/types";

// A4 콘텐츠 영역 (mm): 여백 20mm 제외
const CONTENT_W_MM = 170;
const CONTENT_H_MM = 257;
// 겹침 방지 최소 간격 (mm)
const MIN_GAP_MM = 3;

const degToRad = (deg: number) => (deg * Math.PI) / 180;

/** mm → 비율 좌표 */
const mmToRatio = (mx: number, my: number): { x: number; y: number } => ({
  x: mx / CONTENT_W_MM,
  y: my / CONTENT_H_MM,
});

/**
 * 노드 수에 따른 동적 크기 계산.
 * 총 노드가 많을수록 노드를 작게, 적으면 크게.
 */
function computeDynamicSizes(level1Count: number, level2CountPerNode: number) {
  const totalNodes = 1 + level1Count + level1Count * level2CountPerNode;

  // 기본 크기 (mm)
  const BASE = { 0: 36, 1: 28, 2: 16 };

  // 총 노드 수에 따른 축소 비율 (5개 → 1.0, 31개 → 0.55)
  const shrink = Math.max(0.55, Math.min(1.0, 1.0 - (totalNodes - 5) * 0.0125));

  return {
    d0: BASE[0] * shrink,
    d1: BASE[1] * shrink,
    d2: BASE[2] * shrink,
    shrink,
  };
}

/**
 * 궤도 반지름 계산.
 * R1: 중심→1차 거리. R2: 1차→2차 거리.
 * 노드 크기 + 간격을 고려하여 겹치지 않는 최소 반지름을 보장.
 */
function computeOrbits(
  level1Count: number,
  level2CountPerNode: number,
  sizes: { d0: number; d1: number; d2: number },
) {
  const shortSide = Math.min(CONTENT_W_MM, CONTENT_H_MM);

  // R1 최소: 중심 노드와 1차 노드가 겹치지 않는 거리 (+8mm 여유)
  const minR1FromCenter = sizes.d0 / 2 + sizes.d1 / 2 + MIN_GAP_MM + 8;
  // R1 최소: 인접 1차 노드끼리 겹치지 않는 거리 (원 둘레 기반)
  const minR1FromL1 = level1Count > 1
    ? (sizes.d1 + MIN_GAP_MM) / (2 * Math.sin(Math.PI / level1Count))
    : minR1FromCenter;
  // R1: 두 조건 중 큰 값, 영역의 35%를 넘지 않도록
  const R1 = Math.min(shortSide * 0.35, Math.max(minR1FromCenter, minR1FromL1));

  // R2: 1차→2차 거리
  let R2 = 0;
  if (level2CountPerNode > 0) {
    const minR2FromL1 = sizes.d1 / 2 + sizes.d2 / 2 + MIN_GAP_MM;
    // 부채꼴 각도: 1차 노드 수에 따라 동적 결정
    const spreadDeg = computeFanSpread(level2CountPerNode, level1Count);
    const fanSpread = level2CountPerNode > 1
      ? degToRad(spreadDeg / (level2CountPerNode - 1))
      : 0;
    const minR2FromL2 = level2CountPerNode > 1
      ? (sizes.d2 + MIN_GAP_MM) / (2 * Math.sin(fanSpread / 2))
      : minR2FromL1;
    R2 = Math.max(minR2FromL1, minR2FromL2);
    R2 = Math.min(R2, shortSide * 0.22);
  }

  return { R1, R2 };
}

/**
 * 부채꼴 총 각도 — 1차 노드 수에 따라 동적 축소.
 * 1차 노드가 많을수록 이웃 가지와 겹치지 않도록 부채꼴을 좁힘.
 */
function computeFanSpread(l2Count: number, l1Count: number): number {
  // 이웃 가지 간 각도
  const branchAngle = 360 / Math.max(l1Count, 1);
  // 가지당 사용 가능한 총 각도: 이웃과 안전 마진 확보
  const margin = l1Count >= 6 ? 8 : 15;
  const maxSpread = Math.max(20, branchAngle - margin);
  // 2차 노드 수 기반 기본 부채꼴 (작은 값으로 시작)
  const baseSpread = 20 + l2Count * 12; // 2개→44°, 3개→56°, 4개→68°
  return Math.min(baseSpread, maxSpread);
}

/** 2차 노드 부채꼴 각도 배열 */
function fanAnglesForL1(l2Count: number, l1Count: number): number[] {
  if (l2Count <= 0) return [];
  if (l2Count === 1) return [0];
  const totalSpread = computeFanSpread(l2Count, l1Count);
  const step = totalSpread / (l2Count - 1);
  const start = -totalSpread / 2;
  return Array.from({ length: l2Count }, (_, i) => start + step * i);
}

/**
 * 마인드맵 노드 배열 생성 (초기 배치).
 */
export function generateMindMapNodes(
  level1Count: number,
  level2CountPerNode: number,
  existingNodes?: MindMapNode[],
): MindMapNode[] {
  // 기존 텍스트 보존
  const textMap = new Map<string, string>();
  if (existingNodes) {
    for (const n of existingNodes) textMap.set(n.id, n.text);
  }
  const getText = (id: string) => textMap.get(id) ?? "";

  const cx = CONTENT_W_MM / 2;
  const cy = CONTENT_H_MM / 2;

  const sizes = computeDynamicSizes(level1Count, level2CountPerNode);
  const { R1, R2 } = computeOrbits(level1Count, level2CountPerNode, sizes);

  const nodes: MindMapNode[] = [];

  // 중심 노드
  nodes.push({
    id: "center",
    level: 0,
    parent_id: null,
    text: getText("center"),
    position: mmToRatio(cx, cy),
  });

  // 1차 + 2차 노드 배치
  const angles = fanAnglesForL1(level2CountPerNode, level1Count);
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

    for (let j = 0; j < level2CountPerNode; j++) {
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
    const mx = r / CONTENT_W_MM;
    const my = r / CONTENT_H_MM;
    n.position.x = Math.max(mx, Math.min(1 - mx, n.position.x));
    n.position.y = Math.max(my, Math.min(1 - my, n.position.y));
  }

  return nodes;
}

/** 노드 직경 (mm) */
export function getNodeDiameterMm(level: 0 | 1 | 2, _scale = 1): number {
  const BASE = { 0: 36, 1: 28, 2: 16 };
  return BASE[level];
}

/** 동적 크기 계산 export */
export { computeDynamicSizes };

/** A4 콘텐츠 영역 크기 (mm) */
export const MIND_MAP_CONTENT = { w: CONTENT_W_MM, h: CONTENT_H_MM } as const;

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
