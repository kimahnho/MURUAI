/**
 * 원형 프라이버시 블러 요소: MosaicBox를 래핑하고 borderRadius 50%로 원형을 만든다.
 */
import type { ComponentProps } from "react";
import MosaicBox from "./MosaicBox";

type CircleMosaicBoxProps = ComponentProps<typeof MosaicBox>;

const CircleMosaicBox = ({ rect, ...props }: CircleMosaicBoxProps) => (
  <MosaicBox rect={rect} {...props} borderRadius="50%" />
);

export default CircleMosaicBox;
