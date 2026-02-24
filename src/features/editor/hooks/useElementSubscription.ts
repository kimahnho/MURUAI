/**
 * 요소 생성/수정 요청 스토어를 구독해 현재 페이지 요소 패치를 반영하는 훅.
 */
import type { Dispatch, SetStateAction } from "react";
import { useElementStore } from "../store/elementStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";

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

type ElementSubscriptionParams = {
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  setEditingTextId: Dispatch<SetStateAction<string | null>>;
  addTextElement: AddTextElement;
  addShapeElement: AddShapeElement;
  addLineElement: AddLineElement;
};

export const useElementSubscription = ({
  pagesRef,
  selectedPageIdRef,
  setPages,
  setSelectedIds,
  setEditingTextId,
  addTextElement,
  addShapeElement,
  addLineElement,
}: ElementSubscriptionParams) => {
  const createElementFromRequest = (
    requestedType: ReturnType<typeof useElementStore.getState>["requestedType"],
    activePageId: string,
    getOrientation: () => "horizontal" | "vertical" | null,
    requestedText?: TextPreset,
  ) => {
    if (requestedType === "text") {
      return addTextElement({
        pageId: activePageId,
        preset: requestedText ?? {
          text: "텍스트",
          fontSize: 14,
          fontWeight: "normal",
          alignX: "left",
          alignY: "middle",
        },
        setPages,
        getOrientation,
      });
    }
    if (
      requestedType === "rect" ||
      requestedType === "roundRect" ||
      requestedType === "ellipse"
    ) {
      return addShapeElement({
        pageId: activePageId,
        elementType: requestedType,
        setPages,
        getOrientation,
      });
    }
    if (requestedType === "line" || requestedType === "arrow") {
      return addLineElement({
        pageId: activePageId,
        elementType: requestedType,
        setPages,
        getOrientation,
      });
    }
    return null;
  };

  useStoreSubscription({
    subscribe: useElementStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.requestedType),
    onChange: (state) => {
      const activePageId = selectedPageIdRef.current;
      const getOrientation = () =>
        pagesRef.current.find((page) => page.id === activePageId)
          ?.orientation ?? null;
      // 스토어 요청 타입을 실제 요소 생성기로 매핑해
      // 구독 훅에서는 선택/편집 상태 전환만 담당한다.
      const elementId = createElementFromRequest(
        state.requestedType,
        activePageId,
        getOrientation,
        state.requestedText ?? undefined,
      );
      if (!elementId) return;
      setSelectedIds([elementId]);
      setEditingTextId(null);
    },
    deps: [
      addLineElement,
      addShapeElement,
      addTextElement,
      pagesRef,
      selectedPageIdRef,
      setEditingTextId,
      setPages,
      setSelectedIds,
    ],
  });
};
