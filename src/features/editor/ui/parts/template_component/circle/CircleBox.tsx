import type { ComponentProps } from "react";
import RoundBox from "../round_box/RoundBox";

type CircleBoxProps = ComponentProps<typeof RoundBox>;

const CircleBox = ({ rect, ...props }: CircleBoxProps) => (
  <RoundBox rect={rect} {...props} borderRadius="50%" />
);

export default CircleBox;
