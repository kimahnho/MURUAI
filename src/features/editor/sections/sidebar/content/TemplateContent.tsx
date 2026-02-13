import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  GalleryVerticalEnd,
  Grid,
  Grid3x3,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
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
import { getPreviewMetrics } from "./previewMetrics";

const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;

const ALL_TEMPLATES = Object.values(TEMPLATE_REGISTRY).map((template) => ({
  id: template.id,
  title: template.label,
}));

const isNormalTemplate = (templateId: string) =>
  templateId.startsWith("normal_");

const isBasicTemplate = (templateId: string) =>
  isNormalTemplate(templateId) || templateId === "visualSchedule";

const sortBasicTemplates = (a: string, b: string) => {
  if (a === "visualSchedule" && b !== "visualSchedule") return -1;
  if (b === "visualSchedule" && a !== "visualSchedule") return 1;
  return sortNormalTemplates(a, b);
};

const sortNormalTemplates = (a: string, b: string) => {
  const aIndex = Number.parseInt(a.replace("normal_", ""), 10);
  const bIndex = Number.parseInt(b.replace("normal_", ""), 10);
  if (Number.isFinite(aIndex) && Number.isFinite(bIndex)) {
    return aIndex - bIndex;
  }
  return a.localeCompare(b);
};

const POPULAR_TEMPLATES = ALL_TEMPLATES.filter(
  (template) => !isBasicTemplate(template.id),
);

const BASIC_TEMPLATES = ALL_TEMPLATES.filter((template) =>
  isBasicTemplate(template.id),
).sort((a, b) => sortBasicTemplates(a.id, b.id));

const addElementId = (element: TemplateElement, id: string): CanvasElement => ({
  ...(element as CanvasElement),
  id,
});

const toPreviewElements = (template: Template): CanvasElement[] =>
  template.elements.map((element, index) =>
    addElementId(fitTemplateTextElement(element), `${template.id}-${index}`),
  );

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

const SectionHeader = ({
  icon: Icon,
  iconColor,
  title,
}: {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
}) => (
  <div className="flex items-center gap-2">
    <Icon className={`icon-s items-center ${iconColor || "text-primary"}`} />
    <span className="flex text-title-16-semibold items-center">{title}</span>
  </div>
);

const TemplateCard = ({
  icon: Icon,
  iconBgColor,
  borderColor,
  bgColor,
  hoverBgColor,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  iconBgColor: string;
  borderColor: string;
  bgColor: string;
  hoverBgColor: string;
  title: string;
  description: string;
  onClick?: () => void;
}) => (
  <div
    className="flex items-center gap-3 w-full border rounded-xl px-4 py-3.5 transition-colors cursor-pointer"
    style={{
      borderColor,
      backgroundColor: bgColor,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = hoverBgColor;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = bgColor;
    }}
    onClick={onClick}
  >
    <div
      className="flex w-12 h-12 items-center justify-center rounded-lg shadow-sm"
      style={{ backgroundColor: iconBgColor }}
    >
      <Icon className="icon-m text-white" />
    </div>

    <div className="flex flex-col justify-center gap-1">
      <span className="text-title-18-semibold text-black-100">{title}</span>
      <span className="text-12-regular text-black-60">{description}</span>
    </div>
  </div>
);

