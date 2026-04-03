/**
 * 에디터 전역 스토어 구독 훅들을 조합해 구독 생명주기를 통합 관리하는 훅.
 */
import { useEffect } from "react";
import type { Dispatch, SetStateAction, MutableRefObject } from "react";
import { useParams } from "react-router-dom";

import { supabase } from "@/shared/api/supabase";
import {
  createAiGenerationLog,
  updateAiGenerationStories,
} from "@/shared/utils/trackAiGeneration";

import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import type { TemplateId } from "../templates/templateRegistry";
import type { SideBarMenu } from "../store/sideBarStore";
import type { AacBoardConfig } from "../utils/aacBoardUtils";
import type { StorySequenceConfig } from "../utils/storySequenceUtils";
import type { StoryItem } from "../ai/generateEmotionStory";
import { useImageFillStore } from "../store/imageFillStore";
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
import { useAiGenerationModeStore } from "../store/aiGenerationModeStore";
import { useSideBarStore } from "../store/sideBarStore";
import { patchHeroImagesOnPages } from "../utils/buildEmotionStoryPages";
import {
  extractVocabLabels,
  buildVocabTracingPages,
} from "../utils/tracingGridUtils";
import { useWorksheetElementStore } from "../store/worksheetElementStore";
import { buildWorksheetComponentElements, buildWorksheetComponentElementsFromConfig } from "../utils/buildWorksheetPage";
import { DEFAULT_CONFIGS } from "@/features/worksheet-editor/constants/defaults";

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
  const { docId } = useParams<{ docId: string }>();
  const { showEmotionInferenceToast } = useTemplateNotifications();

  // imageFillStore에 현재 문서 ID를 동기화하여 이미지 사용 추적 시 문서 ID를 포함한다.
  useEffect(() => {
    useImageFillStore.getState().setCurrentDocId(docId ?? null);
    return () => useImageFillStore.getState().setCurrentDocId(null);
  }, [docId]);

  // 대���보드에서 전달된 AI intent 소비 (마운트 시 1회)
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

  // 랜딩에서 전달된 AI 생성 로그를 소비하여 배너 등록 + DB 기록한다.
  // pages가 DB에서 로드될 때까지 대기 — storyPageIds가 pages에 존재할 때만 소비.
  useEffect(() => {
    const raw = sessionStorage.getItem("pendingAiLog");
    if (!raw) return;

    let parsedLog: {
      type: string;
      topic: string;
      stories: StoryItem[];
      initialTexts: { title: string; sentence: string }[];
      storyPageIds: string[];
      source: string;
    };
    try {
      parsedLog = JSON.parse(raw);
    } catch {
      sessionStorage.removeItem("pendingAiLog");
      return;
    }

    // pages가 아직 로드되지 않았으면 다음 렌더에서 재시도
    const pageIdSet = new Set(pages.map((p) => p.id));
    const hasStoryPages = parsedLog.storyPageIds?.some((id) =>
      pageIdSet.has(id),
    );
    if (!hasStoryPages) return;

    // 조건 충족 — sessionStorage 소비
    sessionStorage.removeItem("pendingAiLog");

    // 이미지 생성 배너 등록 + 첫 번째 스토리 페이지로 이동
    if (parsedLog.storyPageIds?.length > 0) {
      useEmotionSceneStore.getState().addPendingGeneration({
        stories: parsedLog.stories,
        storyPageIds: parsedLog.storyPageIds,
        bannerPhase: "ready",
      });
      setActivePage(parsedLog.storyPageIds[0]);

      // 랜딩 진입 시 포커스 모드 활성화 + 줌 축소
      if (parsedLog.source === "landing") {
        useAiGenerationModeStore.getState().enterFocusedMode({
          stories: parsedLog.stories,
          storyPageIds: parsedLog.storyPageIds,
        });
        useSideBarStore.getState().setSelectedMenu("ai-story-edit");
        // 페이지 전체가 보이도록 줌 축소
        const accessors = useAiGenerationModeStore.getState().pageAccessors;
        accessors?.setZoom(60);
      }
    }

    // DB 로그 기록 (비차단)
    void (async () => {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return;

        const logId = await createAiGenerationLog(
          userId,
          parsedLog.type as "emotion" | "storybook",
          parsedLog.topic,
          parsedLog.source as "landing" | "editor",
        );
        if (!logId) return;

        void updateAiGenerationStories(
          logId,
          parsedLog.stories,
          parsedLog.initialTexts,
          docId,
        );
        sessionStorage.setItem("aiGenerationLogId", logId);
      } catch (error) {
        console.warn("pendingAiLog 처리 실패", error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

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

  // 학습자료 컴포넌트 삽입 구독
  useStoreSubscription({
    subscribe: useWorksheetElementStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.requestedComponent),
    onChange: (state) => {
      if (!state.requestedComponent) return;
      const activePageId = selectedPageIdRef.current;
      const page = pagesRef.current.find((p) => p.id === activePageId);
      if (!page) return;

      // 현재 페이지 최하단 Y좌표 계산
      let maxY = 56.7; // mmToPx(15) ≈ 기본 마진
      for (const el of page.elements) {
        if ("y" in el && "h" in el) {
          const bottom = (el as { y: number; h: number }).y + (el as { y: number; h: number }).h;
          if (bottom > maxY) maxY = bottom;
        }
      }
      const insertY = maxY + 38; // ~10mm 간격

      const compType = state.requestedComponent;
      const newElements = buildWorksheetComponentElements(compType, insertY);
      if (newElements.length === 0) return;

      // 캔버스에 삽입
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? { ...p, elements: [...p.elements, ...newElements] }
            : p,
        ),
      );
      setSelectedIds(newElements.map((el) => el.id));
      setEditingTextId(null);

      // 오른쪽 편집 패널용 컴포넌트 추적
      useWorksheetElementStore.getState().addInsertedComponent({
        id: crypto.randomUUID(),
        type: compType,
        config: structuredClone(DEFAULT_CONFIGS[compType]),
        elementIds: newElements.map((el) => el.id),
      });
    },
    deps: [pagesRef, selectedPageIdRef, setPages, setSelectedIds, setEditingTextId],
  });

  // 학습자료 예제 일괄 삽입 구독
  useStoreSubscription({
    subscribe: useWorksheetElementStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.batchRequestId !== prevState.batchRequestId && Boolean(state.requestedBatch),
    onChange: (state) => {
      if (!state.requestedBatch || state.requestedBatch.length === 0) return;
      const activePageId = selectedPageIdRef.current;
      const page = pagesRef.current.find((p) => p.id === activePageId);
      if (!page) return;

      let maxY = 56.7;
      for (const el of page.elements) {
        if ("y" in el && "h" in el) {
          const bottom = (el as { y: number; h: number }).y + (el as { y: number; h: number }).h;
          if (bottom > maxY) maxY = bottom;
        }
      }

      const allNewElements: import("../model/canvasTypes").CanvasElement[] = [];
      let curY = maxY + 38; // ~10mm
      const GAP = 38; // ~10mm

      for (const comp of state.requestedBatch) {
        const elements = buildWorksheetComponentElementsFromConfig(comp.type, comp.config, curY);
        allNewElements.push(...elements);

        // 다음 컴포넌트의 Y 계산
        let compMaxY = curY;
        for (const el of elements) {
          if ("y" in el && "h" in el) {
            const bottom = (el as { y: number; h: number }).y + (el as { y: number; h: number }).h;
            if (bottom > compMaxY) compMaxY = bottom;
          }
        }
        curY = compMaxY + GAP;

        // 편집 패널용 추적
        useWorksheetElementStore.getState().addInsertedComponent({
          id: crypto.randomUUID(),
          type: comp.type,
          config: structuredClone(comp.config),
          elementIds: elements.map((el) => el.id),
        });
      }

      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? { ...p, elements: [...p.elements, ...allNewElements] }
            : p,
        ),
      );
      setSelectedIds([]);
      setEditingTextId(null);
    },
    deps: [pagesRef, selectedPageIdRef, setPages, setSelectedIds, setEditingTextId],
  });

  // 학습자료 컴포넌트 config 변경 → 캔버스 요소 재빌드 구독
  useStoreSubscription({
    subscribe: useWorksheetElementStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.configChangeId !== prevState.configChangeId,
    onChange: () => {
      const { insertedComponents, selectedComponentId } = useWorksheetElementStore.getState();
      const comp = insertedComponents.find((c) => c.id === selectedComponentId);
      if (!comp) return;

      const activePageId = selectedPageIdRef.current;
      const page = pagesRef.current.find((p) => p.id === activePageId);
      if (!page) return;

      // 기존 요소의 Y좌표 찾기 (재빌드 시 같은 위치에 배치)
      const oldElementIdSet = new Set(comp.elementIds);
      let insertY = 56.7; // 기본 마진
      for (const el of page.elements) {
        if (oldElementIdSet.has(el.id) && "y" in el) {
          insertY = (el as { y: number }).y;
          break;
        }
      }

      // config로 새 요소 빌드
      const newElements = buildWorksheetComponentElementsFromConfig(
        comp.type,
        comp.config,
        insertY,
      );

      // 기존 요소 제거 + 새 요소 삽입 (같은 위치)
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== activePageId) return p;
          const filtered = p.elements.filter((el) => !oldElementIdSet.has(el.id));
          return { ...p, elements: [...filtered, ...newElements] };
        }),
      );

      // elementIds 업데이트
      useWorksheetElementStore.getState().updateElementIds(
        comp.id,
        newElements.map((el) => el.id),
      );
    },
    deps: [pagesRef, selectedPageIdRef, setPages],
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
