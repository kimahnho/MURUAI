/**
 * 학습자료 컴포넌트 편집 오른쪽 패널.
 * 카드형 토글 UI로 컴포넌트별 편집 폼 표시.
 * 삽입된 컴포넌트가 없으면 렌더하지 않음.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";

import { useWorksheetElementStore } from "@/features/editor/store/worksheetElementStore";
import { COMPONENT_META } from "@/features/worksheet-editor/constants/defaults";
import type {
  WorksheetConfig,
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
  SentenceCompletionConfig,
  SentenceFillConfig,
  PassageQuestionConfig,
  MatchingConnectConfig,
  DateNameFieldConfig,
  ClockFaceConfig,
  CalendarConfig,
  MindMapConfig,
} from "@/features/worksheet-editor/model/types";
import {
  HeaderInstructionForm,
  ArrowTransformForm,

  SelectionSentenceForm,
  GridForm,
  RewardTrackerForm,
  ChecklistTableForm,
  InfoGuideForm,
  OutlineTitleForm,
  WritingPracticeForm,
  ColoringAreaForm,
  SentenceCompletionForm,
  SentenceFillForm,
  PassageQuestionForm,
  MatchingConnectForm,
  DateNameFieldForm,
  ClockFaceForm,
  CalendarForm,
  MindMapForm,
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
    case "sentence_completion":
      return <SentenceCompletionForm config={comp.config as SentenceCompletionConfig} onUpdate={onUpdate} />;
    case "sentence_fill":
      return <SentenceFillForm config={comp.config as SentenceFillConfig} onUpdate={onUpdate} />;
    case "passage_question":
      return <PassageQuestionForm config={comp.config as PassageQuestionConfig} onUpdate={onUpdate} />;
    case "matching_connect":
      return <MatchingConnectForm config={comp.config as MatchingConnectConfig} onUpdate={onUpdate} />;
    case "date_name_field":
      return <DateNameFieldForm config={comp.config as DateNameFieldConfig} onUpdate={onUpdate} />;
    case "clock_face":
      return <ClockFaceForm config={comp.config as ClockFaceConfig} onUpdate={onUpdate} />;
    case "calendar":
      return <CalendarForm config={comp.config as CalendarConfig} onUpdate={onUpdate} />;
    case "mind_map":
      return <MindMapForm config={comp.config as MindMapConfig} onUpdate={onUpdate} />;
    default:
      return null;
  }
};

const WorksheetRightPanel = () => {
  const insertedComponents = useWorksheetElementStore((s) => s.insertedComponents);
  const isPanelVisible = useWorksheetElementStore((s) => s.isPanelVisible);
  const selectedComponentId = useWorksheetElementStore((s) => s.selectedComponentId);
  const updateComponentConfig = useWorksheetElementStore((s) => s.updateComponentConfig);
  const requestDeleteWithElements = useWorksheetElementStore((s) => s.requestDeleteWithElements);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(insertedComponents.length);
  const cardRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // 선택된 컴포넌트 카드 자동 펼침 + 스크롤
  useEffect(() => {
    if (selectedComponentId) {
      setExpandedIds((prev) => new Set([...prev, selectedComponentId]));
      requestAnimationFrame(() => {
        const el = cardRefsMap.current.get(selectedComponentId);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [selectedComponentId]);

  // 패널 표시 조건: 명시적으로 열었을 때만 (직접 만들기 탭, 컴포넌트 클릭 등)
  if (!isPanelVisible) return null;

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
        {insertedComponents.map((comp) => {
          const meta = COMPONENT_META[comp.type];
          const isExpanded = expandedIds.has(comp.id);
          const isSelected = selectedComponentId === comp.id;

          return (
            <div
              key={comp.id}
              ref={(node) => {
                if (node) cardRefsMap.current.set(comp.id, node);
                else cardRefsMap.current.delete(comp.id);
              }}
              className={`rounded-xl border shadow-sm overflow-hidden transition-all ${
                isSelected
                  ? "border-primary-300 bg-primary-50 ring-2 ring-primary-200"
                  : "border-black-25 bg-white-100"
              }`}
            >
              {/* 카드 헤더 — 토글 + 삭제 */}
              <div className="flex items-center gap-1.5 px-3 py-2.5 hover:bg-black-5 transition">
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
                  onClick={() => requestDeleteWithElements(comp.id)}
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
