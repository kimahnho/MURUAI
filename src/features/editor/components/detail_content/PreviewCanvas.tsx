import type { CanvasElement } from "../../model/canvasTypes";
import type { PreviewMetrics } from "./previewMetrics";
import DesignPaper from "../DesignPaper";

interface PreviewCanvasProps {
  pageId: string;
  orientation: "vertical" | "horizontal";
  elements: CanvasElement[];
  metrics: PreviewMetrics;
}

const PreviewCanvas = ({
  pageId,
  orientation,
  elements,
  metrics,
}: PreviewCanvasProps) => (
  <div className="flex items-center justify-center rounded-xl border border-black-25 bg-black-5 px-4 py-5">
    <div
      className="relative flex items-center justify-center"
      style={{
        width: `${metrics.boxWidth}px`,
        height: `${metrics.boxHeight}px`,
      }}
    >
      <div
        className="relative overflow-hidden rounded-lg border border-black-25 bg-white-100"
        style={{
          width: `${metrics.scaledWidth}px`,
          height: `${metrics.scaledHeight}px`,
        }}
      >
        <div
          style={{
            width: `${metrics.baseWidth}px`,
            height: `${metrics.baseHeight}px`,
            transform: `scale(${metrics.scale})`,
            transformOrigin: "top left",
            pointerEvents: "none",
          }}
        >
          <DesignPaper
            pageId={pageId}
            orientation={orientation}
            elements={elements}
            selectedIds={[]}
            editingTextId={null}
            readOnly
          />
        </div>
      </div>
    </div>
  </div>
);

export default PreviewCanvas;
