/**
 * 워크시트 컴포넌트 hover 바운딩 박스 오버레이.
 * hover 감지 + 시각적 바운딩 박스 표시.
 * 클릭/더블클릭은 아래 요소로 통과시킴.
 */
import { useCallback } from "react";
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

const PADDING = 4;

const WorksheetComponentOverlay = ({ elements, selectedIds }: WorksheetComponentOverlayProps) => {
  const insertedComponents = useWorksheetElementStore((s) => s.insertedComponents);
  const hoveredComponentId = useWorksheetElementStore((s) => s.hoveredComponentId);
  const setHoveredComponentId = useWorksheetElementStore((s) => s.setHoveredComponentId);
  const isDragging = useWorksheetElementStore((s) => s.isDraggingWorksheet);

  // 클릭/포인터다운 시 오버레이를 잠시 숨기고 아래 요소로 이벤트를 다시 보냄
  const passThrough = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    target.style.pointerEvents = "none";
    // 같은 좌표에서 아래 요소에 이벤트 재전달
    const below = document.elementFromPoint(e.clientX, e.clientY);
    if (below && below !== target) {
      below.dispatchEvent(new PointerEvent(e.type, {
        bubbles: true, cancelable: true,
        clientX: e.clientX, clientY: e.clientY,
        pointerId: e.pointerId, pointerType: e.pointerType,
        button: e.button, buttons: e.buttons,
      }));
    }
    // 다음 프레임에서 pointerEvents 복원 (hover 계속 감지)
    requestAnimationFrame(() => {
      target.style.pointerEvents = "auto";
    });
  }, []);

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

        // 선택된 컴포넌트는 오버레이를 숨김 (개별 요소 조작 허용)
        if (isSelected) {
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
                border: "2px solid var(--primary)",
                background: "rgba(124, 58, 237, 0.04)",
              }}
            />
          );
        }

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
              border: isHovered
                ? "2px dashed var(--primary-300)"
                : "2px solid transparent",
              background: isHovered
                ? "rgba(124, 58, 237, 0.02)"
                : "transparent",
              transition: "border-color 0.15s, background 0.15s",
              cursor: "pointer",
            }}
            onPointerEnter={() => setHoveredComponentId(comp.id)}
            onPointerLeave={() => {
              if (hoveredComponentId === comp.id) setHoveredComponentId(null);
            }}
            onPointerDown={passThrough}
          />
        );
      })}
    </>
  );
};

export default WorksheetComponentOverlay;
