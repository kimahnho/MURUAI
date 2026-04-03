/**
 * 학습자료 컴포넌트 편집 오른쪽 패널.
 * 카드형 토글 UI로 컴포넌트별 편집 폼 표시.
 * 삽입된 컴포넌트가 없으면 렌더하지 않음.
 */
import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

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

// 보상 트래커 전용 아이콘 편집 폼
const RewardTrackerFormWithIcon = ({
  config,
  onUpdate,
}: {
  config: RewardTrackerConfig;
  onUpdate: <T extends WorksheetConfig>(updater: (prev: T) => T) => void;
}) => (
  <>
    <RewardTrackerForm config={config} onUpdate={onUpdate} />
    <div className="mt-3">
      <label className="block text-[10.5px] font-semibold text-black-55 uppercase tracking-wider mb-1">
        아이콘
      </label>
      <div className="flex gap-1.5 flex-wrap">
        {["☆", "⭐", "♥", "♡", "✓", "●", "★"].map((icon) => (
          <button
            key={icon}
            type="button"
            className={`w-9 h-9 rounded-lg border-[1.5px] text-base flex items-center justify-center cursor-pointer transition ${
              (config as RewardTrackerConfig & { icon?: string }).icon === icon
                ? "border-primary bg-primary-50"
                : "border-black-25 bg-white-100 hover:border-primary-200"
            }`}
            onClick={() =>
              onUpdate((c: RewardTrackerConfig) => ({ ...c, icon })) as never
            }
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  </>
);

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
      return <RewardTrackerFormWithIcon config={comp.config as RewardTrackerConfig} onUpdate={onUpdate} />;
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
  const updateComponentConfig = useWorksheetElementStore((s) => s.updateComponentConfig);
  const removeInsertedComponent = useWorksheetElementStore((s) => s.removeInsertedComponent);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  if (insertedComponents.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="w-80 shrink-0 border-l border-black-25 bg-black-10 overflow-y-auto flex flex-col">
      {/* 헤더 */}
      <div className="px-4 py-3 bg-white-100 border-b border-black-25">
        <p className="text-13-bold text-black-90">학습자료 편집</p>
        <p className="text-[11px] text-black-55 mt-0.5">
          {insertedComponents.length}개 컴포넌트
        </p>
      </div>

      {/* 컴포넌트 카드 목록 */}
      <div className="p-3 flex flex-col gap-2.5">
        {insertedComponents.map((comp) => {
          const meta = COMPONENT_META[comp.type];
          const isExpanded = expandedIds.has(comp.id);

          return (
            <div
              key={comp.id}
              className="bg-white-100 rounded-xl border border-black-25 shadow-sm overflow-hidden"
            >
              {/* 카드 헤더 — 클릭으로 토글 */}
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left hover:bg-black-5 transition"
                onClick={() => toggleExpand(comp.id)}
              >
                <span className="text-base shrink-0">{meta.icon}</span>
                <span className="text-12-semibold flex-1 min-w-0 truncate text-black-90">
                  {meta.name}
                </span>
                <button
                  type="button"
                  className="w-6 h-6 rounded-md text-black-45 hover:text-error-700 hover:bg-error-50 flex items-center justify-center transition shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeInsertedComponent(comp.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-black-45 shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-black-45 shrink-0" />
                )}
              </button>

              {/* 카드 바디 — 편집 폼 */}
              {isExpanded && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-black-20">
                  {renderForm(comp, (updater) => {
                    const newConfig = updater(comp.config as never);
                    updateComponentConfig(comp.id, newConfig);
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorksheetRightPanel;
