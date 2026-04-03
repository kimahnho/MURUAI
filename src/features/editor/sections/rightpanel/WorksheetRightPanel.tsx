/**
 * 학습자료 컴포넌트 편집 오른쪽 패널.
 * 캔버스에 삽입된 워크시트 컴포넌트의 속성을 편집한다.
 * 삽입된 컴포넌트가 없으면 렌더하지 않음.
 */
import { useWorksheetElementStore } from "@/features/editor/store/worksheetElementStore";
import { COMPONENT_META } from "@/features/worksheet-editor/constants/defaults";
import type {
  WorksheetConfig,
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
} from "@/features/worksheet-editor/model/types";
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
} from "@/features/worksheet-editor/sections/forms/EditorForms";
import type { InsertedWorksheetComponent } from "@/features/editor/store/worksheetElementStore";

const renderForm = (
  comp: InsertedWorksheetComponent,
  onUpdate: <T extends WorksheetConfig>(updater: (prev: T) => T) => void,
) => {
  switch (comp.type) {
    case "header_instruction":
      return <HeaderInstructionForm config={comp.config as HeaderInstructionConfig} onUpdate={onUpdate} />;
    case "arrow_transform":
      return <ArrowTransformForm config={comp.config as ArrowTransformConfig} onUpdate={onUpdate} />;
    case "sequential_repeat":
      return <SequentialRepeatForm config={comp.config as SequentialRepeatConfig} onUpdate={onUpdate} />;
    case "selection_sentence":
      return <SelectionSentenceForm config={comp.config as SelectionSentenceConfig} onUpdate={onUpdate} />;
    case "grid_NxM":
      return <GridForm config={comp.config as GridConfig} onUpdate={onUpdate} />;
    case "reward_tracker":
      return <RewardTrackerForm config={comp.config as RewardTrackerConfig} onUpdate={onUpdate} />;
    case "checklist_table":
      return <ChecklistTableForm config={comp.config as ChecklistTableConfig} onUpdate={onUpdate} />;
    case "info_guide":
      return <InfoGuideForm config={comp.config as InfoGuideConfig} onUpdate={onUpdate} />;
    case "outline_title":
      return <OutlineTitleForm config={comp.config as OutlineTitleConfig} onUpdate={onUpdate} />;
    case "writing_practice":
      return <WritingPracticeForm config={comp.config as WritingPracticeConfig} onUpdate={onUpdate} />;
    case "coloring_area":
      return <ColoringAreaForm config={comp.config as ColoringAreaConfig} onUpdate={onUpdate} />;
    default:
      return null;
  }
};

const WorksheetRightPanel = () => {
  const insertedComponents = useWorksheetElementStore((s) => s.insertedComponents);
  const selectedComponentId = useWorksheetElementStore((s) => s.selectedComponentId);
  const setSelectedComponentId = useWorksheetElementStore((s) => s.setSelectedComponentId);
  const updateComponentConfig = useWorksheetElementStore((s) => s.updateComponentConfig);
  const removeInsertedComponent = useWorksheetElementStore((s) => s.removeInsertedComponent);

  // 삽입된 컴포넌트가 없으면 패널 숨김
  if (insertedComponents.length === 0) return null;

  const selectedComp = insertedComponents.find((c) => c.id === selectedComponentId);

  return (
    <div className="w-80 shrink-0 border-l border-black-25 bg-white-100 overflow-y-auto flex flex-col">
      {/* 헤더 */}
      <div className="px-4 py-3 border-b border-black-25 bg-black-5">
        <p className="text-13-bold text-black-90">학습자료 편집</p>
        <p className="text-[11px] text-black-55 mt-0.5">삽입된 컴포넌트를 선택하여 편집</p>
      </div>

      {/* 컴포넌트 목록 */}
      <div className="px-3 py-2 border-b border-black-25">
        <p className="text-[10px] text-black-50 uppercase tracking-wider font-bold mb-1.5">
          삽입된 컴포넌트 ({insertedComponents.length})
        </p>
        <div className="flex flex-col gap-0.5">
          {insertedComponents.map((comp) => {
            const meta = COMPONENT_META[comp.type];
            const isSelected = comp.id === selectedComponentId;
            return (
              <div
                key={comp.id}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition ${
                  isSelected
                    ? "bg-primary-50 border border-primary-200"
                    : "hover:bg-black-5 border border-transparent"
                }`}
                onClick={() => setSelectedComponentId(comp.id)}
              >
                <span className="text-sm shrink-0">{meta.icon}</span>
                <span className="text-12-semibold flex-1 min-w-0 truncate">{meta.name}</span>
                <button
                  type="button"
                  className="w-5 h-5 rounded text-black-50 hover:text-error-700 hover:bg-error-50 flex items-center justify-center text-xs transition shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeInsertedComponent(comp.id);
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 선택된 컴포넌트 편집 폼 */}
      {selectedComp && (
        <div className="px-4 py-3 flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{COMPONENT_META[selectedComp.type].icon}</span>
            <span className="text-13-bold">{COMPONENT_META[selectedComp.type].name} 편집</span>
          </div>
          {renderForm(selectedComp, (updater) => {
            const newConfig = updater(selectedComp.config as never);
            updateComponentConfig(selectedComp.id, newConfig);
          })}
        </div>
      )}
    </div>
  );
};

export default WorksheetRightPanel;
