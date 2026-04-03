/** 중앙 A4 미리보기 패널 — 자동 스케일링 */
import { useEffect, useRef } from "react";

import { useWorksheetStore } from "../store/worksheetStore";
import type {
  WorksheetComponent,
  HeaderInstructionConfig,
  ArrowTransformConfig,
  SequentialRepeatConfig,
  SelectionSentenceConfig,
  GridConfig,
  RewardTrackerConfig,
  ChecklistTableConfig,
  InfoGuideConfig,
  OutlineTitleConfig,
  WritingPracticeConfig,
  ColoringAreaConfig,
} from "../model/types";
import {
  MiniHeader,
  MiniArrowTransform,
  MiniSequentialRepeat,
  MiniSelectionSentence,
  MiniRewardTracker,
  MiniGrid,
  MiniChecklist,
  MiniInfoGuide,
  MiniOutlineTitle,
  MiniWritingPractice,
  MiniColoringArea,
} from "../preview/MiniComponents";

const renderMini = (comp: WorksheetComponent) => {
  switch (comp.type) {
    case "header_instruction":
      return <MiniHeader config={comp.config as HeaderInstructionConfig} />;
    case "arrow_transform":
      return <MiniArrowTransform config={comp.config as ArrowTransformConfig} />;
    case "sequential_repeat":
      return <MiniSequentialRepeat config={comp.config as SequentialRepeatConfig} />;
    case "selection_sentence":
      return <MiniSelectionSentence config={comp.config as SelectionSentenceConfig} />;
    case "grid_NxM":
      return <MiniGrid config={comp.config as GridConfig} />;
    case "reward_tracker":
      return <MiniRewardTracker config={comp.config as RewardTrackerConfig} />;
    case "checklist_table":
      return <MiniChecklist config={comp.config as ChecklistTableConfig} />;
    case "info_guide":
      return <MiniInfoGuide config={comp.config as InfoGuideConfig} />;
    case "outline_title":
      return <MiniOutlineTitle config={comp.config as OutlineTitleConfig} />;
    case "writing_practice":
      return <MiniWritingPractice config={comp.config as WritingPracticeConfig} />;
    case "coloring_area":
      return <MiniColoringArea config={comp.config as ColoringAreaConfig} />;
    default:
      return null;
  }
};

const PreviewPanel = () => {
  const components = useWorksheetStore((s) => s.components);
  const activeIndex = useWorksheetStore((s) => s.activeIndex);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);

  // Auto-scale content to fit A4
  useEffect(() => {
    const timer = setTimeout(() => {
      const wrap = wrapRef.current;
      const sc = scalerRef.current;
      if (!wrap || !sc) return;

      const wrapW = wrap.clientWidth;
      const a4H = wrapW * (297 / 210);

      sc.style.transform = "none";
      sc.style.width = "100%";
      void sc.offsetHeight; // force reflow

      const cH = sc.scrollHeight;
      if (cH > a4H) {
        const r = a4H / cH;
        sc.style.transform = `scale(${r})`;
        sc.style.transformOrigin = "top left";
        sc.style.width = `${100 / r}%`;
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [components, activeIndex]);

  if (components.length === 0) {
    return (
      <div className="flex-1 bg-black-25 overflow-y-auto p-5 flex flex-col items-center print:bg-white-100 print:p-0 print:block print:w-full">
        <div className="text-[11px] text-black-55 uppercase tracking-wide mb-3 flex items-center gap-1.5 self-start print:hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          실시간 미리보기
        </div>
        <div className="ws-a4-wrapper" ref={wrapRef}>
          <div className="ws-a4-scaler" ref={scalerRef}>
            <div className="ws-a4-empty">
              컴포넌트를 추가하면
              <br />
              여기에 미리보기가 표시됩니다
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-black-25 overflow-y-auto p-5 flex flex-col items-center print:bg-white-100 print:p-0 print:block print:w-full">
      <div className="text-[11px] text-black-55 uppercase tracking-wide mb-3 flex items-center gap-1.5 self-start print:hidden">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        실시간 미리보기
      </div>
      <div className="ws-a4-wrapper" ref={wrapRef}>
        <div className="ws-a4-scaler" ref={scalerRef}>
          {components.map((comp, i) => (
            <div key={comp.id} className={`ws-comp ${i === activeIndex ? "ws-active" : ""}`}>
              {renderMini(comp)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
