/**
 * 캔버스 요소 타입별 렌더링 분기를 모아 DesignPaper의 요소 표시 흐름을 제공하는 훅.
 */
import { useEffect, useMemo } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
  TableElement,
  TextElement,
  ResizeHandle,
} from "../../../model/canvasTypes";
import type { SideBarMenu } from "../../../store/sideBarStore";
import {
  DEFAULT_STROKE,
  type Rect,
} from "../../../utils/designPaperUtils";
import {
  createFlipXHandler,
  createFlipYHandler,
  createRotateCWHandler,
  createRotateCCWHandler,
} from "../../../utils/elementTransforms";
import { normalizeFontWeight } from "../../../utils/fontOptions";
import Arrow from "../elements/arrow/Arrow";
import CircleBox from "../elements/circle/CircleBox";
import Line from "../elements/line/Line";
import RoundBox from "../elements/round_box/RoundBox";
import TextBox from "../elements/text/TextBox";
import TableBox from "../elements/table/TableBox";
import { buildTextToolbarConfig } from "../utils/textToolbarConfig";
import { useTableStore } from "../../../store/tableStore";

type TextStylePatch = Partial<TextElement["style"]>;
type TextElementPatch = Omit<Partial<TextElement>, "style"> & {
  style?: TextStylePatch;
};
type ShapeBorderPatch = Partial<ShapeElement["border"]>;
type ShapeElementPatch = Omit<Partial<ShapeElement>, "border"> & {
  border?: ShapeBorderPatch;
};
type LineStrokePatch = Partial<LineElement["stroke"]>;
type LineElementPatch = Omit<Partial<LineElement>, "stroke"> & {
  stroke?: LineStrokePatch;
};
type ElementPatch =
  | TextElementPatch
  | ShapeElementPatch
  | LineElementPatch
  | Partial<CanvasElement>;
type Point = LineElement["start"];

type SelectOptions = { keepContextMenu?: boolean; additive?: boolean };

