/**
 * 에디터 전역 스토어 구독 훅들을 조합해 구독 생명주기를 통합 관리하는 훅.
 */
import { useEffect } from "react";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import type { TemplateId } from "../templates/templateRegistry";
import type { SideBarMenu } from "../store/sideBarStore";
import type { AacBoardConfig } from "../utils/aacBoardUtils";
import type { StorySequenceConfig } from "../utils/storySequenceUtils";
import { useImageFillSubscription } from "./useImageFillSubscription";
import { useFontSubscription } from "./useFontSubscription";
import { useElementSubscription } from "./useElementSubscription";
import { useOrientationSubscription } from "./useOrientationSubscription";
import { useTemplateSubscription } from "./useTemplateSubscription";
import { useBoardSubscriptions } from "./useBoardSubscriptions";
import { useTemplateNotifications } from "./useTemplateNotifications";
import { usePageSettingsSubscription } from "./usePageSettingsSubscription";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { useTemplateStore } from "../store/templateStore";
import { useEmotionSceneStore } from "../store/emotionSceneStore";
import { useVocabTracingStore } from "../store/vocabTracingStore";
import { useToastStore } from "../store/toastStore";
import { patchHeroImagesOnPages } from "../utils/buildEmotionStoryPages";
import {
  extractVocabLabels,
  buildVocabTracingPages,
} from "../utils/tracingGridUtils";

type TextPreset = {
  text: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  alignX?: "left" | "center" | "right" | "justify";
  alignY?: "top" | "middle" | "bottom";
  widthMode?: "auto" | "fixed" | "element";
};

