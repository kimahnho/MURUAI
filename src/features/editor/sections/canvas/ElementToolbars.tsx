import { lazy, Suspense, useState, type Dispatch, type SetStateAction } from "react";
import {
  ArrowUpFromLine,
  ArrowUpToLine,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import SquareToolBar from "./elements/round_box/SquareToolBar";
import ArrowToolBar from "./elements/arrow/ArrowToolBar";
import LineToolBar from "./elements/line/LineToolBar";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
} from "../../model/canvasTypes";
import type { Page } from "../../model/pageTypes";
import type { AacLabelPosition } from "../../utils/aacBoardUtils";
import { updateElementsByPageId } from "../../utils/pageMutation";

const AacToolBar = lazy(() => import("./AacToolBar"));

type BorderStyle = "solid" | "dashed" | "dotted" | "double";

type LineToolbarData = {
  element: LineElement;
  stroke: { color: string; width: number };
  length: number;
  angle: number;
};

type ShapeToolbarData = {
  element: ShapeElement;
  rect: { x: number; y: number; width: number; height: number };
  radius: number;
  minRadius: number;
  maxRadius: number;
  clampRadius: (value: number) => number;
  colorValue: string;
  borderEnabled: boolean;
  borderColor: string;
  borderWidth: number;
  borderStyle: BorderStyle;
};

type AacToolbarData = {
  labelPosition: AacLabelPosition;
  cardCount: number;
};

type LayerDirection = "forward" | "front" | "backward" | "back";

type ElementToolbarsProps = {
  shapeToolbarData: ShapeToolbarData | null;
  lineToolbarData: LineToolbarData | null;
  aacToolbarData: AacToolbarData | null;
  selectedIds: string[];
  selectedPageId: string;
  setPages: Dispatch<SetStateAction<Page[]>>;
  onAacLabelPositionChange?: (position: AacLabelPosition) => void;
};