type UseDesignPaperElementRendererParams = {
  elements: CanvasElement[];
  selectedIds: string[];
  readOnly: boolean;
  editingTextId: string | null;
  editingImageId: string | null;
  editingShapeTextId: string | null;
  emotionSlotTextIds: Set<string>;
  shouldShowIndividualBorder: (id: string) => boolean;
  getRenderableRect: (element: CanvasElement) => Rect | null;
  setSideBarMenu: (menu: SideBarMenu) => void;
  setFontPanel: (value: { fontFamily: string; fontWeight: number }) => void;
  updateElement: (id: string, patch: ElementPatch) => void;
  handleRectChange: (elementId: string, nextRect: Rect) => void;
  handleDragStateChange: (
    elementId: string,
    isDragging: boolean,
    finalRect?: Rect,
    context?: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => void;
  handleLineChange: (
    elementId: string,
    nextLine: { start: Point; end: Point },
  ) => void;
  handleLineDragStateChange: (
    elementId: string,
    isDragging: boolean,
    nextLine?: { start: Point; end: Point },
    context?: { type: "drag" | "resize" },
  ) => void;
  handleSelectChange: (
    elementId: string,
    isSelected: boolean,
    options?: SelectOptions,
  ) => void;
  openContextMenu: (event: ReactMouseEvent<HTMLElement>, elementId: string) => void;
  onEditingTextIdChange?: (id: string | null) => void;
  deleteElementById: (id: string) => void;
  transformElementRect: (
    elementId: string,
    nextRect: Rect,
    context: { type: "drag" | "resize"; handle?: ResizeHandle },
  ) => Rect;
  setEditingImageId: (id: string | null) => void;
  setEditingShapeTextId: (id: string | null) => void;
  mmToPx: (mm: number) => number;
};

export const useDesignPaperElementRenderer = ({
  elements,
  selectedIds,
  readOnly,
  editingTextId,
  editingImageId,
  editingShapeTextId,
  emotionSlotTextIds,
  shouldShowIndividualBorder,
  getRenderableRect,
  setSideBarMenu,
  setFontPanel,
  updateElement,
  handleRectChange,
  handleDragStateChange,
  handleLineChange,
  handleLineDragStateChange,
  handleSelectChange,
  openContextMenu,
  onEditingTextIdChange,
  deleteElementById,
  transformElementRect,
  setEditingImageId,
  setEditingShapeTextId,
  mmToPx,
}: UseDesignPaperElementRendererParams) => {
  const setSelectedTable = useTableStore((s) => s.setSelectedTable);
  const setSelectedCells = useTableStore((s) => s.setSelectedCells);

  // 선택된 표 요소를 tableStore와 사이드바에 동기화한다.
  // selectedIds 또는 elements가 바뀔 때만 실행해 렌더 중 상태 업데이트를 방지한다.
  const selectedTableElement = useMemo(() => {
    // 단일/다중 선택 모두 허용: 선택된 요소 중 표 타입이 하나라도 있으면 반환
    if (selectedIds.length !== 1) return null;
    const el = elements.find((e) => e.id === selectedIds[0]);
    return el?.type === "table" ? (el as TableElement) : null;
  }, [selectedIds, elements]);

  useEffect(() => {
    if (selectedTableElement) {
      // 표 선택 시 사이드바를 "표" 탭으로 전환하고 tableStore를 최신 데이터로 등록한다.
      setSideBarMenu("table");
      setSelectedTable(selectedTableElement, (patch) => {
        updateElement(selectedTableElement.id, patch);
      });
    } else {
      // 표 선택 해제 시 tableStore를 초기화한다. 사이드바는 TableContent의 useEffect가 닫는다.
      setSelectedTable(null, null);
      setSelectedCells([]);
    }
  }, [selectedTableElement, setSideBarMenu, setSelectedTable, setSelectedCells, updateElement]);

  const instructionGuideText = "목표 어휘에 맞는 이미지를 삽입해보세요.";
  const defaultVocabularyLabel = "목표 어휘";

  const renderTextElement = (element: TextElement) => {
    const isEditing = editingTextId === element.id;
    const isEmotionSlotText = emotionSlotTextIds.has(element.id);
    const forceEditable = isEmotionSlotText && isEditing;
    const locked =
      readOnly ||
      (element.locked && !forceEditable) ||
      (isEmotionSlotText && !isEditing);
    const rect = getRenderableRect(element);
    if (!rect) return null;
    const minFontSize = 12;
    const maxFontSize = 120;
    const clampFontSize = (value: number) =>
      Math.min(maxFontSize, Math.max(minFontSize, value));
    const lineHeight = element.style.lineHeight ?? 1.3;
    const letterSpacing = element.style.letterSpacing ?? 0;
    const fontWeight = normalizeFontWeight(element.style.fontWeight);
    const minTextHeight = element.lockHeight ? rect.height : 1;
    return (
      <TextBox
        key={element.id}
        text={element.text}
        richText={element.richText}
        editable={!readOnly && (!element.locked || forceEditable)}
        rect={rect}
        minWidth={1}
        minHeight={minTextHeight}
        clipOverflow={readOnly && Boolean(element.lockHeight)}
        showChrome={!isEmotionSlotText}
        textClassName="text-headline-42-semibold"
        textStyle={{
          fontSize: `${element.style.fontSize}px`,
          fontWeight,
          fontFamily: element.style.fontFamily,
          fontStyle: element.style.italic ? "italic" : "normal",
          color: element.style.color,
          textDecoration:
            [
              element.style.underline ? "underline" : null,
              element.style.strikethrough ? "line-through" : null,
            ]
              .filter(Boolean)
              .join(" ") || "none",
          lineHeight,
          letterSpacing,
        }}
        textAlign={element.style.alignX}
        textAlignY={element.style.alignY}
        isSelected={shouldShowIndividualBorder(element.id)}
        selectionCount={selectedIds.length}
        isEditing={isEditing}
        locked={locked}
        widthMode={element.widthMode ?? "auto"}
        userResizedWidth={element.userResizedWidth}
        toolbar={buildTextToolbarConfig({
          element,
          fontWeight,
          lineHeight,
          letterSpacing,
          clampFontSize,
          offset: mmToPx(4),
          setSideBarMenu,
          setFontPanel,
          updateElement,
        })}
        onTextChange={(nextText, nextRichText) => {
          updateElement(element.id, { text: nextText, richText: nextRichText });
        }}
        onRectChange={
          isEmotionSlotText
            ? undefined
            : (nextRect) => {
                handleRectChange(element.id, nextRect);
              }
        }
        onWidthModeChange={(mode) => {
          updateElement(element.id, { widthMode: mode });
        }}
        onDragStateChange={(isDragging, finalRect, context) => {
          handleDragStateChange(element.id, isDragging, finalRect, context);
        }}
        onSelectChange={(isSelected, options) => {
          handleSelectChange(element.id, isSelected, options);
        }}
        onContextMenu={(event) => {
          openContextMenu(event, element.id);
        }}
        onStartEditing={() => onEditingTextIdChange?.(element.id)}
        onFinishEditing={() => onEditingTextIdChange?.(null)}
        onRequestDelete={() => {
          deleteElementById(element.id);
        }}
        transformRect={(nextRect, context) =>
          transformElementRect(element.id, nextRect, context)
        }
      />
    );
  };

  const renderShapeElement = (element: ShapeElement) => {
    const rect = getRenderableRect(element);
    if (!rect) return null;
    const isSelected = selectedIds.includes(element.id);
    const radius =
      element.type === "ellipse"
        ? Math.min(rect.width, rect.height) / 2
        : (element.radius ?? 0);
    const isImageFill =
      element.fill.startsWith("url(") || element.fill.startsWith("data:");
    const isImageEditing =
      isImageFill && editingImageId === element.id && isSelected;
    const imageBox = element.imageBox;
    const linkedLabelText =
      element.labelId
        ? elements.find(
            (candidate): candidate is TextElement =>
              candidate.id === element.labelId && candidate.type === "text",
          )?.text ?? ""
        : "";
    const hasVocabularyInput =
      linkedLabelText.trim().length > 0 &&
      linkedLabelText.trim() !== defaultVocabularyLabel;
    const shapeText =
      element.text === instructionGuideText && hasVocabularyInput
        ? ""
        : element.text;

    const ShapeComponent = element.type === "ellipse" ? CircleBox : RoundBox;
    const handleImageBoxChange =
      readOnly || element.locked || !isImageFill
        ? undefined
        : (value: { x: number; y: number; w: number; h: number }) => {
            updateElement(element.id, { imageBox: value });
          };

    const isShapeTextEditing = editingShapeTextId === element.id;

    const getLatestTransform = () => {
      // 회전/반전 액션은 최신 변환값을 기준으로 누적해야 역방향 점프가 생기지 않는다.
      const latest = elements.find((el) => el.id === element.id) ?? element;
      return "transform" in latest ? (latest.transform ?? {}) : {};
    };
    const transformCtx = {
      elementId: element.id,
      readOnly: !!readOnly,
      locked: !!element.locked,
      getTransform: getLatestTransform,
      updateElement,
    };
    const handleFlipX = createFlipXHandler(transformCtx);
    const handleFlipY = createFlipYHandler(transformCtx);
    const handleRotateCW = createRotateCWHandler(transformCtx);
    const handleRotateCCW = createRotateCCWHandler(transformCtx);

    return (
      <ShapeComponent
        key={element.id}
        className={isImageEditing ? "z-20" : ""}
        rect={rect}
        minWidth={1}
        minHeight={1}
        borderRadius={radius}
        fill={element.fill}
        imageBox={imageBox}
        border={element.border}
        // 카드 라벨(목표 어휘)이 입력되면 안내 문구를 즉시 숨겨 실제 작업 영역에 집중하게 한다.
        text={shapeText}
        textStyle={element.textStyle}
        isSelected={shouldShowIndividualBorder(element.id)}
        selectionCount={selectedIds.length}
        isImageEditing={isImageEditing}
        isTextEditing={isShapeTextEditing}
        locked={readOnly || element.locked}
        selectable={element.selectable !== false && !element.locked}
        onImageEditingChange={(isEditing: boolean) => {
          setEditingImageId(isEditing ? element.id : null);
        }}
        onTextEditingChange={(isEditing: boolean) => {
          setEditingShapeTextId(isEditing ? element.id : null);
        }}
        onTextChange={(text: string) => {
          updateElement(element.id, { text });
        }}
        onImageBoxChange={handleImageBoxChange}
        onImageDrop={
          readOnly || element.locked
            ? undefined
            : (imageUrl) => {
                updateElement(element.id, {
                  fill: imageUrl.startsWith("url(")
                    ? imageUrl
                    : `url(${imageUrl})`,
                  imageBox: {
                    x: 0,
                    y: 0,
                    w: rect.width,
                    h: rect.height,
                  },
                });
              }
        }
        onRectChange={(nextRect) => {
          handleRectChange(element.id, nextRect);
        }}
        onDragStateChange={(isDragging, finalRect, context) => {
          handleDragStateChange(element.id, isDragging, finalRect, context);
        }}
        onSelectChange={(isSelected, options) => {
          handleSelectChange(element.id, isSelected, options);
        }}
        onContextMenu={(event) => {
          openContextMenu(event, element.id);
        }}
        transformRect={(nextRect, context) =>
          transformElementRect(element.id, nextRect, context)
        }
        transform={element.transform}
        onFlipX={handleFlipX}
        onFlipY={handleFlipY}
        onRotateCW={handleRotateCW}
        onRotateCCW={handleRotateCCW}
        onRotationChange={undefined}
        showInlineMetrics={false}
      />
    );
  };

  const renderLineElement = (element: LineElement) => {
    const stroke = element.stroke ?? DEFAULT_STROKE;

    const lineTransformCtx = {
      elementId: element.id,
      readOnly: !!readOnly,
      locked: !!element.locked,
      getTransform: () => element.transform ?? {},
      updateElement,
    };
    const handleFlipX = createFlipXHandler(lineTransformCtx);
    const handleFlipY = createFlipYHandler(lineTransformCtx);
    const handleRotateCW = createRotateCWHandler(lineTransformCtx);
    const handleRotateCCW = createRotateCCWHandler(lineTransformCtx);

    const sharedProps = {
      id: element.id,
      start: element.start,
      end: element.end,
      stroke,
      isSelected: shouldShowIndividualBorder(element.id),
      selectionCount: selectedIds.length,
      locked: readOnly || element.locked,
      onLineChange: (nextLine: { start: Point; end: Point }) => {
        handleLineChange(element.id, nextLine);
      },
      onDragStateChange: (
        isDragging: boolean,
        nextLine?: { start: Point; end: Point },
        context?: { type: "drag" | "resize" },
      ) => {
        handleLineDragStateChange(element.id, isDragging, nextLine, context);
      },
      onSelectChange: (
        isSelected: boolean,
        options?: { keepContextMenu?: boolean; additive?: boolean },
      ) => {
        handleSelectChange(element.id, isSelected, options);
      },
      onContextMenu: (event: ReactMouseEvent<HTMLElement>) => {
        openContextMenu(event, element.id);
      },
      transform: element.transform,
      onFlipX: handleFlipX,
      onFlipY: handleFlipY,
      onRotateCW: handleRotateCW,
      onRotateCCW: handleRotateCCW,
    };
    // 선/화살표는 동일 인터랙션 계약을 공유하므로 공통 속성을 재사용한다.
    return element.type === "line" ? (
      <Line key={element.id} {...sharedProps} />
    ) : (
      <Arrow key={element.id} {...sharedProps} />
    );
  };

  const renderTableElement = (element: TableElement) => {
    const isSelected = shouldShowIndividualBorder(element.id);
    return (
      <TableBox
        key={element.id}
        element={element}
        isSelected={isSelected}
        selectionCount={selectedIds.length}
        locked={readOnly || !!element.locked}
        onRectChange={(nextRect) => {
          handleRectChange(element.id, nextRect);
        }}
        onDragStateChange={(isDragging, finalRect, context) => {
          handleDragStateChange(element.id, isDragging, finalRect, context);
        }}
        onSelectChange={(selected, options) => {
          // 사이드바 전환과 tableStore 동기화는 useEffect(selectedTableElement)에서 처리한다.
          handleSelectChange(element.id, selected, options);
        }}
        onContextMenu={(event) => {
          openContextMenu(event, element.id);
        }}
        onCellTextChange={(rowIndex, colIndex, text) => {
          const newCells = element.cells.map((row, rIdx) =>
            row.map((cell, cIdx) =>
              rIdx === rowIndex && cIdx === colIndex ? { ...cell, text } : cell,
            ),
          );
          updateElement(element.id, { cells: newCells });
        }}
        onColWidthsChange={(colWidths) => {
          updateElement(element.id, { colWidths });
        }}
        onRowHeightsChange={(rowHeights) => {
          updateElement(element.id, { rowHeights });
        }}
        transformRect={(nextRect, context) =>
          transformElementRect(element.id, nextRect, context)
        }
      />
    );
  };

  const renderElement = (element: CanvasElement) => {
    if (element.visible === false) return null;
    switch (element.type) {
      case "text":
        return renderTextElement(element);
      case "rect":
      case "roundRect":
      case "ellipse":
        return renderShapeElement(element);
      case "line":
      case "arrow":
        return renderLineElement(element);
      case "table":
        return renderTableElement(element);
      default:
        return null;
    }
  };

  return { renderElement };
};
