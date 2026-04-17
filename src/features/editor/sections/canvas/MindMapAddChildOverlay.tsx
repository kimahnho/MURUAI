/**
 * 마인드맵 1차 노드가 단독 선택됐을 때 "+ 2차 추가" 버튼을 노드 바깥쪽에 띄우는 오버레이.
 * 버튼을 누르면 해당 1차 노드의 2차 자식 수가 +1 된다.
 */
import type { CanvasElement } from "../../model/canvasTypes";
import { useWorksheetElementStore } from "../../store/worksheetElementStore";
import type { MindMapConfig } from "@/features/worksheet-editor/model/types";
import { generateMindMapNodes, MIND_MAP_L2_SHAPE_HIDDEN_THRESHOLD } from "@/features/worksheet-editor/utils/mindMapLayout";

const L2_MAX = 4;
const BUTTON_SIZE = 22;
const BUTTON_OFFSET = 14;

type Props = {
  selectedIds: string[];
  elements: CanvasElement[];
  pageOrientation: "horizontal" | "vertical";
};

const MindMapAddChildOverlay = ({ selectedIds, elements, pageOrientation }: Props) => {
  if (selectedIds.length !== 1) return null;
  const el = elements.find((e) => e.id === selectedIds[0]);
  if (!el) return null;
  const meta = el.worksheetMeta as { componentType?: string; mindMapNodeId?: string; componentId?: string } | undefined;
  if (!meta || meta.componentType !== "mind_map" || !meta.mindMapNodeId) return null;

  // 1차 노드(L1-*)만 "+" 버튼 노출. 중심/2차에는 추가 대상이 없다.
  const l1Match = meta.mindMapNodeId.match(/^L1-(\d+)$/);
  if (!l1Match) return null;
  const l1Index = Number(l1Match[1]);

  // 도형 요소만 위치 계산 대상
  if (el.type !== "ellipse" && el.type !== "roundRect") return null;
  const shape = el as { x: number; y: number; w: number; h: number };

  // 같은 컴포넌트의 center 노드 찾기 — 방향 계산용
  const centerEl = elements.find((e) => {
    const m = e.worksheetMeta as { componentId?: string; mindMapNodeId?: string } | undefined;
    return m?.componentId === meta.componentId && m?.mindMapNodeId === "center";
  }) as { x: number; y: number; w: number; h: number } | undefined;
  if (!centerEl) return null;

  // L1 중심에서 center 반대 방향으로 단위 벡터 계산
  const l1cx = shape.x + shape.w / 2;
  const l1cy = shape.y + shape.h / 2;
  const ccx = centerEl.x + centerEl.w / 2;
  const ccy = centerEl.y + centerEl.h / 2;
  const dx = l1cx - ccx;
  const dy = l1cy - ccy;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;

  // 버튼 중심: L1 노드 바깥쪽 경계에서 BUTTON_OFFSET만큼 더 나간 위치
  const btnCx = l1cx + ux * (shape.w / 2 + BUTTON_OFFSET);
  const btnCy = l1cy + uy * (shape.h / 2 + BUTTON_OFFSET);

  // 현재 해당 1차 노드의 2차 개수 조회
  const comp = useWorksheetElementStore
    .getState()
    .insertedComponents.find((c) => c.id === meta.componentId);
  if (!comp) return null;
  const cfg = comp.config as MindMapConfig;
  // 1차 7+ 컴팩트 모드에서는 2차 도형이 보이지 않아 "+" 시각 피드백이 없다 — 버튼 숨김
  if (cfg.level1_count >= MIND_MAP_L2_SHAPE_HIDDEN_THRESHOLD) return null;
  const l1NodeId = `L1-${l1Index}`;
  const currentL2Count = cfg.nodes.filter((n) => n.level === 2 && n.parent_id === l1NodeId).length;
  const isMax = currentL2Count >= L2_MAX;

  const handleAdd = () => {
    if (isMax) return;
    const latest = useWorksheetElementStore.getState().insertedComponents.find((c) => c.id === meta.componentId);
    if (!latest) return;
    const mm = latest.config as MindMapConfig;
    // level2_counts 배열 보장 (없으면 현재 nodes에서 산출)
    const base: number[] = Array.from({ length: mm.level1_count }, (_, i) => {
      if (mm.level2_counts && mm.level2_counts.length > 0) {
        return mm.level2_counts[i] ?? mm.level2_count_per_node;
      }
      return mm.nodes.filter((n) => n.level === 2 && n.parent_id === `L1-${i}`).length;
    });
    if (l1Index < 0 || l1Index >= base.length) return;
    base[l1Index] = Math.min(L2_MAX, (base[l1Index] ?? 0) + 1);
    const newNodes = generateMindMapNodes(
      mm.level1_count,
      mm.level2_count_per_node,
      mm.nodes,
      base,
      pageOrientation,
    );
    const nextConfig: MindMapConfig = { ...mm, level2_counts: base, nodes: newNodes };
    useWorksheetElementStore.getState().updateComponentConfig(latest.id, nextConfig);
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => { e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); handleAdd(); }}
      disabled={isMax}
      aria-label={isMax ? "2차 노드 최대치" : "2차 노드 추가"}
      title={isMax ? `2차 노드는 1차당 최대 ${L2_MAX}개까지 추가할 수 있어요` : "여기에 2차 노드 추가"}
      style={{
        position: "absolute",
        left: btnCx - BUTTON_SIZE / 2,
        top: btnCy - BUTTON_SIZE / 2,
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: "50%",
        border: "none",
        background: isMax ? "#c4b5fd" : "#7C3AED",
        color: "white",
        cursor: isMax ? "not-allowed" : "pointer",
        boxShadow: "0 2px 6px rgba(124,58,237,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        lineHeight: 1,
        fontWeight: 700,
        zIndex: 50,
        padding: 0,
      }}
    >
      +
    </button>
  );
};

export default MindMapAddChildOverlay;
