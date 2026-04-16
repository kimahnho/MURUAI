/**
 * 템플릿 목록 탐색/미리보기/적용 액션을 제공하는 사이드 패널 컴포넌트.
 * 카테고리별 2열 그리드 + 검색 기능.
 */
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTemplateContentState } from "../hooks/useTemplateContentState";
import {
  TEMPLATE_REGISTRY,
  type TemplateId,
} from "@/features/editor/templates/templateRegistry";
import type {
  CanvasElement,
  Template,
  TemplateElement,
} from "@/features/editor/model/canvasTypes";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import {
  buildAacBoardElements,
  type AacLabelPosition,
} from "@/features/editor/utils/aacBoardUtils";
import { withLogoTemplateElements } from "@/features/editor/utils/logoElement";
import { fitTemplateTextElement } from "@/features/editor/utils/templateTextFit";
import {
  buildStorySequenceElements,
  type StoryDirection,
  type StoryCardRatio,
} from "@/features/editor/utils/storySequenceUtils";
import MultiPageTemplateDialog from "../MultiPageTemplateDialog";
import AacBoardModal from "./AacBoardModal";
import StorySequenceModal from "./StorySequenceModal";
import WorksheetBuilderTab from "./WorksheetBuilderTab";
import { useWorksheetElementStore } from "@/features/editor/store/worksheetElementStore";
import { getPreviewMetrics } from "./previewMetrics";
import fiveSpaceWritingNoteBg from "@/features/editor/templates/template_pdf/five-space-writing-note/preview.png";
import tenSpaceWritingNoteBg from "@/features/editor/templates/template_pdf/ten-space-writing-note/preview.png";
import lineNoteWideBg from "@/features/editor/templates/template_pdf/line-note-wide/preview.png";
import lineNoteMediumBg from "@/features/editor/templates/template_pdf/line-note-medium/preview.png";
import lineNoteNarrowBg from "@/features/editor/templates/template_pdf/line-note-narrow/preview.png";
import emotionDiaryBg from "@/features/editor/templates/template_pdf/emotion-diary/preview.png";
import pictureDiaryLineNoteBg from "@/features/editor/templates/template_pdf/picture-diary-line-note/preview.png";
import dictationPracticeBg from "@/features/editor/templates/template_pdf/dictation-practice/preview.png";
import yellowDiaryLinesBg from "@/features/editor/templates/template_pdf/yellow-diary-lines/preview.png";
import coloring1Bg from "@/features/editor/templates/template_pdf/coloring-1/preview.png";
import coloring2Bg from "@/features/editor/templates/template_pdf/coloring-2/preview.png";
import coloring3Bg from "@/features/editor/templates/template_pdf/coloring-3/preview.png";
import coloring4Bg from "@/features/editor/templates/template_pdf/coloring-4/preview.png";
import coloring5Bg from "@/features/editor/templates/template_pdf/coloring-5/preview.png";
import dotTracing1Bg from "@/features/editor/templates/template_pdf/dot-tracing-1/preview.png";
import dotTracing2Bg from "@/features/editor/templates/template_pdf/dot-tracing-2/preview.png";
import dotTracing3Bg from "@/features/editor/templates/template_pdf/dot-tracing-3/preview.png";
import dotTracing4Bg from "@/features/editor/templates/template_pdf/dot-tracing-4/preview.png";
import dotTracing5Bg from "@/features/editor/templates/template_pdf/dot-tracing-5/preview.png";

const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;
const PREVIEW_SCALE = 0.18;

const TRAIN_TEMPLATE_BG_1 =
  "https://res.cloudinary.com/dabbfycew/image/upload/muru-templates/admin/train-template/page_1_webp.webp";
const TRAIN_TEMPLATE2_BG_1 =
  "https://res.cloudinary.com/dabbfycew/image/upload/muru-templates/admin/train-template-2/page_1_webp.webp";

// ─── 카테고리 분류 ───

type CategoryItem =
  | { type: "template"; id: TemplateId; label: string }
  | { type: "aacBoard"; label: string }
  | { type: "storySequence"; label: string };

