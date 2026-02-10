import { useEffect, type Dispatch, type SetStateAction } from "react";
import { useFontStore } from "../store/fontStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";

type FontSubscriptionParams = {
  selectedPageIdRef: ReadonlyRef<string>;
  selectedIdsRef: ReadonlyRef<string[]>;
  setPages: Dispatch<SetStateAction<Page[]>>;
};

export const useFontSubscription = ({
  selectedPageIdRef,
  selectedIdsRef,
  setPages,
}: FontSubscriptionParams) => {
  useEffect(() => {
    const unsubscribe = useFontStore.subscribe((state, prevState) => {
      if (state.requestId === prevState.requestId) return;
      const payload = state.request;
      if (!payload) return;
      const activePageId = selectedPageIdRef.current;
      const targetIds = selectedIdsRef.current;
      if (targetIds.length === 0) return;

      setPages((prevPages) =>
        prevPages.map((page) => {
          if (page.id !== activePageId) return page;
          return {
            ...page,
            elements: page.elements.map((element) => {
              if (element.locked || !targetIds.includes(element.id)) {
                return element;
              }
              if (element.type === "text") {
                return {
                  ...element,
                  style: {
                    ...element.style,
                    ...(payload.fontFamily
                      ? { fontFamily: payload.fontFamily }
                      : {}),
                    ...(payload.fontWeight != null
                      ? { fontWeight: payload.fontWeight }
                      : {}),
                  },
                };
              }
              if (
                element.type === "rect" ||
                element.type === "roundRect" ||
                element.type === "ellipse"
              ) {
                const nextWeight =
                  payload.fontWeight != null
                    ? payload.fontWeight >= 700
                      ? "bold"
                      : "normal"
                    : undefined;
                return {
                  ...element,
                  textStyle: {
                    ...element.textStyle,
                    ...(payload.fontFamily
                      ? { fontFamily: payload.fontFamily }
                      : {}),
                    ...(nextWeight ? { fontWeight: nextWeight } : {}),
                  },
                };
              }
              return element;
            }),
          };
        })
      );
    });
    return unsubscribe;
  }, [selectedPageIdRef, selectedIdsRef, setPages]);
};
