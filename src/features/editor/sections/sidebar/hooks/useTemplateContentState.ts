import { useTemplateStore } from "@/features/editor/store/templateStore";
import { useAacBoardStore } from "@/features/editor/store/aacBoardStore";
import { useStoryBoardStore } from "@/features/editor/store/storyBoardStore";
import { mp } from "@/shared/utils/mixpanel";
import {
  TEMPLATE_REGISTRY,
  type TemplateId,
} from "@/features/editor/templates/templateRegistry";

export const useTemplateContentState = () => {
  const requestTemplate = useTemplateStore((state) => state.requestTemplate);
  const requestAacBoard = useAacBoardStore((state) => state.requestBoard);
  const requestStoryBoard = useStoryBoardStore((state) => state.requestBoard);
  const previewTemplate = useTemplateStore((state) => state.previewTemplate);
  const openPreview = useTemplateStore((state) => state.openPreview);
  const closePreview = useTemplateStore((state) => state.closePreview);

  const handleTemplateClick = (templateId: TemplateId) => {
    const templateDefinition = TEMPLATE_REGISTRY[templateId];
    mp.track(`${templateDefinition.label} 템플릿 클릭`, {
      template_id: templateId,
      template_name: templateDefinition.label,
    });
    const hasMultiplePages =
      "pages" in templateDefinition &&
      templateDefinition.pages &&
      templateDefinition.pages.length > 1;

    if (hasMultiplePages) {
      openPreview(templateId);
    } else {
      requestTemplate(templateId);
    }
  };

  return {
    requestTemplate,
    requestAacBoard,
    requestStoryBoard,
    previewTemplate,
    openPreview,
    closePreview,
    handleTemplateClick,
  };
};
