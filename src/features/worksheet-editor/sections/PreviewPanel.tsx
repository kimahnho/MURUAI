/** 중앙 A4 미리보기 패널 — 210mm 실제 렌더 + CSS scale 축소 */
import { useEffect, useRef, useState } from "react";

import { useWorksheetStore } from "../store/worksheetStore";
import type {
  WorksheetComponent,
  HeaderInstructionConfig,
  ArrowTransformConfig,

  SelectionSentenceConfig,
  GridConfig,
  RewardTrackerConfig,
  ChecklistTableConfig,
  InfoGuideConfig,
  OutlineTitleConfig,
  WritingPracticeConfig,
  ColoringAreaConfig,
  CalendarConfig,
  MindMapConfig,
} from "../model/types";
import {
  MiniHeader,
  MiniArrowTransform,

  MiniSelectionSentence,
  MiniRewardTracker,
  MiniGrid,
  MiniChecklist,
  MiniInfoGuide,
  MiniOutlineTitle,
  MiniWritingPractice,
  MiniColoringArea,
  MiniCalendar,
  MiniMindMap,
} from "../preview/MiniComponents";

const renderMini = (comp: WorksheetComponent) => {
  switch (comp.type) {
    case "header_instruction":
      return <MiniHeader config={comp.config as HeaderInstructionConfig} />;
    case "arrow_transform":
      return <MiniArrowTransform config={comp.config as ArrowTransformConfig} />;

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
    case "calendar":
      return <MiniCalendar config={comp.config as CalendarConfig} />;
    case "mind_map":
      return <MiniMindMap config={comp.config as MindMapConfig} />;
    default:
      return null;
  }
};

const PreviewPanel = () => {
  const components = useWorksheetStore((s) => s.components);
  const activeIndex = useWorksheetStore((s) => s.activeIndex);
  const updateConfig = useWorksheetStore((s) => s.updateConfig);
  const wrapRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  // wrapper 실제 픽셀 너비 ÷ scaler 실제 픽셀 너비 = scale
  useEffect(() => {
    const wrap = wrapRef.current;
    const scaler = scalerRef.current;
    if (!wrap || !scaler) return;

    const update = () => {
      const wrapW = wrap.clientWidth;
      const scalerW = scaler.scrollWidth;
      if (scalerW > 0) {
        setScale(wrapW / scalerW);
      }
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // 마인드맵 노드 드래그 시 config.nodes 업데이트
  const handleMindMapNodeMove = (compIndex: number, nodeId: string, x: number, y: number) => {
    updateConfig<MindMapConfig>(compIndex, (prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, position: { x, y } } : n)),
    }));
  };

  const renderMiniWithInteraction = (comp: WorksheetComponent, index: number) => {
    if (comp.type === "mind_map") {
      return (
        <MiniMindMap
          config={comp.config as MindMapConfig}
          onNodeMove={(nodeId, x, y) => handleMindMapNodeMove(index, nodeId, x, y)}
        />
      );
    }
    return renderMini(comp);
  };

  const previewContent = components.map((comp, i) => (
    <div key={comp.id} className={`ws-comp ${i === activeIndex ? "ws-active" : ""}`}>
      {renderMiniWithInteraction(comp, i)}
    </div>
  ));

  return (
    <div className="flex-1 bg-black-25 overflow-y-auto p-5 flex flex-col items-center print:bg-white-100 print:p-0 print:block print:w-full">
      <div className="text-[11px] text-black-55 uppercase tracking-wide mb-3 flex items-center gap-1.5 self-start print:hidden">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
        실시간 미리보기
      </div>
      {/* wrapper: CSS aspect-ratio로 A4 비율 보장, overflow:hidden으로 클리핑 */}
      <div ref={wrapRef} className="ws-a4-wrapper">
        {/* scaler: 210mm(실제 A4 너비)로 렌더 → scale()로 wrapper에 맞춤 */}
        <div
          ref={scalerRef}
          className="ws-a4-scaler"
          style={{
            transform: scale > 0 ? `scale(${scale})` : "scale(0.5)",
            transformOrigin: "top left",
          }}
        >
          {components.length === 0 ? (
            <div className="ws-a4-empty">
              컴포넌트를 추가하면
              <br />
              여기에 미리보기가 표시됩니다
            </div>
          ) : (
            previewContent
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
