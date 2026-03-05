/**
 * 요소 레이어(z-index) 이동 버튼을 제공하는 공통 패널 컴포넌트.
 */
import {
  ArrowUpFromLine,
  ArrowUpToLine,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import type { LayerDirection } from "@/features/editor/utils/layerUtils";

const LAYER_ITEMS: Array<{
  direction: LayerDirection;
  label: string;
  Icon: typeof ArrowUpFromLine;
}> = [
  { direction: "forward", label: "앞으로 가져오기", Icon: ArrowUpFromLine },
  { direction: "front", label: "맨 앞으로 가져오기", Icon: ChevronsUp },
  { direction: "backward", label: "뒤로 보내기", Icon: ArrowUpToLine },
  { direction: "back", label: "맨 뒤로 보내기", Icon: ChevronsDown },
];

interface LayerPanelProps {
  onMoveLayer: (direction: LayerDirection) => void;
}

const LayerPanel = ({ onMoveLayer }: LayerPanelProps) => (
  <div className="flex flex-col gap-2">
    <div className="text-14-semibold text-black-90">레이어</div>
    <div className="flex flex-wrap gap-1">
      {LAYER_ITEMS.map(({ direction, label, Icon }) => (
        <button
          key={direction}
          type="button"
          onClick={() => onMoveLayer(direction)}
          className="flex items-center gap-2 rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-90 hover:bg-black-5"
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  </div>
);

export default LayerPanel;