type AddTextElement = (args: {
  pageId: string;
  preset: TextPreset;
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => string;

type AddShapeElement = (args: {
  pageId: string;
  elementType: "rect" | "roundRect" | "ellipse" | "mosaic" | "circleMosaic";
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => string;

type AddLineElement = (args: {
  pageId: string;
  elementType: "line" | "arrow";
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => string;

type AddTableElement = (args: {
  pageId: string;
  rows: number;
  cols: number;
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => string;

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

type AddAacBoardPage = (args: {
  config: AacBoardConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical"; firstElementId?: string };

type AddStoryBoardPage = (args: {
  config: StorySequenceConfig;
  setPages: Dispatch<SetStateAction<Page[]>>;
}) => { id: string; orientation: "horizontal" | "vertical" };

type EditorSubscriptionsParams = {
  pages: Page[];
  selectedPageId: string;
  selectedTemplate: TemplateId | null;
  setSelectedTemplate: (templateId: TemplateId | null) => void;
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  selectedIdsRef: ReadonlyRef<string[]>;
  orientationRef: ReadonlyRef<"horizontal" | "vertical">;
  isSyncingOrientationRef: MutableRefObject<boolean>;
  isApplyingTemplateRef: MutableRefObject<boolean>;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  setTemplateChoiceDialog: Dispatch<
    SetStateAction<{ templateId: TemplateId } | null>
  >;
  setActivePage: (
    pageId: string,
    nextOrientation?: "horizontal" | "vertical",
  ) => void;
  setSideBarMenu: (menu: SideBarMenu) => void;
  recordHistory: (label?: string) => void;
  addTextElement: AddTextElement;
  addShapeElement: AddShapeElement;
  addLineElement: AddLineElement;
  addTableElement: AddTableElement;
  addTemplatePage: AddTemplatePage;
  addSelectedTemplatePages: AddSelectedTemplatePages;
  addAacBoardPage: AddAacBoardPage;
  addStoryBoardPage: AddStoryBoardPage;
};

export const useEditorSubscriptions = ({
  pages,
  selectedPageId,
  selectedTemplate,
  setSelectedTemplate,
  pagesRef,
  selectedPageIdRef,
  selectedIdsRef,
  orientationRef,
  isSyncingOrientationRef,
  isApplyingTemplateRef,
  setPages,
  setSelectedIds,
  setEditingTextId,
  setTemplateChoiceDialog,
  setActivePage,
  setSideBarMenu,
  recordHistory,
  addTextElement,
  addShapeElement,
  addLineElement,
  addTableElement,
  addTemplatePage,
  addSelectedTemplatePages,
  addAacBoardPage,
  addStoryBoardPage,
}: EditorSubscriptionsParams) => {
  const { showEmotionInferenceToast } = useTemplateNotifications();

  // 대시보드에서 전달된 AI intent 소비 (마운트 시 1회)
  // 템플릿 intent는 문서 생성 시 canvas_data에 미리 포함되므로 여기서는 AI만 처리한다.
  useEffect(() => {
    const raw = sessionStorage.getItem("pendingEditorIntent");
    if (!raw) return;

    let intent: { type: string; feature?: string };
    try {
      intent = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem("pendingEditorIntent");
      return;
    }

    if (intent.type === "ai") {
      setSideBarMenu("ai-template");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이미지 채우기 요청은 선택 요소 교체/신규 삽입까지 포함하므로
  // 다른 구독보다 먼저 연결해 최신 선택 상태를 기준으로 동작하게 한다.
  useImageFillSubscription({
    pagesRef,
    selectedPageIdRef,
    selectedIdsRef,
    setPages,
    setSelectedIds,
    setEditingTextId,
  });

  // 템플릿 적용은 페이지 구조를 바꾸므로 이후 구독들이 새로운 페이지를 기준으로 처리되게 한다.
  useTemplateSubscription({
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
  });

  // 폰트/요소/방향/보드 구독은 서로 독립 요청을 소비하므로
  // 내부 가드(요청 ID/조건)로만 실행 순서를 제어한다.
  useFontSubscription({
    selectedPageIdRef,
    selectedIdsRef,
    setPages,
  });

  useElementSubscription({
    pagesRef,
    selectedPageIdRef,
    setPages,
    setSelectedIds,
    setEditingTextId,
    addTextElement,
    addShapeElement,
    addLineElement,
    addTableElement,
  });

  useOrientationSubscription({
    selectedPageIdRef,
    isSyncingOrientationRef,
    setPages,
  });

  useBoardSubscriptions({
    setPages,
    setActivePage,
    setSideBarMenu,
    setSelectedIds,
    setEditingTextId,
    addAacBoardPage,
    addStoryBoardPage,
  });

  usePageSettingsSubscription({
    pages,
    selectedPageId,
    selectedPageIdRef,
    setPages,
  });

  // AI 스토리라인 페이지 삽입 요청을 감지해 현재 페이지 목록 끝에 추가한다.
  useStoreSubscription({
    subscribe: useTemplateStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.insertPagesRequest !== null &&
      state.insertPagesRequest !== prevState.insertPagesRequest,
    onChange: (state) => {
      if (!state.insertPagesRequest) return;
      const { pages: newPages } = state.insertPagesRequest;
      setPages((prev) => {
        const combined = [...prev, ...newPages];
        return combined.map((p, i) => ({ ...p, pageNumber: i + 1 }));
      });
      recordHistory("AI 스토리라인 생성");
      useTemplateStore.getState().clearInsertPagesRequest();
    },
    deps: [setPages, recordHistory],
  });

  // 히어로 이미지 패치 요청을 감지해 기존 페이지의 플레이스홀더를 이미지로 교체한다.
  useStoreSubscription({
    subscribe: useEmotionSceneStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.heroImageRequest !== null &&
      state.heroImageRequest !== prevState.heroImageRequest,
    onChange: (state) => {
      if (!state.heroImageRequest) return;
      const { heroImageUrls } = state.heroImageRequest;
      setPages((prev) => patchHeroImagesOnPages(prev, heroImageUrls));
      recordHistory("AI 장면 이미지 생성");
      useEmotionSceneStore.getState().clearHeroImageRequest();
    },
    deps: [setPages, recordHistory],
  });

  // 어휘 따라쓰기 페이지 생성 요청을 감지해 소스 페이지 바로 뒤에 삽입한다.
  useStoreSubscription({
    subscribe: useVocabTracingStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId &&
      state.sourcePageId !== null,
    onChange: (state) => {
      const { sourcePageId } = state;
      if (!sourcePageId) return;

      const currentPages = pagesRef.current;
      const sourcePageIndex = currentPages.findIndex(
        (p) => p.id === sourcePageId,
      );
      if (sourcePageIndex < 0) {
        useVocabTracingStore.getState().clearRequest();
        return;
      }

      const sourcePage = currentPages[sourcePageIndex];
      const words = extractVocabLabels(sourcePage.elements);
      if (words.length === 0) {
        useToastStore
          .getState()
          .showToast("어휘 카드에 목표 어휘를 입력해주세요.");
        useVocabTracingStore.getState().clearRequest();
        return;
      }

      const orientation = sourcePage.orientation ?? "vertical";
      const tracingPages = buildVocabTracingPages(words, orientation);
      const firstTracingPageId = tracingPages[0].id;

      setPages((prev) => {
        const next = [...prev];
        const insertIndex =
          next.findIndex((p) => p.id === sourcePageId) + 1;
        next.splice(insertIndex, 0, ...tracingPages);
        return next.map((p, i) => ({ ...p, pageNumber: i + 1 }));
      });

      recordHistory("어휘 따라쓰기 생성");
      setActivePage(firstTracingPageId, orientation);
      useVocabTracingStore.getState().clearRequest();
    },
    deps: [setPages, recordHistory, setActivePage, pagesRef],
  });

  return { showEmotionInferenceToast };
};
