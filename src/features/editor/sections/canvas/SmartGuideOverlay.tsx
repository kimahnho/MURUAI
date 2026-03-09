/**
 * 요소 이동/리사이즈 중 스냅 가이드와 정렬 포인트를 표시하는 오버레이 컴포넌트.
 */
import type { AlignmentGuide } from "../../model/useSmartGuides";

interface SmartGuideOverlayProps {
  guides: AlignmentGuide[];
}

const SmartGuideOverlay = ({ guides }: SmartGuideOverlayProps) => {
  return (
    <>
      {guides.map((guide) => {
        const isVertical = guide.orientation === "vertical";
        return (
          <div
            key={guide.id}
            style={{
              position: "absolute",
              left: isVertical ? guide.position : guide.start,
              top: isVertical ? guide.start : guide.position,
              width: isVertical ? 1 : guide.end - guide.start,
              height: isVertical ? guide.end - guide.start : 1,
              backgroundColor: "#ff0000",
              zIndex: 20,
              pointerEvents: "none",
            }}
          />
        );
      })}
    </>
  );
};

export default SmartGuideOverlay;
