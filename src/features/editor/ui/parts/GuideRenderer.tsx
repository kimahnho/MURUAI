import type { GuideLine } from "../../hooks/useSnapGuides";

type GuideRendererProps = {
  guides: GuideLine[];
};

const GUIDE_COLOR = "#9013FE";

export function GuideRenderer({ guides }: GuideRendererProps) {
  if (guides.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {guides.map((guide, index) => {
        if (guide.type === "vertical") {
          return (
            <div
              key={`v-${index}-${guide.pos}-${guide.start}-${guide.end}`}
              style={{
                position: "absolute",
                left: guide.pos,
                top: guide.start,
                width: 1,
                height: Math.max(0, guide.end - guide.start),
                backgroundColor: GUIDE_COLOR,
              }}
            />
          );
        }

        return (
          <div
            key={`h-${index}-${guide.pos}-${guide.start}-${guide.end}`}
            style={{
              position: "absolute",
              left: guide.start,
              top: guide.pos,
              width: Math.max(0, guide.end - guide.start),
              height: 1,
              backgroundColor: GUIDE_COLOR,
            }}
          />
        );
      })}
    </div>
  );
}
