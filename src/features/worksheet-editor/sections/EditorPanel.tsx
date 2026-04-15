/** 오른쪽 속성 편집 패널 */
import { useWorksheetStore } from "../store/worksheetStore";
import { COMPONENT_META } from "../constants/defaults";
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
  MindMapConfig,
  WorksheetConfig,
} from "../model/types";
import {
  HeaderInstructionForm,
  ArrowTransformForm,
  SequentialRepeatForm,
  SelectionSentenceForm,
  GridForm,
  RewardTrackerForm,
  ChecklistTableForm,
  InfoGuideForm,
  OutlineTitleForm,
  WritingPracticeForm,
  ColoringAreaForm,
  MindMapForm,
} from "./forms/EditorForms";

const renderForm = (
  comp: WorksheetComponent,
  onUpdate: <T extends WorksheetConfig>(updater: (prev: T) => T) => void,
) => {
  const props = { onUpdate };
  switch (comp.type) {
    case "header_instruction":
      return <HeaderInstructionForm config={comp.config as HeaderInstructionConfig} {...props} />;
    case "arrow_transform":
      return <ArrowTransformForm config={comp.config as ArrowTransformConfig} {...props} />;
    case "sequential_repeat":
      return <SequentialRepeatForm config={comp.config as SequentialRepeatConfig} {...props} />;
    case "selection_sentence":
      return <SelectionSentenceForm config={comp.config as SelectionSentenceConfig} {...props} />;
    case "grid_NxM":
      return <GridForm config={comp.config as GridConfig} {...props} />;
    case "reward_tracker":
      return <RewardTrackerForm config={comp.config as RewardTrackerConfig} {...props} />;
    case "checklist_table":
      return <ChecklistTableForm config={comp.config as ChecklistTableConfig} {...props} />;
    case "info_guide":
      return <InfoGuideForm config={comp.config as InfoGuideConfig} {...props} />;
    case "outline_title":
      return <OutlineTitleForm config={comp.config as OutlineTitleConfig} {...props} />;
    case "writing_practice":
      return <WritingPracticeForm config={comp.config as WritingPracticeConfig} {...props} />;
    case "coloring_area":
      return <ColoringAreaForm config={comp.config as ColoringAreaConfig} {...props} />;
    case "mind_map":
      return <MindMapForm config={comp.config as MindMapConfig} {...props} />;
    default:
      return null;
  }
};

const EditorPanel = () => {
  const components = useWorksheetStore((s) => s.components);
  const activeIndex = useWorksheetStore((s) => s.activeIndex);
  const setActiveIndex = useWorksheetStore((s) => s.setActiveIndex);
  const removeComponent = useWorksheetStore((s) => s.removeComponent);
  const moveComponent = useWorksheetStore((s) => s.moveComponent);
  const toggleCollapse = useWorksheetStore((s) => s.toggleCollapse);
  const updateConfig = useWorksheetStore((s) => s.updateConfig);

  if (components.length === 0) {
    return (
      <div className="w-[380px] overflow-y-auto p-4 shrink-0 border-l border-black-25">
        <div className="text-center py-20 px-10 text-black-45">
          <div className="text-5xl mb-4">👈</div>
          <div className="text-[15px] leading-relaxed">
            왼쪽에서 컴포넌트를 클릭해서 추가하세요
            <br />
            <span className="text-[13px] text-black-40">또는 상단 &quot;예제&quot; 버튼을 눌러보세요</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[380px] overflow-y-auto p-4 shrink-0 border-l border-black-25">
      {components.map((comp, i) => {
        const meta = COMPONENT_META[comp.type];
        const isActive = i === activeIndex;
        const actionBtnCls =
          "w-6.5 h-6.5 rounded-md border-none bg-transparent cursor-pointer text-[13px] text-black-55 flex items-center justify-center hover:bg-black-20 hover:text-black-90 transition";

        return (
          <div
            key={comp.id}
            className={`max-w-full mb-2.5 bg-white-100 rounded-xl border-2 transition ${
              isActive ? "border-primary shadow-[0_0_0_3px_rgba(124,131,255,0.1)]" : "border-black-25 hover:border-primary-200"
            } ${comp.collapsed ? "ws-collapsed-block" : ""}`}
            onClick={() => setActiveIndex(i)}
          >
            {/* Header */}
            <div
              className={`flex items-center gap-2.5 px-3.5 py-2.5 bg-black-5 cursor-grab ${
                comp.collapsed ? "rounded-xl" : "rounded-t-[10px] border-b border-black-20"
              }`}
            >
              <span className="text-black-40 text-base">⠿</span>
              <span className="text-[15px]">{meta.icon}</span>
              <span className="text-[12.5px] font-semibold flex-1">{meta.name}</span>
              <div className="flex gap-0.5">
                <button
                  type="button"
                  className={actionBtnCls}
                  onClick={(e) => { e.stopPropagation(); moveComponent(i, -1); }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={actionBtnCls}
                  onClick={(e) => { e.stopPropagation(); moveComponent(i, 1); }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={actionBtnCls}
                  onClick={(e) => { e.stopPropagation(); toggleCollapse(i); }}
                >
                  {comp.collapsed ? "▸" : "▾"}
                </button>
                <button
                  type="button"
                  className={`${actionBtnCls} hover:!bg-error-50 hover:!text-error-700`}
                  onClick={(e) => { e.stopPropagation(); removeComponent(i); }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            {!comp.collapsed && (
              <div className="p-3.5">
                {renderForm(comp, (updater) => updateConfig(i, updater))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default EditorPanel;
