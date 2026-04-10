/**
 * 에디터 메인 화면의 상태 조합 지점.
 * 페이지/선택/저장/구독 훅을 연결해 실제 편집 UI를 구성한다.
 */
import {
  lazy,
  Suspense,
  useState,
  useRef,
  useEffect,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useLocation, useOutletContext } from "react-router-dom";
import type { CanvasDocument } from "../model/pageTypes";
import type { SpellCheckResult } from "../ai/checkSpelling";
import { applyCorrections } from "../utils/applySpellCorrections";
import { useSpellCheckStore } from "../store/spellCheckStore";
import CanvasStage from "../sections/canvas/CanvasStage";
import EmotionSceneBanner from "../sections/canvas/EmotionSceneBanner";
import VocabTracingBanner from "../sections/canvas/VocabTracingBanner";
import SpellCheckPanel from "./SpellCheckPanel";
import SpellCheckToast from "./SpellCheckToast";
import { useTemplateStore } from "../store/templateStore";
import { useSideBarStore } from "../store/sideBarStore";
import { useFontStore } from "../store/fontStore";
import { useInitialPageState } from "../hooks/useInitialPageState";
import { useSyncedRef } from "./hooks/useSyncedRef";
import { useAutoSave } from "../hooks/useAutoSave";
import { useCanvasGetter } from "../hooks/useCanvasGetter";
import { useCopyPaste } from "../hooks/useCopyPaste";
import { useActivePageState } from "../hooks/useActivePageState";
import { useTemplateApplyActions } from "../hooks/useTemplateApplyActions";
import { useCanvasStageHandlers } from "../sections/canvas/hooks/useCanvasStageHandlers";
import { useEditorHistory } from "../hooks/useEditorHistory";
import { usePageManagement } from "../hooks/usePageManagement";
import { useSelectionManagement } from "../hooks/useSelectionManagement";
import { useCanvasViewport } from "../sections/canvas/hooks/useCanvasViewport";
import { useEditorSubscriptions } from "../hooks/useEditorSubscriptions";
import { usePageSwap } from "../hooks/usePageSwap";
import { usePageSwapStore } from "../store/pageSwapStore";
import { useElementPanelStore } from "../store/elementPanelStore";
import type { PanelData } from "../store/elementPanelStore";
import { moveLayerByDirection } from "../utils/layerUtils";
import { updateElementsByPageId } from "../utils/pageMutation";
import { stripStyleTags } from "../sections/canvas/elements/text/textContentUtils";
import { collectUsedFontFamilies } from "@/shared/utils/fontOptions";
import { isCdnFont, loadCdnFont } from "@/shared/utils/cdnFontLoader";
import {
  applyTemplateToCurrentPage,
  addTemplatePage,
  addSelectedTemplatePages,
  addAacBoardPage,
  addStoryBoardPage,
  addShapeElement,
  addTextElement,
  addLineElement,
  addTableElement,
} from "../utils/pageFactory";
import { type TemplateId } from "../templates/templateRegistry";
import { useAiGenerationModeStore } from "../store/aiGenerationModeStore";

const BottomBar = lazy(() => import("../sections/bottombar/BottomBar"));
const TemplateChoiceDialog = lazy(() => import("@/features/editor/sections/sidebar/TemplateChoiceDialog"));

export interface OutletContext {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  orientation: "horizontal" | "vertical";
  setOrientation: Dispatch<SetStateAction<"horizontal" | "vertical">>;
  registerCanvasGetter: (getter: () => CanvasDocument) => void;
  loadedDocument: CanvasDocument | null;
  clearLoadedDocument: () => void;
  loadedDocumentId: string | null;
  docId?: string;
  docName: string;
  setAutoSaveState: (state: "saving" | "saved" | "error" | null) => void;
  onNetworkError: () => void;
  setRetryAutoSave: (retryFn: () => void) => void;
  setManualSave: (saveFn: () => void) => void;
}

