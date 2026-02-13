/**
 * 원형 도형 요소를 렌더링하고 선택/드래그/변형 상호작용을 연결하는 컴포넌트.
 */
import type { ComponentProps } from "react";
import RoundBox from "../round_box/RoundBox";

type CircleBoxProps = ComponentProps<typeof RoundBox>;

const CircleBox = ({ rect, ...props }: CircleBoxProps) => (
  <RoundBox rect={rect} {...props} borderRadius="50%" />
);

export default CircleBox;
