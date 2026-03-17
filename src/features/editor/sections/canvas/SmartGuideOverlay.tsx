/**
 * 요소 이동/리사이즈 중 스냅 가이드와 정렬 포인트를 표시하는 오버레이 컴포넌트.
 * edge/center 정렬선 + spacing 간격 표시선을 렌더링한다.
 */
import type { AlignmentGuide } from "../../model/useSmartGuides";

interface SmartGuideOverlayProps {
  guides: AlignmentGuide[];
}

const MARKER_SIZE = 5;

// spacing 간격 표시: 간격 선 + 양쪽 T자 마커 + 갭 숫자 라벨
const SpacingGuide = ({ guide }: { guide: AlignmentGuide }) => {
  const { spacing } = guide;
  if (!spacing) return null;

  const isHorizontal = guide.orientation === "horizontal";
  const { gapStart, gapEnd, crossCenter } = spacing;
  const gapLength = gapEnd - gapStart;
  if (gapLength < 1) return null;

  const gapLabel = Math.round(gapLength);
  const labelMid = (gapStart + gapEnd) / 2;

  return (
    <>
      {/* 간격 선 */}
      <div
        style={{
          position: "absolute",
          left: isHorizontal ? gapStart : crossCenter - 0.5,
          top: isHorizontal ? crossCenter - 0.5 : gapStart,
          width: isHorizontal ? gapLength : 1,
          height: isHorizontal ? 1 : gapLength,
          backgroundColor: "#ff0000",
          zIndex: 20,
          pointerEvents: "none",
        }}
      />
      {/* 시작 마커 (T자) */}
      <div
        style={{
          position: "absolute",
          left: isHorizontal
            ? gapStart
            : crossCenter - MARKER_SIZE / 2,
          top: isHorizontal
            ? crossCenter - MARKER_SIZE / 2
            : gapStart,
          width: isHorizontal ? 1 : MARKER_SIZE,
          height: isHorizontal ? MARKER_SIZE : 1,
          backgroundColor: "#ff0000",
          zIndex: 20,
          pointerEvents: "none",
        }}
      />
      {/* 끝 마커 (T자) */}
      <div
        style={{
          position: "absolute",
          left: isHorizontal
            ? gapEnd - 1
            : crossCenter - MARKER_SIZE / 2,
          top: isHorizontal
            ? crossCenter - MARKER_SIZE / 2
            : gapEnd - 1,
          width: isHorizontal ? 1 : MARKER_SIZE,
          height: isHorizontal ? MARKER_SIZE : 1,
          backgroundColor: "#ff0000",
          zIndex: 20,
          pointerEvents: "none",
        }}
      />
      {/* 갭 숫자 라벨 */}
      <div
        style={{
          position: "absolute",
          left: isHorizontal ? labelMid : crossCenter,
          top: isHorizontal ? crossCenter : labelMid,
          transform: "translate(-50%, -50%)",
          backgroundColor: "#ff0000",
          color: "#ffffff",
          fontSize: 10,
          lineHeight: 1,
          padding: "1px 3px",
          borderRadius: 2,
          whiteSpace: "nowrap",
          zIndex: 21,
          pointerEvents: "none",
          marginTop: isHorizontal ? -9 : 0,
          marginLeft: isHorizontal ? 0 : 9,
        }}
      >
        {gapLabel}
      </div>
    </>
  );
};

const SmartGuideOverlay = ({ guides }: SmartGuideOverlayProps) => {
  return (
    <>
      {guides.map((guide) => {
        // spacing 가이드: 간격 표시선 + T자 마커
        if (guide.reason === "spacing" && guide.spacing) {
          return <SpacingGuide key={guide.id} guide={guide} />;
        }

        // edge/center 가이드: 기존 1px 정렬선
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