const ElementToolbars = ({
  shapeToolbarData,
  lineToolbarData,
  aacToolbarData,
  selectedIds,
  selectedPageId,
  setPages,
  onAacLabelPositionChange,
}: ElementToolbarsProps) => {
  const moveLayer = (elementId: string, direction: LayerDirection) => {
    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) => {
        const index = elements.findIndex((el) => el.id === elementId);
        if (index === -1) return elements;
        const nextElements = [...elements];
        if (direction === "forward") {
          if (index >= nextElements.length - 1) return elements;
          [nextElements[index], nextElements[index + 1]] = [
            nextElements[index + 1],
            nextElements[index],
          ];
          return nextElements;
        }
        if (direction === "backward") {
          if (index <= 0) return elements;
          [nextElements[index - 1], nextElements[index]] = [
            nextElements[index],
            nextElements[index - 1],
          ];
          return nextElements;
        }
        if (direction === "front") {
          if (index >= nextElements.length - 1) return elements;
          const [target] = nextElements.splice(index, 1);
          nextElements.push(target);
          return nextElements;
        }
        if (index <= 0) return elements;
        const [target] = nextElements.splice(index, 1);
        nextElements.unshift(target);
        return nextElements;
      }),
    );
    setLayerPanelElementId(null);
  };

  const [layerPanelElementId, setLayerPanelElementId] = useState<string | null>(
    null,
  );

  const renderLayerPanelButton = (elementId: string) => {
    const isOpen = layerPanelElementId === elementId;
    return (
      <div className="relative pl-2 border-l border-black-15">
        <button
          type="button"
          onClick={() => {
            setLayerPanelElementId((prev) => (prev === elementId ? null : elementId));
          }}
          className={`flex h-7 items-center justify-center rounded border px-2 text-14-regular ${
            isOpen
              ? "border-primary text-primary bg-primary/10 ring-1 ring-primary/40 shadow-sm"
              : "border-black-30 text-black-70"
          }`}
          aria-label="레이어 설정"
        >
          레이어
        </button>
        {isOpen && (
          <div
            className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-black-25 bg-white-100 p-1 shadow-lg z-50"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={() => moveLayer(elementId, "forward")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              앞으로 가져오기
            </button>
            <button
              type="button"
              onClick={() => moveLayer(elementId, "front")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <ChevronsUp className="h-4 w-4" />
              맨 앞으로 가져오기
            </button>
            <button
              type="button"
              onClick={() => moveLayer(elementId, "backward")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <ArrowUpToLine className="h-4 w-4" />
              뒤로 보내기
            </button>
            <button
              type="button"
              onClick={() => moveLayer(elementId, "back")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
            >
              <ChevronsDown className="h-4 w-4" />
              맨 뒤로 보내기
            </button>
          </div>
        )}
      </div>
    );
  };

  const updateSelectedPageElement = (
    elementId: string,
    updater: (element: CanvasElement) => CanvasElement,
  ) => {
    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) => (el.id === elementId ? updater(el) : el)),
      ),
    );
  };

  const updateSelectedLines = (
    updater: (element: LineElement) => Partial<LineElement>,
  ) => {
    setPages((prevPages) =>
      updateElementsByPageId(prevPages, selectedPageId, (elements) =>
        elements.map((el) => {
          if (
            selectedIds.includes(el.id) &&
            (el.type === "line" || el.type === "arrow") &&
            !el.locked
          ) {
            return { ...el, ...updater(el) };
          }
          return el;
        }),
      ),
    );
  };

  const updateLineByLengthAndAngle = (
    elementId: string,
    newLength: number,
    angleRad: number,
    start: { x: number; y: number },
  ) => {
    const newEnd = {
      x: start.x + newLength * Math.cos(angleRad),
      y: start.y + newLength * Math.sin(angleRad),
    };
    updateSelectedPageElement(elementId, (el) => ({
      ...el,
      end: newEnd,
    }));
  };

  const handleLengthChange = (newLength: number) => {
    if (!lineToolbarData) return;
    const { element, angle } = lineToolbarData;
    const angleRad = (angle * Math.PI) / 180;
    updateLineByLengthAndAngle(element.id, newLength, angleRad, element.start);
  };

  const handleAngleChange = (newAngle: number) => {
    if (!lineToolbarData) return;
    const { element, length } = lineToolbarData;
    const angleRad = (newAngle * Math.PI) / 180;
    updateLineByLengthAndAngle(element.id, length, angleRad, element.start);
  };

  // AAC 카드도 기본 shapeToolbar를 표시하고, 추가로 aacToolbar도 함께 표시
  const showShapeToolbar = !!shapeToolbarData;

  return (
    <>
      {showShapeToolbar && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <div className="flex items-center gap-3">
              <SquareToolBar
                isVisible
                showRadius={shapeToolbarData.element.type !== "ellipse"}
                borderRadius={shapeToolbarData.radius}
                minBorderRadius={shapeToolbarData.minRadius}
                maxBorderRadius={shapeToolbarData.maxRadius}
                color={shapeToolbarData.colorValue}
                borderEnabled={shapeToolbarData.borderEnabled}
                borderColor={shapeToolbarData.borderColor}
                borderWidth={shapeToolbarData.borderWidth}
                borderStyle={shapeToolbarData.borderStyle}
                width={shapeToolbarData.rect.width}
                height={shapeToolbarData.rect.height}
                minWidth={1}
                minHeight={1}
                onBorderRadiusChange={(value: number) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) => ({
                      ...el,
                      radius: shapeToolbarData.clampRadius(value),
                    }),
                  );
                }}
                onBorderRadiusStep={(delta: number) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) => ({
                      ...el,
                      radius: shapeToolbarData.clampRadius(
                        shapeToolbarData.radius + delta,
                      ),
                    }),
                  );
                }}
                onColorChange={(color: string) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) => ({ ...el, fill: color }),
                  );
                }}
                onImageUpload={(imageUrl: string) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) => ({
                      ...el,
                      fill: imageUrl,
                      imageBox: {
                        x: 0,
                        y: 0,
                        w: shapeToolbarData.rect.width,
                        h: shapeToolbarData.rect.height,
                      },
                    }),
                  );
                }}
                onBorderEnabledChange={(enabled: boolean) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) => ({
                      ...el,
                      border: {
                        enabled,
                        color: shapeToolbarData.borderColor,
                        width: shapeToolbarData.borderWidth,
                        style: shapeToolbarData.borderStyle,
                      },
                    }),
                  );
                }}
                onBorderStyleChange={(style: BorderStyle) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) => ({
                      ...el,
                      border: {
                        enabled: true,
                        color: shapeToolbarData.borderColor,
                        width: shapeToolbarData.borderWidth,
                        style,
                      },
                    }),
                  );
                }}
                onBorderColorChange={(color: string) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) =>
                      ({
                        ...el,
                        border: {
                          ...shapeToolbarData.element.border,
                          color,
                          enabled:
                            shapeToolbarData.element.border?.enabled ?? false,
                        },
                      }) as CanvasElement,
                  );
                }}
                onBorderWidthChange={(value: number) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) =>
                      ({
                        ...el,
                        border: {
                          ...shapeToolbarData.element.border,
                          width: value,
                          enabled:
                            shapeToolbarData.element.border?.enabled ?? false,
                        },
                      }) as CanvasElement,
                  );
                }}
                onSizeChange={(width: number, height: number) => {
                  updateSelectedPageElement(
                    shapeToolbarData.element.id,
                    (el) => ({
                      ...el,
                      w: width,
                      h: height,
                    }),
                  );
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              />
              {renderLayerPanelButton(shapeToolbarData.element.id)}
            </div>
          </div>
        </div>
      )}

      {lineToolbarData && lineToolbarData.element.type === "line" && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <div className="flex items-center gap-3">
              <LineToolBar
                isVisible
                color={lineToolbarData.stroke.color}
                width={lineToolbarData.stroke.width}
                style={lineToolbarData.element.stroke.style}
                length={Math.round(lineToolbarData.length)}
                angle={Math.round(lineToolbarData.angle)}
                onColorChange={(color: string) => {
                  updateSelectedLines((el) => ({
                    stroke: {
                      ...el.stroke,
                      color,
                    },
                  }));
                }}
                onWidthChange={(width: number) => {
                  updateSelectedLines((el) => ({
                    stroke: {
                      ...el.stroke,
                      width,
                    },
                  }));
                }}
                onStyleChange={(style: "solid" | "dashed" | "dotted") => {
                  updateSelectedLines((el) => ({
                    stroke: {
                      ...el.stroke,
                      style,
                    },
                  }));
                }}
                onLengthChange={handleLengthChange}
                onAngleChange={handleAngleChange}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              />
              {renderLayerPanelButton(lineToolbarData.element.id)}
            </div>
          </div>
        </div>
      )}

      {lineToolbarData && lineToolbarData.element.type === "arrow" && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <div className="flex items-center gap-3">
              <ArrowToolBar
                isVisible
                color={lineToolbarData.stroke.color}
                width={lineToolbarData.stroke.width}
                style={lineToolbarData.element.stroke.style}
                length={Math.round(lineToolbarData.length)}
                angle={Math.round(lineToolbarData.angle)}
                onColorChange={(color: string) =>
                  updateSelectedLines((el) => ({
                    stroke: {
                      ...el.stroke,
                      color,
                    },
                  }))
                }
                onWidthChange={(width: number) =>
                  updateSelectedLines((el) => ({
                    stroke: {
                      ...el.stroke,
                      width,
                    },
                  }))
                }
                onStyleChange={(style: "solid" | "dashed" | "dotted") =>
                  updateSelectedLines((el) => ({
                    stroke: {
                      ...el.stroke,
                      style,
                    },
                  }))
                }
                onLengthChange={handleLengthChange}
                onAngleChange={handleAngleChange}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              />
              {renderLayerPanelButton(lineToolbarData.element.id)}
            </div>
          </div>
        </div>
      )}

      {aacToolbarData && onAacLabelPositionChange && (
        <div className="absolute top-12 left-0 right-0 z-10 flex items-center justify-center w-full pointer-events-none">
          <div className="w-fit px-3 py-2 bg-white-100 border border-black-25 rounded-lg shadow-lg pointer-events-auto">
            <Suspense fallback={null}>
              <AacToolBar
                isVisible
                labelPosition={aacToolbarData.labelPosition}
                onLabelPositionChange={onAacLabelPositionChange}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
              />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
};

export default ElementToolbars;
