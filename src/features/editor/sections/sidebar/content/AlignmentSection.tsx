/**
 * 다중 선택 시 요소 정렬/분배 버튼을 표시하는 공용 섹션.
 * ShapePropsContent, MultiPropsContent 등 여러 패널에서 사용한다.
 */
import {
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  AlignStartVertical,
  AlignCenterHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
} from "lucide-react";
import { useElementPanelStore } from "@/features/editor/store/elementPanelStore";

const AlignmentSection = () => {
  const ac = useElementPanelStore((s) => s.alignmentCallbacks);
  if (!ac) return null;

  return (
    <>
      {/* 위치 (정렬) */}
      {ac.canAlign && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">정렬</div>
          <div className="flex gap-1">
            {[
              { Icon: AlignStartVertical, onClick: ac.onAlignLeft, label: "왼쪽 정렬" },
              { Icon: AlignCenterVertical, onClick: ac.onAlignCenterH, label: "가운데 정렬" },
              { Icon: AlignEndVertical, onClick: ac.onAlignRight, label: "오른쪽 정렬" },
            ].map(({ Icon, onClick, label }) => (
              <button key={label} type="button" onClick={onClick} title={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary">
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <div className="w-2" />
            {[
              { Icon: AlignStartHorizontal, onClick: ac.onAlignTop, label: "상단 정렬" },
              { Icon: AlignCenterHorizontal, onClick: ac.onAlignCenterV, label: "중간 정렬" },
              { Icon: AlignEndHorizontal, onClick: ac.onAlignBottom, label: "하단 정렬" },
            ].map(({ Icon, onClick, label }) => (
              <button key={label} type="button" onClick={onClick} title={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-30 text-black-70 hover:border-primary hover:text-primary">
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 간격 분배 */}
      {ac.canDistribute && (
        <div className="flex flex-col gap-2">
          <div className="text-14-semibold text-black-90">간격 동일하게</div>
          <div className="flex gap-2">
            <button type="button" onClick={ac.onDistributeHorizontal} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-70 hover:border-primary hover:text-primary">
              <AlignHorizontalSpaceAround className="h-4 w-4" />
              가로
            </button>
            <button type="button" onClick={ac.onDistributeVertical} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black-30 px-3 py-2 text-14-regular text-black-70 hover:border-primary hover:text-primary">
              <AlignVerticalSpaceAround className="h-4 w-4" />
              세로
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AlignmentSection;
