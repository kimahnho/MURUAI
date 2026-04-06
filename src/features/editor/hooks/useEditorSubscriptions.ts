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
import { buildWorksheetComponentElements, buildWorksheetComponentElementsFromConfig, reflowWorksheetComponents } from "../utils/buildWorksheetPage";
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

      // 컴포넌트 ID 생성
      const wsCompId = crypto.randomUUID();

      // worksheetMeta 스탬프 (groupId 없음 → 개별 요소 클릭/편집 가능)
      const stampedElements = newElements.map((el) => ({
        ...el,
        worksheetMeta: { componentId: wsCompId, componentType: compType },
      }));

      const wsComp: import("../model/pageTypes").PageWorksheetComponent = {
        id: wsCompId,
        type: compType,
        config: structuredClone(DEFAULT_CONFIGS[compType]),
        elementIds: stampedElements.map((el) => el.id),
      };

      // 캔버스 + 페이지 worksheetComponents에 동시 저장
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? {
                ...p,
                elements: [...p.elements, ...stampedElements],
                worksheetComponents: [...(p.worksheetComponents ?? []), wsComp],
              }
            : p,
        ),
      );
      setSelectedIds(stampedElements.map((el) => el.id));
      setEditingTextId(null);

      // 인메모리 스토어에도 추가 (편집 패널용)
      useWorksheetElementStore.getState().addInsertedComponent({
        id: wsCompId,
        type: compType,
        config: structuredClone(DEFAULT_CONFIGS[compType]),
        elementIds: stampedElements.map((el) => el.id),
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
      const batchWsComps: import("../model/pageTypes").PageWorksheetComponent[] = [];
      let curY = maxY + 38;
      const GAP = 38;

      for (const comp of state.requestedBatch) {
        const elements = buildWorksheetComponentElementsFromConfig(comp.type, comp.config, curY);

        const wsCompId = crypto.randomUUID();
        const stampedElements = elements.map((el) => ({
          ...el,
          worksheetMeta: { componentId: wsCompId, componentType: comp.type },
        }));
        allNewElements.push(...stampedElements);

        let compMaxY = curY;
        for (const el of stampedElements) {
          if ("y" in el && "h" in el) {
            const bottom = (el as { y: number; h: number }).y + (el as { y: number; h: number }).h;
            if (bottom > compMaxY) compMaxY = bottom;
          }
        }
        curY = compMaxY + GAP;

        const wsComp: import("../model/pageTypes").PageWorksheetComponent = {
          id: wsCompId,
          type: comp.type,
          config: structuredClone(comp.config),
          elementIds: stampedElements.map((el) => el.id),
        };
        batchWsComps.push(wsComp);

        useWorksheetElementStore.getState().addInsertedComponent({
          id: wsCompId,
          type: comp.type,
          config: structuredClone(comp.config),
          elementIds: stampedElements.map((el) => el.id),
        });
      }

      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? {
                ...p,
                elements: [...p.elements, ...allNewElements],
                worksheetComponents: [...(p.worksheetComponents ?? []), ...batchWsComps],
              }
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
      const { insertedComponents, lastChangedComponentId } = useWorksheetElementStore.getState();

      // 순서 변경 → 전체 reflow만 수행 (재빌드 불필요)
      if (lastChangedComponentId === "__reorder__") {
        const activePageId = selectedPageIdRef.current;
        const page = pagesRef.current.find((p) => p.id === activePageId);
        if (!page) return;

        const { elements: reflowedElements, updatedElementIds } = reflowWorksheetComponents(
          page.elements,
          insertedComponents.map((c) => ({ id: c.id, elementIds: c.elementIds })),
        );
        setPages((prev) =>
          prev.map((p) => (p.id === activePageId ? { ...p, elements: reflowedElements } : p)),
        );
        for (const [compId, newIds] of updatedElementIds) {
          useWorksheetElementStore.getState().updateElementIds(compId, newIds);
        }
        return;
      }

      const comp = insertedComponents.find((c) => c.id === lastChangedComponentId);
      if (!comp) return;

      const activePageId = selectedPageIdRef.current;
      const page = pagesRef.current.find((p) => p.id === activePageId);
      if (!page) return;

      // 기존 요소의 Y좌표 찾기
      const oldElementIdSet = new Set(comp.elementIds);
      let insertY = 56.7;
      for (const el of page.elements) {
        if (oldElementIdSet.has(el.id)) {
          if ("y" in el) insertY = (el as { y: number }).y;
          break;
        }
      }

      // config로 새 요소 빌드 + worksheetMeta 스탬프
      // (이미지 상태는 config.items.imageUrl에 저장되어 있으므로 buildGrid에서 직접 복원)
      const newElements = buildWorksheetComponentElementsFromConfig(
        comp.type,
        comp.config,
        insertY,
      ).map((el) => ({
        ...el,
        worksheetMeta: { componentId: comp.id, componentType: comp.type },
      }));

      // 기존 요소 제거 + 새 요소 삽입
      const updatedElements = page.elements
        .filter((el) => !oldElementIdSet.has(el.id))
        .concat(newElements);

      // 변경된 elementIds를 먼저 업데이트 (reflow에서 참조)
      const store = useWorksheetElementStore.getState();
      store.updateElementIds(comp.id, newElements.map((el) => el.id));

      // 전체 워크시트 컴포넌트 자동 레이아웃 (겹침 방지 + 간격 유지)
      const latestComps = useWorksheetElementStore.getState().insertedComponents;
      const { elements: reflowedElements, updatedElementIds } = reflowWorksheetComponents(
        updatedElements,
        latestComps.map((c) => ({ id: c.id, elementIds: c.elementIds })),
      );

      // reflow 후 elementIds 동기화
      for (const [compId, newIds] of updatedElementIds) {
        useWorksheetElementStore.getState().updateElementIds(compId, newIds);
      }

      // 페이지에 반영 (elements + worksheetComponents 둘 다)
      const finalComps = useWorksheetElementStore.getState().insertedComponents;
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? {
                ...p,
                elements: reflowedElements,
                worksheetComponents: finalComps.map((c) => ({
                  id: c.id,
                  type: c.type,
                  config: c.config,
                  elementIds: c.elementIds,
                })),
              }
            : p,
        ),
      );
    },
    deps: [pagesRef, selectedPageIdRef, setPages],
  });

  // 편집 패널에서 컴포넌트 삭제 → 캔버스 요소도 함께 제거
  useStoreSubscription({
    subscribe: useWorksheetElementStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.deleteWithElementsId !== prevState.deleteWithElementsId && Boolean(state.pendingDeleteCompId),
    onChange: () => {
      const { pendingDeleteCompId, insertedComponents } = useWorksheetElementStore.getState();
      if (!pendingDeleteCompId) return;

      const comp = insertedComponents.find((c) => c.id === pendingDeleteCompId);
      if (!comp) return;

      const elementIdsToRemove = new Set(comp.elementIds);
      const activePageId = selectedPageIdRef.current;

      useWorksheetElementStore.getState().removeInsertedComponent(pendingDeleteCompId);

      const finalComps = useWorksheetElementStore.getState().insertedComponents;
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId
            ? {
                ...p,
                elements: p.elements.filter((el) => !elementIdsToRemove.has(el.id)),
                worksheetComponents: finalComps.map((c) => ({
                  id: c.id, type: c.type, config: c.config, elementIds: c.elementIds,
                })),
              }
            : p,
        ),
      );
    },
    deps: [selectedPageIdRef, setPages],
  });

  // 초기 로드 시 현재 페이지의 worksheetComponents 복원 + groupId 마이그레이션
  useEffect(() => {
    const currentPageId = selectedPageIdRef.current;
    const page = pagesRef.current.find((p) => p.id === currentPageId);
    if (page) {
      // groupId 마이그레이션
      const needsMigration = page.elements.some((el) => el.worksheetMeta && el.groupId);
      if (needsMigration) {
        setPages((prev) =>
          prev.map((p) =>
            p.id === currentPageId
              ? { ...p, elements: p.elements.map((el) => el.worksheetMeta && el.groupId ? { ...el, groupId: undefined } : el) }
              : p,
          ),
        );
      }
      // worksheetComponents 복원
      const pageComps = page.worksheetComponents ?? [];
      if (pageComps.length > 0) {
        useWorksheetElementStore.getState().loadFromPage(
          pageComps.map((c) => ({ id: c.id, type: c.type, config: c.config, elementIds: c.elementIds })),
        );
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 즉시 동기화: 페이지 전환 + undo/redo + 삭제 감지
  // pagesRef를 100ms 간격으로 체크 — 변화가 있으면 즉시 반영
  useEffect(() => {
    let lastPageId = selectedPageIdRef.current;
    let lastElementCount = -1;

    const sync = () => {
      const currentPageId = selectedPageIdRef.current;
      const page = pagesRef.current.find((p) => p.id === currentPageId);
      if (!page) return;

      const currentElementCount = page.elements.length;

      // 페이지 전환 감지
      if (currentPageId !== lastPageId) {
        lastPageId = currentPageId;
        lastElementCount = currentElementCount;

        // groupId 마이그레이션
        const needsMigration = page.elements.some((el) => el.worksheetMeta && el.groupId);
        if (needsMigration) {
          setPages((prev) =>
            prev.map((p) =>
              p.id === currentPageId
                ? { ...p, elements: p.elements.map((el) => el.worksheetMeta && el.groupId ? { ...el, groupId: undefined } : el) }
                : p,
            ),
          );
        }

        // worksheetComponents에서 편집 패널 복원
        const pageComps = page.worksheetComponents ?? [];
        useWorksheetElementStore.getState().loadFromPage(
          pageComps.map((c) => ({ id: c.id, type: c.type, config: c.config, elementIds: c.elementIds })),
        );
        return;
      }

      // 요소 수 변화 감지 (undo/redo/삭제) → 즉시 동기화
      if (currentElementCount !== lastElementCount) {
        lastElementCount = currentElementCount;

        // 방법: page.worksheetComponents + 실제 존재하는 요소 ID로 편집 패널 재구성
        const pageComps = page.worksheetComponents ?? [];
        const pageElementIds = new Set(page.elements.map((el) => el.id));
        const storeComps = useWorksheetElementStore.getState().insertedComponents;

        // worksheetMeta에서 컴포넌트 재구성 (undo로 요소가 복원된 경우)
        const wsMetaMap = new Map<string, { type: string; elementIds: string[] }>();
        for (const el of page.elements) {
          if (el.worksheetMeta) {
            const { componentId, componentType } = el.worksheetMeta;
            const existing = wsMetaMap.get(componentId);
            if (existing) {
              existing.elementIds.push(el.id);
            } else {
              wsMetaMap.set(componentId, { type: componentType, elementIds: [el.id] });
            }
          }
        }

        // 스토어에 없지만 캔버스에 있는 컴포넌트 복원
        let needsUpdate = false;
        const storeCompIds = new Set(storeComps.map((c) => c.id));

        for (const [compId, meta] of wsMetaMap) {
          if (!storeCompIds.has(compId)) {
            // pageComps에서 config 복원
            const pageComp = pageComps.find((c) => c.id === compId);
            if (pageComp) {
              useWorksheetElementStore.getState().addInsertedComponent({
                id: compId,
                type: pageComp.type,
                config: pageComp.config,
                elementIds: meta.elementIds,
              });
              needsUpdate = true;
            }
          }
        }

        // 스토어에 있지만 캔버스에 없는 컴포넌트 제거
        for (const comp of storeComps) {
          const hasAnyElement = comp.elementIds.some((id) => pageElementIds.has(id));
          if (!hasAnyElement && !wsMetaMap.has(comp.id)) {
            useWorksheetElementStore.getState().removeInsertedComponent(comp.id);
            needsUpdate = true;
          }
        }

        // 편집 패널 순서를 캔버스 Y좌표 순으로 정렬 + page.worksheetComponents 동기화
        if (needsUpdate) {
          const allComps = useWorksheetElementStore.getState().insertedComponents;
          const getMinY = (elementIds: string[]) => {
            const idSet = new Set(elementIds);
            let minY = Infinity;
            for (const el of page.elements) {
              if (idSet.has(el.id) && "y" in el) {
                const y = (el as { y: number }).y;
                if (y < minY) minY = y;
              }
            }
            return minY === Infinity ? 0 : minY;
          };
          const sorted = [...allComps].sort((a, b) => getMinY(a.elementIds) - getMinY(b.elementIds));
          useWorksheetElementStore.setState({ insertedComponents: sorted });

          setPages((prev) =>
            prev.map((p) =>
              p.id === currentPageId
                ? { ...p, worksheetComponents: sorted.map((c) => ({ id: c.id, type: c.type, config: c.config, elementIds: c.elementIds })) }
                : p,
            ),
          );
        }
      }
    };

    // 100ms 간격 — undo/redo 직후 빠르게 감지
    const timer = setInterval(sync, 100);
    return () => clearInterval(timer);
  }, [pagesRef, selectedPageIdRef, setPages]);

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
