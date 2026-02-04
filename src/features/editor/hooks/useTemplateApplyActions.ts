import {
  useCallback,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import type { Page } from "../model/pageTypes";
import { TEMPLATE_REGISTRY, type TemplateId } from "../templates/templateRegistry";
import type { ReadonlyRef } from "../types/refTypes";
import { trackTemplateUsageEvent } from "@/shared/lib/trackEvents";
import { mp } from "@/shared/lib/mixpanel";

type ApplyTemplateToCurrentPage = (args: {
  templateId: TemplateId;
  currentPageId: string;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" };

type AddTemplatePage = (args: {
  templateId: TemplateId;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" };

type TemplateApplyActionsParams = {
  templateChoiceDialog: { templateId: TemplateId } | null;
  setTemplateChoiceDialog: Dispatch<
    SetStateAction<{ templateId: TemplateId } | null>
  >;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setActivePage: (
    pageId: string,
    nextOrientation?: "horizontal" | "vertical"
  ) => void;
  orientationRef: ReadonlyRef<"horizontal" | "vertical">;
  selectedPageIdRef: ReadonlyRef<string>;
  isApplyingTemplateRef: MutableRefObject<boolean>;
  recordHistory: (label?: string) => void;
  showEmotionInferenceToast: () => void;
  applyTemplateToCurrentPage: ApplyTemplateToCurrentPage;
  addTemplatePage: AddTemplatePage;
};

export const useTemplateApplyActions = ({
  templateChoiceDialog,
  setTemplateChoiceDialog,
  setPages,
  setActivePage,
  orientationRef,
  selectedPageIdRef,
  isApplyingTemplateRef,
  recordHistory,
  showEmotionInferenceToast,
  applyTemplateToCurrentPage,
  addTemplatePage,
}: TemplateApplyActionsParams) => {
  const handleApplyTemplateToCurrent = useCallback(() => {
    if (!templateChoiceDialog) return;

    const templateId = templateChoiceDialog.templateId;
    isApplyingTemplateRef.current = true;

    const currentPageId = selectedPageIdRef.current;
    const result = applyTemplateToCurrentPage({
      templateId,
      currentPageId,
      fallbackOrientation: orientationRef.current,
      setPages,
    });
    setActivePage(result.id, result.orientation);
    setTemplateChoiceDialog(null);
    if (templateId === "emotionInference") {
      showEmotionInferenceToast();
    }
    void trackTemplateUsageEvent(templateId);
    mp.track("템플릿 적용", { template_id: templateId, template_name: TEMPLATE_REGISTRY[templateId].label, target: "current_page" });

    setTimeout(() => {
      recordHistory("Apply template to current page");
      isApplyingTemplateRef.current = false;
    }, 100);
  }, [
    templateChoiceDialog,
    applyTemplateToCurrentPage,
    orientationRef,
    selectedPageIdRef,
    setPages,
    setActivePage,
    setTemplateChoiceDialog,
    showEmotionInferenceToast,
    recordHistory,
    isApplyingTemplateRef,
  ]);

  const handleApplyTemplateToNew = useCallback(() => {
    if (!templateChoiceDialog) return;

    const templateId = templateChoiceDialog.templateId;
    isApplyingTemplateRef.current = true;

    const newPage = addTemplatePage({
      templateId,
      fallbackOrientation: orientationRef.current,
      setPages,
    });
    setActivePage(newPage.id, newPage.orientation);
    setTemplateChoiceDialog(null);
    if (templateId === "emotionInference") {
      showEmotionInferenceToast();
    }
    void trackTemplateUsageEvent(templateId);
    mp.track("템플릿 적용", { template_id: templateId, template_name: TEMPLATE_REGISTRY[templateId].label, target: "new_page" });

    setTimeout(() => {
      recordHistory("Apply template to new page");
      isApplyingTemplateRef.current = false;
    }, 100);
  }, [
    templateChoiceDialog,
    addTemplatePage,
    orientationRef,
    setPages,
    setActivePage,
    setTemplateChoiceDialog,
    showEmotionInferenceToast,
    recordHistory,
    isApplyingTemplateRef,
  ]);

  return { handleApplyTemplateToCurrent, handleApplyTemplateToNew };
};
