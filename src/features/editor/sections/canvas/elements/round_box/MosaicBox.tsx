/**
 * 프라이버시 블러 요소: RoundBox를 래핑하고 backdrop-filter로 뒤 콘텐츠를 흐리게 가린다.
 * mosaicLevel(1~20)이 블러 강도(px)를 결정한다.
 */
import type { ComponentProps } from "react";
import RoundBox from "./RoundBox";

type MosaicBoxProps = ComponentProps<typeof RoundBox> & {
  mosaicLevel?: number;
};

const MosaicBox = ({ mosaicLevel = 8, ...rest }: MosaicBoxProps) => {
  const blurPx = mosaicLevel * 2;

  return (
    <RoundBox {...rest} fill="transparent">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: rest.borderRadius,
          backdropFilter: `blur(${blurPx}px)`,
          WebkitBackdropFilter: `blur(${blurPx}px)`,
          backgroundColor: "rgba(200, 200, 200, 0.3)",
        }}
      />
    </RoundBox>
  );
};

export default MosaicBox;