const TemplateCarousel = ({
  title,
  icon,
  iconColor,
  templates,
}: {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  templates: { id: string; title: string }[];
}) => {
  const { handleTemplateClick: onTemplateClick } = useTemplateContentState();
  const [pageIndex, setPageIndex] = useState(0);
  const itemsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(templates.length / itemsPerPage));
  const currentPage = Math.min(pageIndex, totalPages - 1);
  const startIndex = currentPage * itemsPerPage;
  const visibleTemplates = templates.slice(
    startIndex,
    startIndex + itemsPerPage,
  );
  const placeholders = Array.from({
    length: Math.max(0, itemsPerPage - visibleTemplates.length),
  });
  const canPrev = currentPage > 0;
  const canNext = currentPage < totalPages - 1;

  const handleTemplateClick = (templateId: string | number) => {
    if (typeof templateId === "string" && templateId in TEMPLATE_REGISTRY) {
      onTemplateClick(templateId as TemplateId);
    }
  };

  return (
    <div className="flex flex-col w-full gap-3">
      <div className="flex items-center justify-between">
        <SectionHeader icon={icon} iconColor={iconColor} title={title} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => canPrev && setPageIndex((prev) => prev - 1)}
            disabled={!canPrev}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              canPrev
                ? "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
                : "border-black-10 text-black-30 cursor-not-allowed"
            }`}
            aria-label="이전 템플릿"
          >
            <ChevronLeft className="icon-s" />
          </button>
          <button
            type="button"
            onClick={() => canNext && setPageIndex((prev) => prev + 1)}
            disabled={!canNext}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              canNext
                ? "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
                : "border-black-10 text-black-30 cursor-not-allowed"
            }`}
            aria-label="다음 템플릿"
          >
            <ChevronRight className="icon-s" />
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="grid w-full grid-cols-2 gap-4">
          {visibleTemplates.map((template) => {
            const templateData =
              typeof template.id === "string"
                ? TEMPLATE_REGISTRY[template.id as TemplateId]
                : null;
            const pageWidthPx = PAGE_WIDTH_PX;
            const pageHeightPx = PAGE_HEIGHT_PX;
            const previewScale = 0.18;
            const scaledWidth = pageWidthPx * previewScale;
            const scaledHeight = pageHeightPx * previewScale;

            return (
              <div
                key={template.id}
                className="flex flex-col w-full gap-2 cursor-pointer"
                onClick={() => {
                  handleTemplateClick(template.id);
                }}
              >
                <div className="w-full aspect-[1/1.414] bg-white-100 border border-black-25 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  {templateData ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div
                        style={{
                          width: `${scaledWidth}px`,
                          height: `${scaledHeight}px`,
                        }}
                      >
                        <div
                          style={{
                            width: `${pageWidthPx}px`,
                            height: `${pageHeightPx}px`,
                            transform: `scale(${previewScale})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <DesignPaper
                            pageId={`preview-${templateData.id}`}
                            orientation="vertical"
                            elements={toPreviewElements(templateData.template)}
                            selectedIds={[]}
                            editingTextId={null}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-black-5 flex items-center justify-center">
                      <span className="text-14-medium text-black-50">
                        {template.title}
                      </span>
                    </div>
                  )}
                </div>

                <span className="text-14-semibold text-black-90 text-center hover:text-primary transition-colors">
                  {template.title}
                </span>
              </div>
            );
          })}
          {placeholders.map((_, index) => (
            <div
              key={`placeholder-${index}`}
              className="flex flex-col w-full gap-2 opacity-0 pointer-events-none"
              aria-hidden="true"
            >
              <div className="w-full aspect-[1/1.414] rounded-lg border border-black-10" />
              <span className="text-14-semibold text-center">placeholder</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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
  const [storyOrientation, setStoryOrientation] = useState<
    "vertical" | "horizontal"
  >("vertical");
  const [storyRatio, setStoryRatio] = useState<StoryCardRatio>("4:3");
  const {
    requestAacBoard,
    requestStoryBoard,
    previewTemplate,
    closePreview,
    requestTemplate,
  } = useTemplateContentState();

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
    const parsed = parseNumberInRange(value, 1, 8);
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

  return (
    <>
      <div className="flex flex-col w-full gap-6">
        <div className="flex flex-col w-full gap-3">
          <SectionHeader icon={Grid3x3} title="AAC 의사소통 판" />
          <TemplateCard
            icon={Grid}
            iconBgColor="#5500ff"
            borderColor="rgba(85, 0, 255, 0.2)"
            bgColor="rgba(85, 0, 255, 0.05)"
            hoverBgColor="rgba(85, 0, 255, 0.08)"
            title="AAC 의사소통 판"
            description="1~8 그리드, 가로/세로 방향 선택"
            onClick={() => {
              setIsAacModalOpen(true);
            }}
          />
        </div>

        <div className="flex flex-col w-full gap-3">
          <SectionHeader
            icon={GalleryVerticalEnd}
            iconColor="text-[#0EA5E9]"
            title="이야기 장면 순서 맞추기"
          />
          <TemplateCard
            icon={GalleryVerticalEnd}
            iconBgColor="#0EA5E9"
            borderColor="rgba(14, 165, 233, 0.2)"
            bgColor="rgba(14, 165, 233, 0.05)"
            hoverBgColor="rgba(14, 165, 233, 0.08)"
            title="이야기 장면 순서 맞추기"
            description="2~8개 카드, 순서 화살표 자동 생성"
            onClick={() => {
              setIsStoryModalOpen(true);
            }}
          />
        </div>

        <TemplateCarousel
          title="인기 템플릿"
          icon={BadgeCheck}
          iconColor="text-blue-500"
          templates={POPULAR_TEMPLATES}
        />
        <TemplateCarousel
          title="기본 템플릿"
          icon={Grid}
          iconColor="text-emerald-500"
          templates={BASIC_TEMPLATES}
        />
      </div>

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
        orientation={storyOrientation}
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
        onSelectOrientation={setStoryOrientation}
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
