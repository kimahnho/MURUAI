/**
 * 학습자료 컴포넌트 편집 오른쪽 패널.
 * 카드형 토글 UI로 컴포넌트별 편집 폼 표시.
 * 삽입된 컴포넌트가 없으면 렌더하지 않음.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

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
  const isPanelVisible = useWorksheetElementStore((s) => s.isPanelVisible);
  const selectedComponentId = useWorksheetElementStore((s) => s.selectedComponentId);
  const updateComponentConfig = useWorksheetElementStore((s) => s.updateComponentConfig);
  const moveInsertedComponent = useWorksheetElementStore((s) => s.moveInsertedComponent);
  const reorderInsertedComponent = useWorksheetElementStore((s) => s.reorderInsertedComponent);
  const removeInsertedComponent = useWorksheetElementStore((s) => s.removeInsertedComponent);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(insertedComponents.length);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  // 새 컴포넌트 삽입 시 자동 펼침
  useEffect(() => {
    if (insertedComponents.length > prevCountRef.current) {
      const newComp = insertedComponents[insertedComponents.length - 1];
      if (newComp) {
        setExpandedIds((prev) => new Set([...prev, newComp.id]));
      }
    }
    prevCountRef.current = insertedComponents.length;
  }, [insertedComponents]);

  // 캔버스 클릭으로 selectedComponentId가 바뀌면 해당 카드 자동 펼침
  useEffect(() => {
    if (selectedComponentId) {
      setExpandedIds((prev) => new Set([...prev, selectedComponentId]));
    }
  }, [selectedComponentId]);

  // 패널 표시 조건: 명시적으로 열었거나 (직접 만들기 탭), 삽입된 컴포넌트가 있을 때
  if (!isPanelVisible && insertedComponents.length === 0) return null;

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

      {/* 빈 상태 */}
      {insertedComponents.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-black-45">
            <p className="text-2xl mb-2">📝</p>
            <p className="text-13-bold mb-1">컴포넌트 없음</p>
            <p className="text-[11px]">왼쪽 &quot;직접 만들기&quot; 탭에서<br />컴포넌트를 추가하세요</p>
          </div>
        </div>
      )}

      {/* 컴포넌트 카드 목록 */}
      {insertedComponents.length > 0 && (
      <div className="p-3 flex flex-col gap-2.5">
        {insertedComponents.map((comp, idx) => {
          const meta = COMPONENT_META[comp.type];
          const isExpanded = expandedIds.has(comp.id);
          const isDragOver = dragOverIndex === idx;
          const isSelected = selectedComponentId === comp.id;

          return (
            <div
              key={comp.id}
              draggable
              onDragStart={() => { dragIndexRef.current = idx; }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
              onDragLeave={() => { if (dragOverIndex === idx) setDragOverIndex(null); }}
              onDrop={() => {
                if (dragIndexRef.current !== null && dragIndexRef.current !== idx) {
                  reorderInsertedComponent(dragIndexRef.current, idx);
                }
                dragIndexRef.current = null;
                setDragOverIndex(null);
              }}
              onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}
              className={`rounded-xl border shadow-sm overflow-hidden transition-all ${
                isDragOver
                  ? "border-primary border-2 scale-[1.02] bg-white-100"
                  : isSelected
                    ? "border-primary-300 bg-primary-50 ring-2 ring-primary-200"
                    : "border-black-25 bg-white-100"
              }`}
            >
              {/* 카드 헤더 — 드래그 가능 + 토글 + 순서 이동 + 삭제 */}
              <div className="flex items-center gap-1.5 px-3 py-2.5 hover:bg-black-5 transition cursor-grab active:cursor-grabbing">
                {/* 순서 이동 ↑↓ */}
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    className="w-5 h-4 flex items-center justify-center text-black-40 hover:text-primary transition disabled:opacity-30"
                    disabled={insertedComponents.indexOf(comp) === 0}
                    onClick={() => moveInsertedComponent(comp.id, -1)}
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    className="w-5 h-4 flex items-center justify-center text-black-40 hover:text-primary transition disabled:opacity-30"
                    disabled={insertedComponents.indexOf(comp) === insertedComponents.length - 1}
                    onClick={() => moveInsertedComponent(comp.id, 1)}
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* 아이콘 + 이름 — 클릭으로 토글 */}
                <button
                  type="button"
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  onClick={() => toggleExpand(comp.id)}
                >
                  <span className="text-base shrink-0">{meta.icon}</span>
                  <span className="text-12-semibold flex-1 min-w-0 truncate text-black-90">
                    {meta.name}
                  </span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-black-45 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-black-45 shrink-0" />
                  )}
                </button>

                {/* 삭제 */}
                <button
                  type="button"
                  className="w-6 h-6 rounded-md text-black-45 hover:text-error-700 hover:bg-error-50 flex items-center justify-center transition shrink-0"
                  onClick={() => removeInsertedComponent(comp.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

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
      )}
    </div>
  );
};

export default WorksheetRightPanel;
