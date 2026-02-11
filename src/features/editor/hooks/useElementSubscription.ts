import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useElementStore } from "../store/elementStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";

type TextPreset = {
  text: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  alignX?: "left" | "center" | "right";
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
  useEffect(() => {
    const unsubscribe = useElementStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      if (!state.requestedType) return;
      const activePageId = selectedPageIdRef.current;
      const getOrientation = () =>
        pagesRef.current.find((page) => page.id === activePageId)
          ?.orientation ?? null;
      const elementId =
        state.requestedType === "text"
          ? addTextElement({
              pageId: activePageId,
              preset: state.requestedText ?? {
                text: "텍스트",
                fontSize: 14,
                fontWeight: "normal",
                alignX: "left",
                alignY: "middle",
              },
              setPages,
              getOrientation,
            })
          : state.requestedType === "rect" ||
            state.requestedType === "roundRect" ||
            state.requestedType === "ellipse"
          ? addShapeElement({
              pageId: activePageId,
              elementType: state.requestedType,
              setPages,
              getOrientation,
            })
          : state.requestedType === "line" || state.requestedType === "arrow"
          ? addLineElement({
              pageId: activePageId,
              elementType: state.requestedType,
              setPages,
              getOrientation,
            })
          : null;
      if (!elementId) return;
      setSelectedIds([elementId]);
      setEditingTextId(null);
    });
    return unsubscribe;
  }, [
    addLineElement,
    addShapeElement,
    addTextElement,
    pagesRef,
    selectedPageIdRef,
    setEditingTextId,
    setPages,
    setSelectedIds,
  ]);
};
