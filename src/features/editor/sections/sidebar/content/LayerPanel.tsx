/**
 * 요소 레이어(z-index) 이동 버튼을 제공하는 공통 패널 컴포넌트.
 */
import {
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
} from "lucide-react";
import { mp } from "@/shared/utils/mixpanel";
import type { LayerDirection } from "@/features/editor/utils/layerUtils";

const LAYER_ITEMS: Array<{
  direction: LayerDirection;
  label: string;
  Icon: typeof ArrowUp;
}> = [
  { direction: "front", label: "맨 앞", Icon: ChevronsUp },
  { direction: "forward", label: "앞으로", Icon: ArrowUp },
  { direction: "backward", label: "뒤로", Icon: ArrowDown },
  { direction: "back", label: "맨 뒤", Icon: ChevronsDown },
];

interface LayerPanelProps {
  onMoveLayer: (direction: LayerDirection) => void;
}

const LayerPanel = ({ onMoveLayer }: LayerPanelProps) => (
  <div className="flex flex-col gap-2">
    <div className="text-14-semibold text-black-90">레이어</div>
    <div className="grid grid-cols-4 gap-1">
      {LAYER_ITEMS.map(({ direction, label, Icon }) => (
        <button
          key={direction}
          type="button"
          onClick={() => { onMoveLayer(direction); mp.track("레이어 순서 변경"); }}
          className="flex flex-col items-center justify-center gap-1 rounded-lg border border-black-30 py-2 text-black-70 transition hover:border-primary hover:text-primary hover:bg-primary-50 cursor-pointer"
          title={label}
        >
          <Icon className="h-4 w-4" />
          <span className="text-12-regular">{label}</span>
        </button>
      ))}
    </div>
  </div>
);

export default LayerPanel;