const TEMPLATE_CATEGORIES: { label: string; items: CategoryItem[] }[] = [
  {
    label: "보드 만들기",
    items: [
      { type: "aacBoard", label: "AAC 의사소통 판" },
      { type: "storySequence", label: "이야기 장면 순서 맞추기" },
    ],
  },
  {
    label: "감정 활동",
    items: (
      [
        "emotionInference",
        "emotionWorksheet",
        "normal_1",
        "normal_2",
        "emotionDiary",
      ] as TemplateId[]
    ).map((id) => ({ type: "template" as const, id, label: TEMPLATE_REGISTRY[id].label })),
  },
  {
    label: "기차",
    items: (["trainTemplate", "trainTemplate2"] as TemplateId[]).map((id) => ({
      type: "template" as const,
      id,
      label: TEMPLATE_REGISTRY[id].label,
    })),
  },
  {
    label: "쓰기 노트",
    items: (
      [
        "fiveSpaceWritingNote",
        "tenSpaceWritingNote",
        "lineNoteWide",
        "lineNoteMedium",
        "lineNoteNarrow",
        "dictationPractice",
        "yellowDiaryLines",
        "pictureDiaryLineNote",
      ] as TemplateId[]
    ).map((id) => ({ type: "template" as const, id, label: TEMPLATE_REGISTRY[id].label })),
  },
  {
    label: "시각 자료",
    items: (
      [
        "findItem",
        "wordPair",
        "visualSchedule",
        "vocabularyLearningCard",
        "labelSheet3x8",
        "pictureSchedule",
      ] as TemplateId[]
    ).map((id) => ({ type: "template" as const, id, label: TEMPLATE_REGISTRY[id].label })),
  },
  {
    label: "선긋기",
    items: (
      [
        "straightLineTracing",
        "wavyLineTracing",
        "variousLineTracing",
        "easyCrossLineTracing",
        "crossLineTracing",
      ] as TemplateId[]
    ).map((id) => ({ type: "template" as const, id, label: TEMPLATE_REGISTRY[id].label })),
  },
  {
    label: "색칠공부",
    items: (
      [
        "coloringPage1",
        "coloringPage2",
        "coloringPage3",
        "coloringPage4",
        "coloringPage5",
      ] as TemplateId[]
    ).map((id) => ({ type: "template" as const, id, label: TEMPLATE_REGISTRY[id].label })),
  },
  {
    label: "점선 따라그리기",
    items: (
      [
        "dotTracingPage1",
        "dotTracingPage2",
        "dotTracingPage3",
        "dotTracingPage4",
        "dotTracingPage5",
      ] as TemplateId[]
    ).map((id) => ({ type: "template" as const, id, label: TEMPLATE_REGISTRY[id].label })),
  },
];

// ─── 유틸 ───

const addElementId = (element: TemplateElement, id: string): CanvasElement => ({
  ...(element as CanvasElement),
  id,
});

const toPreviewElements = (template: Template): CanvasElement[] =>
  template.elements.map((element, index) =>
    addElementId(fitTemplateTextElement(element), `${template.id}-${index}`),
  );

const getTemplatePreviewBackground = (templateId: TemplateId) => {
  if (templateId === "trainTemplate") {
    return { type: "image" as const, imageUrl: TRAIN_TEMPLATE_BG_1 };
  }
  if (templateId === "trainTemplate2") {
    return { type: "image" as const, imageUrl: TRAIN_TEMPLATE2_BG_1 };
  }
  if (templateId === "fiveSpaceWritingNote") return { type: "image" as const, imageUrl: fiveSpaceWritingNoteBg };
  if (templateId === "tenSpaceWritingNote") return { type: "image" as const, imageUrl: tenSpaceWritingNoteBg };
  if (templateId === "lineNoteWide") return { type: "image" as const, imageUrl: lineNoteWideBg };
  if (templateId === "lineNoteMedium") return { type: "image" as const, imageUrl: lineNoteMediumBg };
  if (templateId === "lineNoteNarrow") return { type: "image" as const, imageUrl: lineNoteNarrowBg };
  if (templateId === "emotionDiary") return { type: "image" as const, imageUrl: emotionDiaryBg };
  if (templateId === "pictureDiaryLineNote") return { type: "image" as const, imageUrl: pictureDiaryLineNoteBg };
  if (templateId === "dictationPractice") return { type: "image" as const, imageUrl: dictationPracticeBg };
  if (templateId === "yellowDiaryLines") return { type: "image" as const, imageUrl: yellowDiaryLinesBg };
  if (templateId === "coloringPage1") return { type: "image" as const, imageUrl: coloring1Bg };
  if (templateId === "coloringPage2") return { type: "image" as const, imageUrl: coloring2Bg };
  if (templateId === "coloringPage3") return { type: "image" as const, imageUrl: coloring3Bg };
  if (templateId === "coloringPage4") return { type: "image" as const, imageUrl: coloring4Bg };
  if (templateId === "coloringPage5") return { type: "image" as const, imageUrl: coloring5Bg };
  if (templateId === "dotTracingPage1") return { type: "image" as const, imageUrl: dotTracing1Bg };
  if (templateId === "dotTracingPage2") return { type: "image" as const, imageUrl: dotTracing2Bg };
  if (templateId === "dotTracingPage3") return { type: "image" as const, imageUrl: dotTracing3Bg };
  if (templateId === "dotTracingPage4") return { type: "image" as const, imageUrl: dotTracing4Bg };
  if (templateId === "dotTracingPage5") return { type: "image" as const, imageUrl: dotTracing5Bg };
  return undefined;
};

