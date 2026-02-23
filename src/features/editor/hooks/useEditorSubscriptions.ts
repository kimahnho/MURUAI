/**
 * 에디터 전역 스토어 구독 훅들을 조합해 구독 생명주기를 통합 관리하는 훅.
 */
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
  elementType: "rect" | "roundRect" | "ellipse";
  setPages: Dispatch<SetStateAction<Page[]>>;
  getOrientation: () => "horizontal" | "vertical" | null;
}) => string;

type AddLineElement = (args: {
  pageId: string;
  elementType: "line" | "arrow";
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
  addTemplatePage,
  addSelectedTemplatePages,
  addAacBoardPage,
  addStoryBoardPage,
}: EditorSubscriptionsParams) => {
  const { showEmotionInferenceToast } = useTemplateNotifications();

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

  return { showEmotionInferenceToast };
};
