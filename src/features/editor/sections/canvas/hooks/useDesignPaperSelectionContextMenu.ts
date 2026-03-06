/**
 * 선택 상태 기준 컨텍스트 메뉴 열림/좌표/대상 정보를 관리하는 훅.
 */
import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from "react";
import type { CanvasElement } from "../../../model/canvasTypes";
import { isEmotionSlotShape } from "../../../utils/designPaperUtils";
import { isAacCardElement, isEmotionInferenceCard } from "../../../utils/imageFillUtils";
import type { ContextMenuState } from "../DesignPaperContextMenu";
import type { SideBarMenu } from "../../../store/sideBarStore";

interface UseDesignPaperSelectionContextMenuParams {
  readOnly: boolean;
  elements: CanvasElement[];
  pageWidth: number;
  pageHeight: number;
  selectedIdsRef: MutableRefObject<string[]>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  editingImageId: string | null;
  editingShapeTextId: string | null;
  editingTextId: string | null;
  onSelectedIdsChange?: (ids: string[]) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  setEditingImageId: (id: string | null) => void;
  setEditingShapeTextId: (id: string | null) => void;
  setSideBarMenu: (menu: SideBarMenu) => void;
  setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
  getContainerScale: () => number;
}

export const useDesignPaperSelectionContextMenu = ({
  readOnly,
  elements,
  pageWidth,
  pageHeight,
  selectedIdsRef,
  containerRef,
  editingImageId,
  editingShapeTextId,
  editingTextId,
  onSelectedIdsChange,
  onEditingTextIdChange,
  setEditingImageId,
  setEditingShapeTextId,
  setSideBarMenu,
  setContextMenu,
  getContainerScale,
}: UseDesignPaperSelectionContextMenuParams) => {
  const clearContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  const handleSelect = useCallback(
    (
      elementId: string,
      options?: { keepContextMenu?: boolean; additive?: boolean },
    ) => {
      if (readOnly) return;
      const currentSelectedIds = selectedIdsRef.current;
      const selectedElement = elements.find((element) => element.id === elementId);
      if (
        !selectedElement ||
        selectedElement.selectable === false ||
        selectedElement.locked
      ) {
        return;
      }
      const baseIds = options?.additive ? currentSelectedIds : [];
      // 선택된 요소를 배열 선두로 유지해 툴바/액션의 기준 요소가 항상 마지막 클릭 대상이 되게 한다.
      const nextSelectedIds = [
        elementId,
        ...baseIds.filter((id) => id !== elementId),
      ];
      selectedIdsRef.current = nextSelectedIds;
      onSelectedIdsChange?.(nextSelectedIds);
      if (
        isEmotionSlotShape(selectedElement) ||
        isEmotionInferenceCard(selectedElement)
      ) {
        setSideBarMenu("emotion-aac");
      } else if (isAacCardElement(elements, selectedElement)) {
        setSideBarMenu("emotion-aac");
      }
      if (editingImageId && editingImageId !== elementId) {
        setEditingImageId(null);
      }
      if (editingShapeTextId && editingShapeTextId !== elementId) {
        setEditingShapeTextId(null);
      }
      if (editingTextId && editingTextId !== elementId) {
        onEditingTextIdChange?.(null);
      }
      if (!options?.keepContextMenu) {
        setContextMenu(null);
      }
      containerRef.current?.focus();
    },
    [
      containerRef,
      editingImageId,
      editingShapeTextId,
      editingTextId,
      elements,
      onEditingTextIdChange,
      onSelectedIdsChange,
      readOnly,
      selectedIdsRef,
      setContextMenu,
      setEditingImageId,
      setEditingShapeTextId,
      setSideBarMenu,
    ],
  );

  const handleSelectChange = useCallback(
    (
      elementId: string,
      isSelected: boolean,
      options?: { keepContextMenu?: boolean; additive?: boolean },
    ) => {
      if (readOnly) return;
      if (isSelected) {
        if (options?.additive) {
          const currentSelectedIds = selectedIdsRef.current;
          if (currentSelectedIds.includes(elementId)) {
            // Shift 재클릭은 다중 선택 토글 해제로 처리한다.
            const nextSelectedIds = currentSelectedIds.filter(
              (id) => id !== elementId,
            );
            selectedIdsRef.current = nextSelectedIds;
            onSelectedIdsChange?.(nextSelectedIds);
            if (editingImageId === elementId) {
              setEditingImageId(null);
            }
            if (editingShapeTextId === elementId) {
              setEditingShapeTextId(null);
            }
            if (editingTextId === elementId) {
              onEditingTextIdChange?.(null);
            }
            if (!options.keepContextMenu) {
              setContextMenu(null);
            }
            containerRef.current?.focus();
            return;
          }
        }
        handleSelect(elementId, options);
      }
    },
    [
      containerRef,
      editingImageId,
      editingShapeTextId,
      editingTextId,
      handleSelect,
      onEditingTextIdChange,
      onSelectedIdsChange,
      readOnly,
      selectedIdsRef,
      setContextMenu,
      setEditingImageId,
      setEditingShapeTextId,
    ],
  );

  const openContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>, elementId: string) => {
      if (readOnly) return;
      event.preventDefault();
      event.stopPropagation();
      const targetElement = elements.find((element) => element.id === elementId);
      if (!targetElement || targetElement.selectable === false) return;
      if (!selectedIdsRef.current.includes(elementId)) {
        handleSelect(elementId, { keepContextMenu: true });
      }
      const rect = containerRef.current?.getBoundingClientRect();
      const rawX = event.clientX - (rect?.left ?? 0);
      const rawY = event.clientY - (rect?.top ?? 0);
      const menuWidth = 220;
      const menuHeight = 4 * 36 + 8;
      // 컨텍스트 메뉴가 페이지 밖으로 넘어가지 않도록 렌더링 좌표를 클램프한다.
      const clampedX = Math.min(
        Math.max(rawX, 8),
        Math.max(8, pageWidth - menuWidth),
      );
      const clampedY = Math.min(
        Math.max(rawY, 8),
        Math.max(8, pageHeight - menuHeight),
      );
      setContextMenu({
        x: clampedX,
        y: clampedY,
        target: { type: "element", id: elementId },
      });
    },
    [
      containerRef,
      elements,
      handleSelect,
      pageHeight,
      pageWidth,
      readOnly,
      selectedIdsRef,
      setContextMenu,
    ],
  );

  const openCanvasContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (readOnly) return;
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      const rawX = event.clientX - (rect?.left ?? 0);
      const rawY = event.clientY - (rect?.top ?? 0);
      const menuWidth = 220;
      const menuHeight = 36 + 8;
      const clampedX = Math.min(
        Math.max(rawX, 8),
        Math.max(8, pageWidth - menuWidth),
      );
      const clampedY = Math.min(
        Math.max(rawY, 8),
        Math.max(8, pageHeight - menuHeight),
      );
      const scale = getContainerScale();
      const pastePosition = {
        x: rawX / scale,
        y: rawY / scale,
      };
      setContextMenu({
        x: clampedX,
        y: clampedY,
        target: { type: "canvas", pastePosition },
      });
    },
    [
      containerRef,
      getContainerScale,
      pageHeight,
      pageWidth,
      readOnly,
      setContextMenu,
    ],
  );

  return {
    clearContextMenu,
    handleSelect,
    handleSelectChange,
    openContextMenu,
    openCanvasContextMenu,
  };
};