const parseNumberInRange = (
  value: string,
  min: number,
  max: number,
): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
};

// ─── 카테고리 헤더 ───

const CategoryHeader = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 pt-3 pb-1">
    <span className="text-title-16-semibold text-primary whitespace-nowrap">{label}</span>
    <div className="flex-1 h-0.5 bg-primary-200" />
  </div>
);

// ─── 썸네일 카드 (DesignPaper 기반) ───

const TemplateThumbnail = ({
  elements,
  orientation,
  background,
  pageId,
  label,
  onClick,
}: {
  elements: CanvasElement[];
  orientation: "vertical" | "horizontal";
  background?: { type: "image"; imageUrl: string };
  pageId: string;
  label: string;
  onClick: () => void;
}) => {
  const isHorizontal = orientation === "horizontal";
  const pageWidthPx = isHorizontal ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
  const pageHeightPx = isHorizontal ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;
  // 카드는 항상 세로 비율, 가로 템플릿은 스케일을 줄여서 카드 안에 맞춤
  const scale = isHorizontal ? 0.12 : PREVIEW_SCALE;
  const scaledWidth = pageWidthPx * scale;
  const scaledHeight = pageHeightPx * scale;

  return (
    <div
      className="flex flex-col w-full gap-2 cursor-pointer"
      onClick={onClick}
    >
      <div
        className="w-full aspect-[1/1.414] bg-white-100 border border-black-25 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }}>
            <div
              style={{
                width: `${pageWidthPx}px`,
                height: `${pageHeightPx}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <DesignPaper
                pageId={pageId}
                orientation={orientation}
                elements={elements}
                background={background}
                selectedIds={[]}
                editingTextId={null}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>
      <span className="text-13-bold text-black-90 text-center hover:text-primary transition-colors truncate">
        {label}
      </span>
    </div>
  );
};

// ─── 메인 컴포넌트 ───

const TemplateContent = () => {
  const [isAacModalOpen, setIsAacModalOpen] = useState(false);
  const [aacRows, setAacRows] = useState(3);
  const [aacColumns, setAacColumns] = useState(3);
  const [aacOrientation, setAacOrientation] = useState<
    "vertical" | "horizontal"
  >("vertical");
  const [aacLabelPosition, setAacLabelPosition] =
    useState<AacLabelPosition>("bottom");
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [storyCount, setStoryCount] = useState(4);
  const [storyDirection, setStoryDirection] =
    useState<StoryDirection>("left-to-right");
  const storyOrientation = "horizontal" as const;
  const [storyRatio, setStoryRatio] = useState<StoryCardRatio>("4:3");
  const [searchKeyword, setSearchKeyword] = useState("");
  const {
    handleTemplateClick,
    requestAacBoard,
    requestStoryBoard,
    previewTemplate,
    closePreview,
    requestTemplate,
  } = useTemplateContentState();

  // AAC/스토리 기본값 프리뷰 요소 (썸네일용)
  const aacThumbnailElements = withLogoTemplateElements(
    buildAacBoardElements({
      rows: 3,
      columns: 3,
      orientation: "vertical",
      labelPosition: "bottom",
    }),
  ).map((element, index) => ({
    ...(element as CanvasElement),
    id: `aac-thumb-${index}`,
  }));

  const storyThumbnailElements = withLogoTemplateElements(
    buildStorySequenceElements({
      count: 4,
      direction: "left-to-right",
      orientation: "horizontal",
      ratio: "4:3",
    }),
  ).map((element, index) => ({
    ...(element as CanvasElement),
    id: `story-thumb-${index}`,
  }));

  // 모달용 프리뷰 (설정 변경에 따라 동적 갱신)
  const previewElements = withLogoTemplateElements(
    buildAacBoardElements({
      rows: aacRows,
      columns: aacColumns,
      orientation: aacOrientation,
      labelPosition: aacLabelPosition,
    }),
  ).map((element, index) => ({
    ...(element as CanvasElement),
    id: `aac-preview-${index}`,
  }));
  const aacPreviewMetrics = getPreviewMetrics(aacOrientation);

  const storyPreviewElements = withLogoTemplateElements(
    buildStorySequenceElements({
      count: storyCount,
      direction: storyDirection,
      orientation: storyOrientation,
      ratio: storyRatio,
    }),
  ).map((element, index) => ({
    ...(element as CanvasElement),
    id: `story-preview-${index}`,
  }));
  const storyPreviewMetrics = getPreviewMetrics(storyOrientation);

  // 검색 필터
  const keyword = searchKeyword.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!keyword) return TEMPLATE_CATEGORIES;
    const results: CategoryItem[] = [];
    for (const category of TEMPLATE_CATEGORIES) {
      for (const item of category.items) {
        if (item.label.toLowerCase().includes(keyword)) {
          results.push(item);
        }
      }
    }
    return results;
  }, [keyword]);

  const isSearching = keyword.length > 0;

  const handleCountChange = (value: string, setter: (next: number) => void) => {
    const parsed = parseNumberInRange(value, 1, 5);
    if (parsed === null) return;
    setter(parsed);
  };

  const handleApplyAacBoard = () => {
    requestAacBoard({
      rows: aacRows,
      columns: aacColumns,
      orientation: aacOrientation,
      labelPosition: aacLabelPosition,
    });
    setIsAacModalOpen(false);
  };

  const handleStoryCountChange = (value: string) => {
    const parsed = parseNumberInRange(value, 4, 8);
    if (parsed === null) return;
    setStoryCount(parsed);
  };

  const handleApplyStoryBoard = () => {
    requestStoryBoard({
      count: storyCount,
      direction: storyDirection,
      orientation: storyOrientation,
      ratio: storyRatio,
    });
    setIsStoryModalOpen(false);
  };

  const previewTemplateData = previewTemplate
    ? TEMPLATE_REGISTRY[previewTemplate]
    : null;
  const previewPages: Template[] =
    previewTemplateData &&
    "pages" in previewTemplateData &&
    Array.isArray(previewTemplateData.pages)
      ? previewTemplateData.pages
      : previewTemplateData
        ? [previewTemplateData.template]
        : [];

  const handleApplyAllPages = () => {
    if (previewTemplate) {
      requestTemplate(previewTemplate);
      closePreview();
    }
  };

  const handleApplySelectedPages = (selectedIndices: number[]) => {
    if (previewTemplate && selectedIndices.length > 0) {
      if (selectedIndices.length === previewPages.length) {
        requestTemplate(previewTemplate);
      } else {
        requestTemplate(previewTemplate, selectedIndices);
      }
      closePreview();
    }
  };

  const activeTab = useWorksheetElementStore((s) => s.templateActiveTab);
  const setActiveTab = useWorksheetElementStore((s) => s.setTemplateActiveTab);

  // 아이템 렌더 헬퍼
  const renderItem = (item: CategoryItem) => {
    if (item.type === "aacBoard") {
      return (
        <TemplateThumbnail
          key="aacBoard"
          elements={aacThumbnailElements}
          orientation="vertical"
          pageId="preview-aac-board"
          label={item.label}
          onClick={() => setIsAacModalOpen(true)}
        />
      );
    }
    if (item.type === "storySequence") {
      return (
        <TemplateThumbnail
          key="storySequence"
          elements={storyThumbnailElements}
          orientation="horizontal"
          pageId="preview-story-sequence"
          label={item.label}
          onClick={() => setIsStoryModalOpen(true)}
        />
      );
    }
    const templateData = TEMPLATE_REGISTRY[item.id];
    if (!templateData) return null;
    const isHorizontal = templateData.orientation === "horizontal-only";
    return (
      <TemplateThumbnail
        key={item.id}
        elements={toPreviewElements(templateData.template)}
        orientation={isHorizontal ? "horizontal" : "vertical"}
        background={getTemplatePreviewBackground(item.id)}
        pageId={`preview-${item.id}`}
        label={item.label}
        onClick={() => handleTemplateClick(item.id)}
      />
    );
  };

  return (
    <>
      {/* 탭 토글 */}
      <div className="flex gap-1.5 mb-4 p-1.5 bg-black-20 rounded-xl">
        <button
          type="button"
          className={`flex-1 px-4 py-2.5 rounded-xl text-14-semibold transition ${
            activeTab === "templates"
              ? "bg-white-100 text-black-90 shadow-sm"
              : "text-black-55 hover:text-black-70"
          }`}
          onClick={() => {
            setActiveTab("templates");
            useWorksheetElementStore.getState().hidePanel();
            useWorksheetElementStore.getState().setSelectedComponentId(null);
          }}
        >
          미리 만든 템플릿
        </button>
        <button
          type="button"
          className={`flex-1 px-4 py-2.5 rounded-xl text-14-semibold transition ${
            activeTab === "builder"
              ? "bg-white-100 text-black-90 shadow-sm"
              : "text-black-55 hover:text-black-70"
          }`}
          onClick={() => setActiveTab("builder")}
        >
          직접 만들기
        </button>
      </div>

      {activeTab === "builder" ? (
        <WorksheetBuilderTab />
      ) : (
        <div className="flex flex-col w-full gap-4">
          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-40" />
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="템플릿 검색..."
              className="h-10 w-full rounded-xl border border-black-15 bg-white-100 pl-10 pr-3 text-14-regular text-black-90 placeholder:text-black-40 focus:border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-100 transition"
            />
          </div>

          {/* 검색 결과 또는 카테고리 그리드 */}
          {isSearching ? (
            Array.isArray(filteredCategories) && filteredCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {(filteredCategories as CategoryItem[]).map((item) => renderItem(item))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-10">
                <span className="text-14-regular text-black-50">검색 결과가 없습니다</span>
              </div>
            )
          ) : (
            (filteredCategories as typeof TEMPLATE_CATEGORIES).map((category) => (
              <div key={category.label} className="flex flex-col gap-3">
                <CategoryHeader label={category.label} />
                <div className="grid grid-cols-2 gap-3">
                  {category.items.map((item) => renderItem(item))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <AacBoardModal
        isOpen={isAacModalOpen}
        rows={aacRows}
        columns={aacColumns}
        orientation={aacOrientation}
        labelPosition={aacLabelPosition}
        preview={{
          elements: previewElements,
          metrics: aacPreviewMetrics,
        }}
        onClose={() => {
          setIsAacModalOpen(false);
        }}
        onChangeRows={(value) => {
          handleCountChange(value, setAacRows);
        }}
        onChangeColumns={(value) => {
          handleCountChange(value, setAacColumns);
        }}
        onSelectOrientation={setAacOrientation}
        onSelectLabelPosition={setAacLabelPosition}
        onApply={handleApplyAacBoard}
      />

      <StorySequenceModal
        isOpen={isStoryModalOpen}
        count={storyCount}
        direction={storyDirection}
        ratio={storyRatio}
        preview={{
          elements: storyPreviewElements,
          metrics: storyPreviewMetrics,
        }}
        onClose={() => {
          setIsStoryModalOpen(false);
        }}
        onChangeCount={handleStoryCountChange}
        onSelectDirection={setStoryDirection}
        onSelectRatio={setStoryRatio}
        onApply={handleApplyStoryBoard}
      />

      {previewTemplate && previewTemplateData && (
        <MultiPageTemplateDialog
          open={!!previewTemplate}
          templateLabel={previewTemplateData.label}
          pages={previewPages}
          onClose={closePreview}
          onApplyAll={handleApplyAllPages}
          onApplySelected={handleApplySelectedPages}
        />
      )}
    </>
  );
};

export default TemplateContent;
