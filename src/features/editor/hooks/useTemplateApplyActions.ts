/**
 * 템플릿 적용 요청을 처리하고 페이지 교체/삽입 결과를 상태에 반영하는 훅.
 */
import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import type { Page } from "../model/pageTypes";
import { TEMPLATE_REGISTRY, type TemplateId } from "../templates/templateRegistry";
import type { ReadonlyRef } from "../model/refTypes";
import { trackTemplateUsageEvent } from "@/shared/utils/trackEvents";
import { mp } from "@/shared/utils/mixpanel";

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
  afterPageId?: string;
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
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleApplyTemplateToCurrent = useCallback(() => {
    if (!templateChoiceDialog) return;

    const templateId = templateChoiceDialog.templateId;
    isApplyingTemplateRef.current = true;

    const currentPageId = selectedPageIdRef.current;
    // 커버 페이지에는 템플릿 적용 차단 — setPages 콜백으로 현재 페이지 확인
    let isCover = false;
    setPages((prev) => {
      const page = prev.find((p) => p.id === currentPageId);
      if (page?.coverData) isCover = true;
      return prev;
    });
    if (isCover) {
      setTemplateChoiceDialog(null);
      isApplyingTemplateRef.current = false;
      return;
    }
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
    mp.track(`${TEMPLATE_REGISTRY[templateId].label} 템플릿 적용`, {
      template_id: templateId,
      template_name: TEMPLATE_REGISTRY[templateId].label,
      target: "current_page",
    });

    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
    }
    recordTimeoutRef.current = setTimeout(() => {
      // 템플릿 적용 직후 비동기 상태가 안정화된 뒤 히스토리를 기록해 undo 스냅샷을 단일화한다.
      recordHistory("Apply template to current page");
      isApplyingTemplateRef.current = false;
      recordTimeoutRef.current = null;
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
      afterPageId: selectedPageIdRef.current,
    });
    setActivePage(newPage.id, newPage.orientation);
    setTemplateChoiceDialog(null);
    if (templateId === "emotionInference") {
      showEmotionInferenceToast();
    }
    void trackTemplateUsageEvent(templateId);
    mp.track(`${TEMPLATE_REGISTRY[templateId].label} 템플릿 적용`, {
      template_id: templateId,
      template_name: TEMPLATE_REGISTRY[templateId].label,
      target: "new_page",
    });

    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
    }
    recordTimeoutRef.current = setTimeout(() => {
      // 새 페이지 생성 + 템플릿 삽입을 하나의 히스토리 단계로 묶는다.
      recordHistory("Apply template to new page");
      isApplyingTemplateRef.current = false;
      recordTimeoutRef.current = null;
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

  useEffect(() => {
    return () => {
      if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
        recordTimeoutRef.current = null;
      }
    };
  }, []);

  return { handleApplyTemplateToCurrent, handleApplyTemplateToNew };
};
