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
import { useWorksheetElementStore } from "../../../store/worksheetElementStore";

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
  pageWidth: _pageWidth,
  pageHeight: _pageHeight,
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
      // worksheetMeta: 1-click = 컴포넌트 전체 선택, 전체 선택 상태에서 재클릭 = 개별 선택
      // 개별 선택 후 더블클릭 → 기존 텍스트 편집/도형 편집이 자연스럽게 동작
      const wsMeta = selectedElement.worksheetMeta;
      let nextSelectedIds: string[];

      if (wsMeta && !options?.additive) {
        const compElementIds = elements
          .filter((el) => el.worksheetMeta?.componentId === wsMeta.componentId && !el.locked && el.selectable !== false)
          .map((el) => el.id);

        // 이미 이 컴포넌트가 전체 선택된 상태에서 클릭 → 개별 요소 선택
        const isAlreadyComponentSelected =
          currentSelectedIds.length > 1 &&
          compElementIds.length > 0 &&
          compElementIds.every((id) => currentSelectedIds.includes(id));

        if (isAlreadyComponentSelected) {
          nextSelectedIds = [elementId];
        } else {
          nextSelectedIds = compElementIds;
        }
      } else {
        // 기존 groupId 로직
        const groupId = selectedElement.groupId;
        const groupIds = groupId
          ? elements
              .filter(
                (el) =>
                  el.groupId === groupId &&
                  !el.locked &&
                  el.selectable !== false,
              )
              .map((el) => el.id)
          : [elementId];
        const groupIdSet = new Set(groupIds);
        const baseIds = options?.additive ? currentSelectedIds : [];
        nextSelectedIds = [
          ...groupIds,
          ...baseIds.filter((id) => !groupIdSet.has(id)),
        ];
      }

      selectedIdsRef.current = nextSelectedIds;
      onSelectedIdsChange?.(nextSelectedIds);

      // 우측 워크시트 편집 패널 연동 — 클릭한 요소의 컴포넌트를 자동 선택/펼침
      if (wsMeta) {
        const { insertedComponents, setSelectedComponentId, showPanel } = useWorksheetElementStore.getState();
        const matchedComp = insertedComponents.find((c) => c.id === wsMeta.componentId);
        if (matchedComp) {
          setSelectedComponentId(matchedComp.id);
          showPanel();
        }
      } else if (!wsMeta) {
        // 컴포넌트가 아닌 요소 클릭 시 편집 패널 닫기
        useWorksheetElementStore.getState().setSelectedComponentId(null);
        useWorksheetElementStore.getState().hidePanel();
      }
      if (
        isEmotionSlotShape(selectedElement) ||
        isEmotionInferenceCard(selectedElement)
      ) {
        setSideBarMenu("emotion-aac");
      } else if (
        (selectedElement as { subType?: string }).subType === "imageSlot"
      ) {
        // 이미지 삽입 슬롯 선택 시 감정/AAC 탭으로 자동 전환한다.
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
      // fixed 포지셔닝용 뷰포트 좌표 — 캔버스 밖에서도 메뉴가 잘리지 않는다
      const menuWidth = 220;
      const menuHeight = 4 * 36 + 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const clampedX = Math.min(Math.max(event.clientX, 8), vw - menuWidth - 8);
      const clampedY = Math.min(Math.max(event.clientY, 8), vh - menuHeight - 8);
      setContextMenu({
        x: clampedX,
        y: clampedY,
        target: { type: "element", id: elementId },
      });
    },
    [
      elements,
      handleSelect,
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
      const menuWidth = 220;
      const menuHeight = 36 + 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const clampedX = Math.min(Math.max(event.clientX, 8), vw - menuWidth - 8);
      const clampedY = Math.min(Math.max(event.clientY, 8), vh - menuHeight - 8);
      const rawX = event.clientX - (rect?.left ?? 0);
      const rawY = event.clientY - (rect?.top ?? 0);
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
