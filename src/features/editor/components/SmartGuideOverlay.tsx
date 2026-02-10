import type { AlignmentGuide } from "../model/useSmartGuides";

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
              left: isVertical ? guide.position : 0,
              top: isVertical ? 0 : guide.position,
              width: isVertical ? 1 : "100%",
              height: isVertical ? "100%" : 1,
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
