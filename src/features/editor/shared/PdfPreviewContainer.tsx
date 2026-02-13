/**
 * PDF 미리보기 렌더링 영역과 로딩 상태를 제공하는 컴포넌트.
 */
import DesignPaper from "../sections/canvas/DesignPaper";
import { normalizeOrientationValue } from "../utils/orientationUtils";
import type { Page } from "../model/pageTypes";

type PdfPreviewContainerProps = {
  pages: Page[];
  fallbackOrientation: "horizontal" | "vertical";
};

const PdfPreviewContainer = ({
  pages,
  fallbackOrientation,
}: PdfPreviewContainerProps) => (
  <div
    className="fixed pointer-events-none"
    style={{
      top: "-999999px",
      left: "-999999px",
      zIndex: -9999,
      position: "fixed",
    }}
    aria-hidden="true"
  >
    {pages.map((page) => {
      const normalizedOrientation = normalizeOrientationValue(
        page.orientation,
        fallbackOrientation
      );
      return (
        <div
          key={`pdf-${page.id}`}
          className="pdf-page"
          data-orientation={normalizedOrientation}
          data-page-id={page.id}
          style={{ display: "inline-block" }}
        >
          <DesignPaper
            pageId={`pdf-${page.id}`}
            orientation={normalizedOrientation}
            elements={page.elements}
            selectedIds={[]}
            editingTextId={null}
            readOnly
          />
        </div>
      );
    })}
  </div>
);

export default PdfPreviewContainer;
