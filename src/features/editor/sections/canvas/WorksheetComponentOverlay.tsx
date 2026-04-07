/**
 * 워크시트 컴포넌트 바운딩 박스 오버레이.
 * pointerEvents: none — 클릭을 가로채지 않음.
 * hover 감지는 DesignPaper의 onPointerMoveCapture에서 좌표 기반으로 처리.
 */
import type { CanvasElement } from "../../model/canvasTypes";
import { useWorksheetElementStore } from "../../store/worksheetElementStore";

interface WorksheetComponentOverlayProps {
  elements: CanvasElement[];
  selectedIds: string[];
}

const getComponentBounds = (
  elements: CanvasElement[],
  elementIds: string[],
): { x: number; y: number; w: number; h: number } | null => {
  const idSet = new Set(elementIds);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    if (!idSet.has(el.id)) continue;
    if ("x" in el && "y" in el && "w" in el && "h" in el) {
      const { x, y, w, h } = el as { x: number; y: number; w: number; h: number };
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    }
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
};

export { getComponentBounds };

const PADDING = 4;

const WorksheetComponentOverlay = ({ elements, selectedIds }: WorksheetComponentOverlayProps) => {
  const insertedComponents = useWorksheetElementStore((s) => s.insertedComponents);
  const hoveredComponentId = useWorksheetElementStore((s) => s.hoveredComponentId);
  const isDragging = useWorksheetElementStore((s) => s.isDraggingWorksheet);

  if (insertedComponents.length === 0 || isDragging) return null;

  const selectedCompId = (() => {
    if (selectedIds.length <= 1) return null;
    for (const comp of insertedComponents) {
      if (comp.elementIds.length > 0 && comp.elementIds.every((id) => selectedIds.includes(id))) {
        return comp.id;
      }
    }
    return null;
  })();

  return (
    <>
      {insertedComponents.map((comp) => {
        const bounds = getComponentBounds(elements, comp.elementIds);
        if (!bounds) return null;

        const isHovered = hoveredComponentId === comp.id;
        const isSelected = selectedCompId === comp.id;

        return (
          <div
            key={comp.id}
            style={{
              position: "absolute",
              left: bounds.x - PADDING,
              top: bounds.y - PADDING,
              width: bounds.w + PADDING * 2,
              height: bounds.h + PADDING * 2,
              pointerEvents: "none",
              zIndex: 1,
              borderRadius: 6,
              border: isSelected
                ? "2px solid var(--primary)"
                : isHovered
                  ? "2px dashed var(--primary-300)"
                  : "2px solid transparent",
              background: isSelected
                ? "rgba(124, 58, 237, 0.04)"
                : isHovered
                  ? "rgba(124, 58, 237, 0.02)"
                  : "transparent",
              transition: "border-color 0.15s, background 0.15s",
            }}
          />
        );
      })}
    </>
  );
};

export default WorksheetComponentOverlay;
