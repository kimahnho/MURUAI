/**
 * 워크시트 컴포넌트 hover 바운딩 박스 오버레이.
 * 컴포넌트 영역에 마우스를 올리면 전체 컴포넌트 바운딩 박스를 표시.
 */
import type { CanvasElement } from "../../model/canvasTypes";
import { useWorksheetElementStore } from "../../store/worksheetElementStore";

interface WorksheetComponentOverlayProps {
  elements: CanvasElement[];
  selectedIds: string[];
}

/** 컴포넌트별 바운딩 박스 계산 */
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

const PADDING = 4;

const WorksheetComponentOverlay = ({ elements, selectedIds }: WorksheetComponentOverlayProps) => {
  const insertedComponents = useWorksheetElementStore((s) => s.insertedComponents);
  const hoveredComponentId = useWorksheetElementStore((s) => s.hoveredComponentId);
  const setHoveredComponentId = useWorksheetElementStore((s) => s.setHoveredComponentId);
  const isDragging = useWorksheetElementStore((s) => s.isDraggingWorksheet);

  if (insertedComponents.length === 0 || isDragging) return null;

  // 현재 전체 선택된 컴포넌트 ID 감지
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
              pointerEvents: "auto",
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
            onPointerEnter={() => setHoveredComponentId(comp.id)}
            onPointerLeave={() => {
              if (hoveredComponentId === comp.id) setHoveredComponentId(null);
            }}
          />
        );
      })}
    </>
  );
};

export default WorksheetComponentOverlay;
