import { lazy, Suspense, type Dispatch, type SetStateAction } from "react";
import SquareToolBar from "./template_component/round_box/SquareToolBar";
import ArrowToolBar from "./template_component/arrow/ArrowToolBar";
import LineToolBar from "./template_component/line/LineToolBar";
import type {
  CanvasElement,
  LineElement,
  ShapeElement,
} from "../../model/canvasTypes";
import type { Page } from "../../model/pageTypes";
import type { AacLabelPosition } from "../../utils/aacBoardUtils";

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
  const updateSelectedPageElement = (
    elementId: string,
    updater: (element: CanvasElement) => CanvasElement,
  ) => {
    setPages((prevPages) =>
      prevPages.map((page) =>
        page.id === selectedPageId
          ? {
              ...page,
              elements: page.elements.map((el) =>
                el.id === elementId ? updater(el) : el,
              ),
            }
          : page,
      ),
    );
  };

  const updateSelectedLines = (
    updater: (element: LineElement) => Partial<LineElement>,
  ) => {
    setPages((prevPages) =>
      prevPages.map((page) =>
        page.id === selectedPageId
          ? {
              ...page,
              elements: page.elements.map((el) => {
                if (
                  selectedIds.includes(el.id) &&
                  (el.type === "line" || el.type === "arrow") &&
                  !el.locked
                ) {
                  return { ...el, ...updater(el) };
                }
                return el;
              }),
            }
          : page,
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