const MainSection = () => {
  const location = useLocation();
  const {
    zoom,
    setZoom,
    orientation,
    setOrientation,
    registerCanvasGetter,
    loadedDocument,
    docId,
    docName,
    setAutoSaveState,
    onNetworkError,
    setRetryAutoSave,
    setManualSave,
  } = useOutletContext<OutletContext>();

  const selectedTemplate = useTemplateStore((state) => state.selectedTemplate);
  const setSelectedTemplate = useTemplateStore(
    (state) => state.setSelectedTemplate,
  );
  const setSideBarMenu = useSideBarStore((state) => state.setSelectedMenu);
  const setFontPanel = useFontStore((state) => state.setPanelFont);
  const setUsedFontFamilies = useFontStore((state) => state.setUsedFontFamilies);
  const { pages, setPages, selectedPageId, setSelectedPageId } =
    useInitialPageState({ loadedDocument, orientation });
  const selectedPageIdRef = useRef(selectedPageId);
  const pagesRef = useRef(pages);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const orientationRef = useRef(orientation);
  const isSyncingOrientationRef = useRef(false);
  const isApplyingHistoryRef = useRef(false);
  const isApplyingTemplateRef = useRef(false);

  const isFocusedMode = useAiGenerationModeStore((s) => s.isActive);

  // 포커스 모드 사이드바 패널에서 페이지를 읽고 수정할 수 있도록 접근자 등록
  useEffect(() => {
    useAiGenerationModeStore.getState().registerPageAccessors({
      getPages: () => pagesRef.current,
      setPages,
      getSelectedPageId: () => selectedPageIdRef.current,
      setSelectedPageId,
      setZoom,
    });
    // 포커스 모드 복원 시 줌 축소
    if (useAiGenerationModeStore.getState().isActive) {
      setZoom(60);
    }
  }, [setPages, setSelectedPageId, setZoom]);

  const { beginTransaction, commitTransaction, recordHistory } = useEditorHistory({
    pages,
    selectedPageId,
    selectedIds,
    editingTextId,
    pagesRef,
    selectedPageIdRef,
    selectedIdsRef,
    setPages,
    setSelectedPageId,
    setSelectedIds,
    isApplyingHistoryRef,
    isApplyingTemplateRef,
  });

  const [templateChoiceDialog, setTemplateChoiceDialog] = useState<{
    templateId: TemplateId;
  } | null>(null);

  useSyncedRef(orientationRef, orientation);
  useSyncedRef(pagesRef, pages);
  useSyncedRef(selectedPageIdRef, selectedPageId);
  useSyncedRef(selectedIdsRef, selectedIds);

  // 페이지 요소의 폰트 변경을 감지해 "사용중인 글꼴" 목록을 갱신하고 CDN 폰트를 사전 로드한다.
  useEffect(() => {
    const families = collectUsedFontFamilies(pages);
    setUsedFontFamilies(families);
    families.forEach((family) => {
      if (isCdnFont(family)) void loadCdnFont(family);
    });
  }, [pages, setUsedFontFamilies]);

  // 자동 저장 시작 조건:
  // 1) 문서 ID가 없는 신규 문서이거나
  // 2) 문서 ID가 있고 문서 데이터 로딩이 끝났으며 페이지가 존재함
  const isDataLoaded = !docId || (loadedDocument !== null && pages.length > 0);

  const { retrySave, manualSave } = useAutoSave({
    pages,
    docId,
    docName,
    onSaveStateChange: setAutoSaveState,
    onNetworkError,
    isDataLoaded,
  });

  useEffect(() => {
    setRetryAutoSave(retrySave);
  }, [retrySave, setRetryAutoSave]);

  useEffect(() => {
    setManualSave(manualSave);
  }, [manualSave, setManualSave]);
  useCanvasGetter({ registerCanvasGetter, pagesRef });

  // 맞춤법 교정 적용 콜백을 spellCheckStore에 등록
  const setSpellCheckApplier = useSpellCheckStore((s) => s.setApplier);
  useEffect(() => {
    setSpellCheckApplier((corrections: SpellCheckResult[]) => {
      setPages((prev) => applyCorrections(prev, corrections));
      recordHistory("맞춤법 교정");
    });
  }, [setSpellCheckApplier, setPages, recordHistory]);

  const {
    setActivePage,
    handleAddPage,
    handleAddPageAtIndex,
    handleSelectPage,
    handleReorderPages,
    handleDuplicatePage,
    handleCopyPage,
    handlePastePage,
    handlePastePages,
    handleDeletePage,
    handleDeleteElements,
    handleClearPage,
    handleMovePage,
  } = usePageManagement({
    pages,
    selectedPageId,
    orientation,
    setPages,
    setSelectedPageId,
    setSelectedIds,
    setEditingTextId,
    setOrientation,
    orientationRef,
    isSyncingOrientationRef,
  });

  const { showEmotionInferenceToast } = useEditorSubscriptions({
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
  });

  useCopyPaste({
    selectedPageId,
    pages,
    selectedIds,
    onDeleteElements: handleDeleteElements,
    onDuplicatePage: handleDuplicatePage,
    onPastePage: handlePastePage,
    onDeletePage: handleDeletePage,
    onClearPage: handleClearPage,
  });

  // 자모 분해 이벤트 핸들러 — 텍스트를 자모별 텍스트 박스로 분리
  useEffect(() => {
    const handler = (e: Event) => {
      const { elementId, text, x, y, fontSize, color, fontFamily } = (e as CustomEvent).detail;
      if (!text || !selectedPageId) return;

      // 한글 자모 분해
      const INITIALS = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
      const MEDIALS = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
      const FINALS = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

      const jamoList: { jamo: string; role: string }[] = [];
      for (const char of text) {
        const code = char.charCodeAt(0);
        if (code >= 0xAC00 && code <= 0xD7A3) {
          const offset = code - 0xAC00;
          const ini = Math.floor(offset / (21 * 28));
          const med = Math.floor((offset % (21 * 28)) / 28);
          const fin = offset % 28;
          jamoList.push({ jamo: INITIALS[ini], role: "initial" });
          jamoList.push({ jamo: MEDIALS[med], role: "medial" });
          if (fin > 0) jamoList.push({ jamo: FINALS[fin], role: "final" });
        } else {
          jamoList.push({ jamo: char, role: "other" });
        }
      }

      // 음절 구조별 자모 위치 계산
      // 원본 글자와 동일한 크기감 유지
      const jamoFontSize = fontSize; // 원본과 동일한 크기
      const syllableSize = fontSize * 1.8; // 한 음절 블록 (원본 글자 폭 × 1.8)
      const newElements: Array<{
        id: string; type: "text"; x: number; y: number; w: number; h: number;
        text: string; widthMode: "fixed";
        style: { fontSize: number; fontWeight: "bold"; fontFamily: string; color: string; underline: false; alignX: "center"; alignY: "middle" };
      }> = [];

      // 모음 유형 판별
      function getVowelType(medIdx: number): "v" | "h" | "c" {
        if (new Set([0,1,2,3,4,5,6,7,20]).has(medIdx)) return "v";
        if (new Set([8,11,12,17,18]).has(medIdx)) return "h";
        return "c";
      }

      // 음절 내 자모 위치 (비율: 0~1 범위, syllableSize 기준)
      // 모든 자모 동일 크기, 위치만 구조에 따라 다름
      const S = 1.0; // 원본과 동일한 크기
      type Pos = { rx: number; ry: number; rw: number; rh: number; rfs: number };
      const POSITIONS: Record<string, Record<string, Pos>> = {
        v_nf: { // 세로모음, 종성 없음 (가, 기, 나...)
          initial: { rx: 0,    ry: 0.05, rw: 0.50, rh: 0.90, rfs: S },
          medial:  { rx: 0.50, ry: 0.05, rw: 0.50, rh: 0.90, rfs: S },
        },
        v_wf: { // 세로모음, 종성 있음 (감, 김, 난...)
          initial: { rx: 0,    ry: 0,    rw: 0.50, rh: 0.55, rfs: S },
          medial:  { rx: 0.50, ry: 0,    rw: 0.50, rh: 0.55, rfs: S },
          final:   { rx: 0.10, ry: 0.55, rw: 0.80, rh: 0.45, rfs: S },
        },
        h_nf: { // 가로모음, 종성 없음 (고, 노, 두...)
          initial: { rx: 0.10, ry: 0,    rw: 0.80, rh: 0.50, rfs: S },
          medial:  { rx: 0.10, ry: 0.50, rw: 0.80, rh: 0.50, rfs: S },
        },
        h_wf: { // 가로모음, 종성 있음 (곰, 눈, 물...)
          initial: { rx: 0.10, ry: 0,    rw: 0.80, rh: 0.36, rfs: S },
          medial:  { rx: 0.10, ry: 0.33, rw: 0.80, rh: 0.34, rfs: S },
          final:   { rx: 0.10, ry: 0.64, rw: 0.80, rh: 0.36, rfs: S },
        },
        c_nf: { // 복합모음, 종성 없음 (과, 궈...)
          initial: { rx: 0,    ry: 0,    rw: 0.45, rh: 0.50, rfs: S },
          medial:  { rx: 0.28, ry: 0.05, rw: 0.72, rh: 0.90, rfs: S },
        },
        c_wf: { // 복합모음, 종성 있음 (광, 권...)
          initial: { rx: 0,    ry: 0,    rw: 0.45, rh: 0.42, rfs: S },
          medial:  { rx: 0.25, ry: 0,    rw: 0.75, rh: 0.55, rfs: S },
          final:   { rx: 0.10, ry: 0.58, rw: 0.80, rh: 0.42, rfs: S },
        },
      };

      let syllableIdx = 0;

      for (const char of text) {
        const code = char.charCodeAt(0);
        const sx = x + syllableIdx * syllableSize; // 음절 블록 X
        const sy = y;

        if (code >= 0xAC00 && code <= 0xD7A3) {
          const offset = code - 0xAC00;
          const ini = Math.floor(offset / (21 * 28));
          const med = Math.floor((offset % (21 * 28)) / 28);
          const fin = offset % 28;
          const vt = getVowelType(med);
          const hasFin = fin > 0;
          const key = `${vt}_${hasFin ? "wf" : "nf"}`;
          const pos = POSITIONS[key];

          // 초성
          const ip = pos.initial;
          newElements.push({
            id: crypto.randomUUID(), type: "text",
            x: sx + ip.rx * syllableSize, y: sy + ip.ry * syllableSize,
            w: ip.rw * syllableSize, h: ip.rh * syllableSize,
            text: INITIALS[ini], widthMode: "fixed",
            style: { fontSize: Math.round(ip.rfs * jamoFontSize), fontWeight: "bold", fontFamily: fontFamily ?? "Pretendard", color: color ?? "#000000", underline: false, alignX: "center", alignY: "middle" },
          });

          // 중성
          const mp = pos.medial;
          newElements.push({
            id: crypto.randomUUID(), type: "text",
            x: sx + mp.rx * syllableSize, y: sy + mp.ry * syllableSize,
            w: mp.rw * syllableSize, h: mp.rh * syllableSize,
            text: MEDIALS[med], widthMode: "fixed",
            style: { fontSize: Math.round(mp.rfs * jamoFontSize), fontWeight: "bold", fontFamily: fontFamily ?? "Pretendard", color: color ?? "#000000", underline: false, alignX: "center", alignY: "middle" },
          });

          // 종성
          if (hasFin && pos.final) {
            const fp = pos.final;
            newElements.push({
              id: crypto.randomUUID(), type: "text",
              x: sx + fp.rx * syllableSize, y: sy + fp.ry * syllableSize,
              w: fp.rw * syllableSize, h: fp.rh * syllableSize,
              text: FINALS[fin], widthMode: "fixed",
              style: { fontSize: Math.round(fp.rfs * jamoFontSize), fontWeight: "bold", fontFamily: fontFamily ?? "Pretendard", color: color ?? "#000000", underline: false, alignX: "center", alignY: "middle" },
            });
          }
        } else {
          // 한글 아닌 문자
          newElements.push({
            id: crypto.randomUUID(), type: "text",
            x: sx, y: sy, w: syllableSize, h: syllableSize * 1.1,
            text: char, widthMode: "fixed",
            style: { fontSize: jamoFontSize, fontWeight: "bold", fontFamily: fontFamily ?? "Pretendard", color: color ?? "#000000", underline: false, alignX: "center", alignY: "middle" },
          });
        }
        syllableIdx++;
      }

      // 원본 요소 삭제 + 자모 요소 추가
      setPages((prev) =>
        prev.map((page) =>
          page.id === selectedPageId
            ? {
                ...page,
                elements: [
                  ...page.elements.filter((el) => el.id !== elementId),
                  ...newElements,
                ],
              }
            : page,
        ),
      );

      // 새로 생성된 자모 요소들을 선택
      setSelectedIds(newElements.map((el) => el.id));
    };

    window.addEventListener("jamo-split-request", handler);
    return () => window.removeEventListener("jamo-split-request", handler);
  }, [selectedPageId, setPages, setSelectedIds]);

  const { selectedPage, activeOrientation } = useActivePageState({
    pages,
    selectedPageId,
    fallbackOrientation: orientation,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const { canvasRef, scale, padding, paperWidth, paperHeight, canvasWidth, canvasHeight } = useCanvasViewport({
    zoom,
    setZoom,
    selectedPageId,
    activeOrientation,
    containerRef,
  });
  const visiblePageIds = usePageSwapStore((state) => state.visiblePageIds);
  const pdfPreviewActive = usePageSwapStore((state) => state.pdfPreviewActive);
  const setVisiblePageIds = usePageSwapStore(
    (state) => state.setVisiblePageIds,
  );
  const requiredPageIds = useMemo(() => {
    if (pdfPreviewActive) {
      return pages.map((page) => page.id);
    }

    const selectedIndex = pages.findIndex((page) => page.id === selectedPageId);
    const neighborIds =
      selectedIndex < 0
        ? []
        : [pages[selectedIndex - 1]?.id, pages[selectedIndex + 1]?.id].filter(
            (id): id is string => Boolean(id),
          );

    return Array.from(
      new Set([selectedPageId, ...visiblePageIds, ...neighborIds]),
    );
  }, [pdfPreviewActive, pages, selectedPageId, visiblePageIds]);
  usePageSwap({
    pages,
    setPages,
    requiredPageIds,
    maxActivePages: 8,
  });

  const {
    isMultiColorSelection,
    multiColorValue,
    hasMultiFontTargets,
    multiFontFamily,
    multiFontLabel,
    multiFontSizeInput,
    hasMultiBorderTargets,
    multiBorderEnabled,
    multiBorderColor,
    multiBorderWidth,
    activeBorderStyle,
    borderStyleOptions,
    clampBorderWidth,
    applyMultiBorderPatch,
    lineToolbarData,
    shapeToolbarData,
    aacToolbarData,
    applyAacLabelPosition,
    canAlign,
    alignLeft,
    alignCenterH,
    alignRight,
    alignTop,
    alignCenterV,
    alignBottom,
    canDistribute,
    distributeHorizontal,
    distributeVertical,
    handleMultiColorChange,
    handleOpenFontPanel,
    handleClearSelection,
  } = useSelectionManagement({
    pages,
    selectedPageId,
    selectedIds,
    setPages,
    setSelectedIds,
    setEditingTextId,
    setSideBarMenu,
    setFontPanel,
  });

  // --- elementPanelStore 동기화: 선택 요소 타입별 PanelData를 사이드바에 전달한다 ---
  const setPanelData = useElementPanelStore((s) => s.setPanelData);
  const setMoveLayer = useElementPanelStore((s) => s.setMoveLayer);
  const setChangeAllMatchingColors = useElementPanelStore((s) => s.setChangeAllMatchingColors);
  const setHasMatchingColors = useElementPanelStore((s) => s.setHasMatchingColors);
  const setChangeAllMatchingFonts = useElementPanelStore((s) => s.setChangeAllMatchingFonts);
  const setHasMatchingFonts = useElementPanelStore((s) => s.setHasMatchingFonts);

  const elementPanelData: PanelData = useMemo(() => {
    // aacCard(v2) 복합 요소는 전용 패널에서 이미지 검색 + 박스 스타일을 한 곳에서 편집한다.
    if (selectedIds.length === 1) {
      const activePage = pages.find((p) => p.id === selectedPageId);
      const el = activePage?.elements.find((e) => e.id === selectedIds[0]);
      if (el?.type === "aacCard") {
        const hasImage = el.fill.startsWith("url(") || el.fill.startsWith("data:");
        return {
          type: "aacCardV2" as const,
          element: el,
          hasImage,
        };
      }
      if (el?.type === "emotionCard") {
        const hasImage = el.fill.startsWith("url(") || el.fill.startsWith("data:");
        return {
          type: "emotionCard" as const,
          element: el,
          hasImage,
        };
      }
      if (el?.type === "freeform") {
        return {
          type: "freeform" as const,
          element: el,
          rect: { x: el.x, y: el.y, width: el.w, height: el.h },
          closed: el.closed,
          strokeColor: el.stroke.color,
          strokeWidth: el.stroke.width,
          fillColor: el.fill,
        };
      }
    }
    // AAC 카드(레거시)를 shape보다 먼저 확인해 shape-props 패널 대신 emotion-aac 탭이 열리도록 한다.
    if (aacToolbarData) {
      return {
        type: "aac" as const,
        elementId: aacToolbarData.elementId,
        labelPosition: aacToolbarData.labelPosition,
        cardCount: aacToolbarData.cardCount,
        hasImage: aacToolbarData.hasImage,
      };
    }
    if (shapeToolbarData) {
      return {
        type: "shape" as const,
        element: shapeToolbarData.element,
        rect: shapeToolbarData.rect,
        radius: shapeToolbarData.radius,
        minRadius: shapeToolbarData.minRadius,
        maxRadius: shapeToolbarData.maxRadius,
        colorValue: shapeToolbarData.colorValue,
        borderEnabled: shapeToolbarData.borderEnabled,
        borderColor: shapeToolbarData.borderColor,
        borderWidth: shapeToolbarData.borderWidth,
        borderStyle: shapeToolbarData.borderStyle,
        isMultiShape: shapeToolbarData.isMultiShape,
        selectedShapeIds: shapeToolbarData.selectedShapeIds,
      };
    }
    if (lineToolbarData) {
      return {
        type: lineToolbarData.element.type as "line" | "arrow",
        element: lineToolbarData.element,
        stroke: lineToolbarData.stroke,
        length: lineToolbarData.length,
        angle: lineToolbarData.angle,
      };
    }
    if (selectedIds.length === 1) {
      const activePage = pages.find((p) => p.id === selectedPageId);
      const el = activePage?.elements.find((e) => e.id === selectedIds[0]);
      if (el?.type === "text") {
        return {
          type: "text" as const,
          element: el,
          isEditing: editingTextId === el.id,
        };
      }
    }
    if (isMultiColorSelection) {
      return { type: "multi" as const };
    }
    return null;
  }, [shapeToolbarData, lineToolbarData, aacToolbarData, selectedIds, pages, selectedPageId, editingTextId, isMultiColorSelection]);

  // updateLines 콜백: 선택된 선/화살표 요소에 업데이트를 적용한다
  const selectedIdsForLines = selectedIds;
  const updateLinesForPanel = useMemo(() => {
    if (!lineToolbarData) return null;
    return (updater: (el: import("../model/canvasTypes").LineElement) => Partial<import("../model/canvasTypes").LineElement>) => {
      setPages((prevPages) =>
        updateElementsByPageId(prevPages, selectedPageId, (elements) =>
          elements.map((el) => {
            if (
              selectedIdsForLines.includes(el.id) &&
              (el.type === "line" || el.type === "arrow") &&
              !el.locked
            ) {
              return { ...el, ...updater(el as import("../model/canvasTypes").LineElement) };
            }
            return el;
          }),
        ),
      );
    };
  }, [lineToolbarData, setPages, selectedPageId, selectedIdsForLines]);

  // updateElement 콜백: 특정 요소에 패치를 적용한다.
  // text 요소의 style은 얕은 병합으로 유실되지 않도록 깊은 병합을 수행한다.
  const updateElementForPanel = useMemo(() => {
    // 다중 도형 선택 시 모든 선택 도형에 패치를 브로드캐스트한다
    const broadcastIds =
      elementPanelData?.type === "shape" && elementPanelData.isMultiShape
        ? elementPanelData.selectedShapeIds ?? null
        : null;

    return (id: string, patch: Record<string, unknown>) => {
      setPages((prevPages) =>
        updateElementsByPageId(prevPages, selectedPageId, (elements) =>
          elements.map((el) => {
            const shouldPatch = broadcastIds ? broadcastIds.includes(el.id) : el.id === id;
            if (!shouldPatch) return el;
            if (el.type === "text" && patch.style && typeof patch.style === "object") {
              return {
                ...el,
                ...patch,
                style: { ...el.style, ...(patch.style as object) },
              };
            }
            // aacCard/emotionCard 복합 요소: label 내부의 style은 깊은 병합으로 유실을 방지한다
            if ((el.type === "aacCard" || el.type === "emotionCard") && patch.label && typeof patch.label === "object") {
              const labelPatch = patch.label as Record<string, unknown>;
              return {
                ...el,
                ...patch,
                label: {
                  ...el.label,
                  ...labelPatch,
                  style: labelPatch.style
                    ? { ...el.label.style, ...(labelPatch.style as object) }
                    : el.label.style,
                },
              };
            }
            // Shape textStyle deep merge — shallow merge로 textStyle 속성이 유실되는 것을 방지
            if (
              (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" ||
                el.type === "mosaic" || el.type === "circleMosaic") &&
              patch.textStyle && typeof patch.textStyle === "object"
            ) {
              return {
                ...el,
                ...patch,
                textStyle: { ...el.textStyle, ...(patch.textStyle as object) },
              };
            }
            return { ...el, ...patch };
          }),
        ),
      );
    };
  }, [setPages, selectedPageId, elementPanelData]);

  // AAC 전용: labelPosition 변경은 카드/라벨 배치를 동기화하는 별도 로직이 필요하다
  const updateElementForAac = useMemo(() => {
    return (_id: string, patch: Record<string, unknown>) => {
      if ("labelPosition" in patch) {
        applyAacLabelPosition(patch.labelPosition as import("../utils/aacBoardUtils").AacLabelPosition);
      }
    };
  }, [applyAacLabelPosition]);

  useEffect(() => {
    if (elementPanelData) {
      // aac 타입만 실제 탭(emotion-aac)을 열어야 한다. 나머지는 SideBar의 panelData 오버레이로 표시.
      if (elementPanelData.type === "aac") {
        setSideBarMenu("emotion-aac");
      }
      // 도형 선택 시 fontStore.panelFontWeight를 도형의 현재 값으로 동기화
      // — InlineFontPicker가 stale한 panelFontWeight로 폰트 변경하는 것을 방지
      if (elementPanelData.type === "shape") {
        const ts = elementPanelData.element.textStyle;
        setFontPanel({
          fontFamily: ts?.fontFamily ?? "Pretendard",
          fontWeight: ts?.fontWeight === "bold" ? 700 : 400,
        });
      }
      const updateFn = elementPanelData.type === "aac" ? updateElementForAac : updateElementForPanel;
      setPanelData(elementPanelData, updateFn, updateLinesForPanel);
    } else {
      setPanelData(null, null, null);
    }
  }, [elementPanelData, setPanelData, setSideBarMenu, setFontPanel, updateElementForPanel, updateElementForAac, updateLinesForPanel]);

  // multiCallbacks 동기화: 다중 선택 시 사이드바에 필요한 콜백과 데이터를 전달한다
  const setMultiCallbacks = useElementPanelStore((s) => s.setMultiCallbacks);
  useEffect(() => {
    if (isMultiColorSelection) {
      setMultiCallbacks({
        multiColorValue,
        onMultiColorChange: handleMultiColorChange,
        hasMultiFontTargets,
        onOpenFontPanel: handleOpenFontPanel,
        multiFontFamily,
        multiFontLabel,
        multiFontSizeInput,
        hasMultiBorderTargets,
        multiBorderEnabled,
        multiBorderColor,
        multiBorderWidth,
        activeBorderStyle,
        borderStyleOptions,
        clampBorderWidth,
        applyMultiBorderPatch,
      });
    } else {
      setMultiCallbacks(null);
    }
  }, [isMultiColorSelection, multiColorValue, handleMultiColorChange, hasMultiFontTargets, handleOpenFontPanel, multiFontFamily, multiFontLabel, multiFontSizeInput, hasMultiBorderTargets, multiBorderEnabled, multiBorderColor, multiBorderWidth, activeBorderStyle, borderStyleOptions, clampBorderWidth, applyMultiBorderPatch, setMultiCallbacks]);

  // alignmentCallbacks 동기화: 패널 타입과 무관하게 2개+ 선택 시 정렬/분배 콜백 제공
  const setAlignmentCallbacks = useElementPanelStore((s) => s.setAlignmentCallbacks);
  useEffect(() => {
    if (selectedIds.length >= 2) {
      setAlignmentCallbacks({
        canAlign,
        onAlignLeft: alignLeft,
        onAlignCenterH: alignCenterH,
        onAlignRight: alignRight,
        onAlignTop: alignTop,
        onAlignCenterV: alignCenterV,
        onAlignBottom: alignBottom,
        canDistribute,
        onDistributeHorizontal: distributeHorizontal,
        onDistributeVertical: distributeVertical,
      });
    } else {
      setAlignmentCallbacks(null);
    }
  }, [selectedIds.length, canAlign, alignLeft, alignCenterH, alignRight, alignTop, alignCenterV, alignBottom, canDistribute, distributeHorizontal, distributeVertical, setAlignmentCallbacks]);

  // moveLayer 콜백 등록
  useEffect(() => {
    const moveLayer = (elementId: string, direction: import("../utils/layerUtils").LayerDirection) => {
      setPages((prevPages) =>
        updateElementsByPageId(prevPages, selectedPageId, (elements) => {
          const index = elements.findIndex((el) => el.id === elementId);
          if (index === -1) return elements;
          return moveLayerByDirection(elements, index, direction);
        }),
      );
    };
    setMoveLayer(moveLayer);
    return () => setMoveLayer(null);
  }, [setPages, selectedPageId, setMoveLayer]);

  // 같은 색상 모두 변경: 현재 페이지의 모든 요소에서 oldColor와 일치하는 색상을 newColor로 교체한다
  useEffect(() => {
    const changeAll = (oldColor: string, newColor: string) => {
      const old = oldColor.toUpperCase();
      const next = newColor.toUpperCase();
      if (old === next) return;
      setPages((prevPages) =>
        updateElementsByPageId(prevPages, selectedPageId, (elements) =>
          elements.map((el) => {
            if (el.locked) return el;
            if (el.type === "text") {
              if ((el.style.color ?? "#000000").toUpperCase() === old) {
                return { ...el, style: { ...el.style, color: next } };
              }
              return el;
            }
            if (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic" || el.type === "aacCard" || el.type === "emotionCard") {
              const fill = (el.fill ?? "#FFFFFF").toUpperCase();
              const isImage = fill.startsWith("URL(") || fill.startsWith("DATA:");
              if (!isImage && fill === old) {
                return { ...el, fill: next };
              }
              return el;
            }
            if (el.type === "line" || el.type === "arrow") {
              if ((el.stroke?.color ?? "#000000").toUpperCase() === old) {
                return { ...el, stroke: { ...el.stroke, color: next } };
              }
              return el;
            }
            return el;
          }),
        ),
      );
    };
    setChangeAllMatchingColors(changeAll);
    return () => setChangeAllMatchingColors(null);
  }, [setPages, selectedPageId, setChangeAllMatchingColors]);

  // 현재 페이지에서 선택된 요소를 제외하고 같은 색상을 사용하는 요소가 있는지 확인한다
  useEffect(() => {
    const getElementColor = (el: import("../model/canvasTypes").CanvasElement): string | null => {
      if (el.locked) return null;
      if (el.type === "text") return (el.style.color ?? "#000000").toUpperCase();
      if (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic" || el.type === "aacCard" || el.type === "emotionCard") {
        const fill = (el.fill ?? "#FFFFFF").toUpperCase();
        if (fill.startsWith("URL(") || fill.startsWith("DATA:")) return null;
        return fill;
      }
      if (el.type === "line" || el.type === "arrow") return (el.stroke?.color ?? "#000000").toUpperCase();
      return null;
    };

    const hasMatching = (color: string): boolean => {
      const target = color.toUpperCase();
      const activePage = pagesRef.current.find((p) => p.id === selectedPageIdRef.current);
      if (!activePage) return false;
      const currentSelectedIds = selectedIdsRef.current;
      return activePage.elements.some((el) => {
        if (currentSelectedIds.includes(el.id)) return false;
        return getElementColor(el) === target;
      });
    };
    setHasMatchingColors(hasMatching);
    return () => setHasMatchingColors(null);
  }, [setHasMatchingColors]);

  // 같은 글꼴 모두 변경: 현재 페이지의 모든 텍스트/도형 요소에서 oldFont와 일치하는 글꼴을 newFont로 교체한다
  useEffect(() => {
    const changeAllFonts = (oldFont: string, newFont: string) => {
      if (oldFont === newFont) return;
      setPages((prevPages) =>
        updateElementsByPageId(prevPages, selectedPageId, (elements) =>
          elements.map((el) => {
            if (el.locked) return el;
            if (el.type === "text") {
              const current = el.style.fontFamily ?? "Pretendard";
              if (current === oldFont) {
                const nextRichText = el.richText
                  ? stripStyleTags(el.richText, "fontFamily")
                  : el.richText;
                return {
                  ...el,
                  style: { ...el.style, fontFamily: newFont },
                  ...(nextRichText !== el.richText ? { richText: nextRichText } : {}),
                };
              }
              return el;
            }
            if (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic") {
              const current = el.textStyle?.fontFamily ?? "Pretendard";
              if (current === oldFont) {
                return {
                  ...el,
                  textStyle: { ...el.textStyle, fontFamily: newFont },
                };
              }
              return el;
            }
            if (el.type === "aacCard" || el.type === "emotionCard") {
              const current = el.label.style.fontFamily ?? "Pretendard";
              if (current === oldFont) {
                return {
                  ...el,
                  label: { ...el.label, style: { ...el.label.style, fontFamily: newFont } },
                };
              }
              return el;
            }
            return el;
          }),
        ),
      );
    };
    setChangeAllMatchingFonts(changeAllFonts);
    return () => setChangeAllMatchingFonts(null);
  }, [setPages, selectedPageId, setChangeAllMatchingFonts]);

  // 현재 페이지에서 선택된 요소를 제외하고 같은 글꼴을 사용하는 요소가 있는지 확인한다
  useEffect(() => {
    const getElementFont = (el: import("../model/canvasTypes").CanvasElement): string | null => {
      if (el.locked) return null;
      if (el.type === "text") return el.style.fontFamily ?? "Pretendard";
      if (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic") {
        return el.textStyle?.fontFamily ?? "Pretendard";
      }
      if (el.type === "aacCard" || el.type === "emotionCard") {
        return el.label.style.fontFamily ?? "Pretendard";
      }
      return null;
    };

    const hasMatching = (font: string): boolean => {
      const activePage = pagesRef.current.find((p) => p.id === selectedPageIdRef.current);
      if (!activePage) return false;
      const currentSelectedIds = selectedIdsRef.current;
      return activePage.elements.some((el) => {
        if (currentSelectedIds.includes(el.id)) return false;
        return getElementFont(el) === font;
      });
    };
    setHasMatchingFonts(hasMatching);
    return () => setHasMatchingFonts(null);
  }, [setHasMatchingFonts]);

  const { handleApplyTemplateToCurrent, handleApplyTemplateToNew } =
    useTemplateApplyActions({
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
    });

  const { handleElementsChange, handleInteractionChange } =
    useCanvasStageHandlers({
      selectedPageId,
      setPages,
      beginTransaction,
      commitTransaction,
    });

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden bg-black-20">
      <div className="relative flex-1 min-w-0 min-h-0">
        <CanvasStage
          containerRef={containerRef}
          canvasRef={canvasRef}
          padding={padding}
          paperWidth={paperWidth}
          paperHeight={paperHeight}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          scale={scale}
          selectedPage={selectedPage}
          activeOrientation={activeOrientation}
          selectedIds={selectedIds}
          editingTextId={editingTextId}
          onClearSelection={handleClearSelection}
          onSelectedIdsChange={setSelectedIds}
          onEditingTextIdChange={setEditingTextId}
          onElementsChange={handleElementsChange}
          onInteractionChange={handleInteractionChange}
          onDeleteElements={handleDeleteElements}
          aiTipKey={location.key}
        />
        {/* 포커스 모드: 클릭/드래그 차단, 스크롤은 통과 */}
        {isFocusedMode && (
          <div
            className="absolute inset-0 z-50 overflow-auto"
            style={{ cursor: "default", overscrollBehavior: "contain" }}
            onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onContextMenu={(e) => { e.preventDefault(); }}
          />
        )}
      </div>
      <div className={isFocusedMode ? "hidden" : ""}>
        <EmotionSceneBanner pages={pages} selectedPageId={selectedPageId} setPages={setPages} />
      </div>
      <VocabTracingBanner pages={pages} selectedPageId={selectedPageId} />
      <div className={isFocusedMode ? "hidden" : ""}>
        <SpellCheckPanel />
        <SpellCheckToast />
      </div>
      <Suspense fallback={null}>
        <div className={`shrink-0 ${isFocusedMode ? "hidden" : ""}`}>
          <BottomBar
            pages={pages}
            selectedPageId={selectedPageId}
            onAddPage={handleAddPage}
            onSelectPage={handleSelectPage}
            onCopyPage={handleCopyPage}
            onPastePage={handlePastePage}
            onPastePages={handlePastePages}
            onReorderPages={handleReorderPages}
            onDeletePage={handleDeletePage}
            onAddPageAtIndex={handleAddPageAtIndex}
            onMovePage={handleMovePage}
            onDuplicatePage={handleDuplicatePage}
            onVisiblePageIdsChange={setVisiblePageIds}
          />
        </div>
        <TemplateChoiceDialog
          open={!!templateChoiceDialog}
          onClose={() => {
            setTemplateChoiceDialog(null);
          }}
          onApplyCurrent={handleApplyTemplateToCurrent}
          onApplyNew={handleApplyTemplateToNew}
        />
      </Suspense>
    </div>
  );
};

export default MainSection;
