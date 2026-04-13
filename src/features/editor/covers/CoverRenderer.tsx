/**
 * 표지 커버를 렌더링하는 순수 프레젠테이션 컴포넌트.
 * DesignPaper 내부에서 coverData가 있을 때 elements 대신 렌더링된다.
 */
import { memo } from "react";
import type { CoverData } from "./coverTypes";
import { getCoverTemplate } from "./coverTemplateRegistry";

interface CoverRendererProps {
  coverData: CoverData;
  pageWidth: number;
  pageHeight: number;
}

const CoverRenderer = memo(({ coverData, pageWidth, pageHeight }: CoverRendererProps) => {
  const template = getCoverTemplate(coverData.templateId);
  if (!template) return null;

  const { layout, palette } = template;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: pageWidth,
        height: pageHeight,
        backgroundColor: palette.bg,
        overflow: "hidden",
      }}
    >
      {/* SVG 장식 레이어 */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {layout.renderDecorations(palette)}
      </div>
    </div>
  );
});

CoverRenderer.displayName = "CoverRenderer";

export default CoverRenderer;
