import {
  useEffect,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import { useTemplateStore } from "../store/templateStore";
import type { Page } from "../model/pageTypes";
import type { TemplateId } from "../templates/templateRegistry";
import type { ReadonlyRef } from "../model/refTypes";

type AddTemplatePage = (args: {
  templateId: TemplateId;
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" };

type AddSelectedTemplatePages = (args: {
  templateId: TemplateId;
  selectedIndices: number[];
  fallbackOrientation: "horizontal" | "vertical";
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" } | null;

type TemplateSubscriptionParams = {
  pages: Page[];
  selectedPageId: string;
  selectedTemplate: TemplateId | null;
  setSelectedTemplate: (templateId: TemplateId | null) => void;
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  orientationRef: ReadonlyRef<"horizontal" | "vertical">;
  setTemplateChoiceDialog: Dispatch<
    SetStateAction<{ templateId: TemplateId } | null>
  >;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setActivePage: (
    pageId: string,
    nextOrientation?: "horizontal" | "vertical"
  ) => void;
  showEmotionInferenceToast: () => void;
  isApplyingTemplateRef: MutableRefObject<boolean>;
  recordHistory: (label?: string) => void;
  addTemplatePage: AddTemplatePage;
  addSelectedTemplatePages: AddSelectedTemplatePages;
};

export const useTemplateSubscription = ({
  pages,
  selectedPageId,
  selectedTemplate,
  setSelectedTemplate,
  pagesRef,
  selectedPageIdRef,
  orientationRef,
  setTemplateChoiceDialog,
  setPages,
  setActivePage,
  showEmotionInferenceToast,
  isApplyingTemplateRef,
  recordHistory,
  addTemplatePage,
  addSelectedTemplatePages,
}: TemplateSubscriptionParams) => {
  useEffect(() => {
    const unsubscribe = useTemplateStore.subscribe((state, prevState) => {
      if (state.templateRequestId === prevState.templateRequestId) return;
      if (!state.selectedTemplate) return;

      const currentPageId = selectedPageIdRef.current;
      const currentPage = pagesRef.current.find(
        (page) => page.id === currentPageId
      );

      if (!currentPage) return;

      if (pagesRef.current.length === 1 && !state.selectedPageIndices) {
        setTemplateChoiceDialog({ templateId: state.selectedTemplate });
        return;
      }

      setTemplateChoiceDialog(null);

      isApplyingTemplateRef.current = true;

      let result: { id: string; orientation: "horizontal" | "vertical" } | null;

      if (state.selectedPageIndices && state.selectedPageIndices.length > 0) {
        result = addSelectedTemplatePages({
          templateId: state.selectedTemplate,
          selectedIndices: state.selectedPageIndices,
          fallbackOrientation: orientationRef.current,
          setPages,
        });
      } else {
        result = addTemplatePage({
          templateId: state.selectedTemplate,
          fallbackOrientation: orientationRef.current,
          setPages,
        });
      }

      if (result) {
        setActivePage(result.id, result.orientation);
        if (state.selectedTemplate === "emotionInference") {
          showEmotionInferenceToast();
        }
      }

      setTimeout(() => {
        recordHistory("Apply template");
        isApplyingTemplateRef.current = false;
      }, 100);
    });
    return unsubscribe;
  }, [
    addTemplatePage,
    addSelectedTemplatePages,
    orientationRef,
    pagesRef,
    recordHistory,
    selectedPageIdRef,
    setActivePage,
    setPages,
    setTemplateChoiceDialog,
    showEmotionInferenceToast,
    isApplyingTemplateRef,
  ]);

  useEffect(() => {
    const pageTemplateId =
      pages.find((page) => page.id === selectedPageId)?.templateId ?? null;
    const nextTemplateId =
      pageTemplateId === "aacBoard" ? null : pageTemplateId;
    if (nextTemplateId === selectedTemplate) return;
    setSelectedTemplate(nextTemplateId);
  }, [pages, selectedPageId, selectedTemplate, setSelectedTemplate]);
};
