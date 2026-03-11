/**
 * 폰트 패널 변경 이벤트를 구독해 선택 요소의 텍스트 스타일을 갱신하는 훅.
 */
import type { Dispatch, SetStateAction } from "react";
import { useFontStore } from "../store/fontStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { bumpPageRevision } from "../utils/pageRevision";
import { stripStyleTags } from "../sections/canvas/elements/text/textContentUtils";

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
  useStoreSubscription({
    subscribe: useFontStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.requestId !== prevState.requestId && Boolean(state.request),
    onChange: (state) => {
      const payload = state.request;
      if (!payload) return;
      const activePageId = selectedPageIdRef.current;
      const targetIds = selectedIdsRef.current;
      if (targetIds.length === 0) return;

      // 텍스트 요소와 도형 내 텍스트 스타일을 같은 요청으로 맞춰
      // 혼합 선택에서도 폰트 패널 동작이 일관되게 보이도록 한다.
      setPages((prevPages) => {
        const pageIndex = prevPages.findIndex((page) => page.id === activePageId);
        if (pageIndex < 0) return prevPages;

        const page = prevPages[pageIndex];
        let didChange = false;

        const nextElements = page.elements.map((element) => {
          if (element.locked || !targetIds.includes(element.id)) {
            return element;
          }

          if (element.type === "text") {
            const nextFontFamily = payload.fontFamily ?? element.style.fontFamily;
            const nextFontWeight =
              payload.fontWeight != null ? payload.fontWeight : element.style.fontWeight;
            const nextRichText =
              payload.fontFamily && element.richText
                ? stripStyleTags(element.richText, "fontFamily")
                : element.richText;

            const styleChanged =
              nextFontFamily !== element.style.fontFamily ||
              nextFontWeight !== element.style.fontWeight;
            const richTextChanged = nextRichText !== element.richText;
            if (!styleChanged && !richTextChanged) {
              return element;
            }

            didChange = true;
            return {
              ...element,
              style: {
                ...element.style,
                fontFamily: nextFontFamily,
                fontWeight: nextFontWeight,
              },
              ...(richTextChanged ? { richText: nextRichText } : {}),
            };
          }

          if (
            element.type === "rect" ||
            element.type === "roundRect" ||
            element.type === "ellipse" ||
            element.type === "mosaic" ||
            element.type === "circleMosaic"
          ) {
            const nextWeight =
              payload.fontWeight != null
                ? payload.fontWeight >= 700
                  ? "bold"
                  : "normal"
                : element.textStyle?.fontWeight;
            const nextFamily = payload.fontFamily ?? element.textStyle?.fontFamily;

            const styleChanged =
              nextFamily !== element.textStyle?.fontFamily ||
              nextWeight !== element.textStyle?.fontWeight;

            if (!styleChanged) {
              return element;
            }

            didChange = true;
            return {
              ...element,
              textStyle: {
                ...element.textStyle,
                ...(nextFamily != null ? { fontFamily: nextFamily } : {}),
                ...(nextWeight != null ? { fontWeight: nextWeight } : {}),
              },
            };
          }

          return element;
        });

        if (!didChange) return prevPages;

        const nextPages = [...prevPages];
        nextPages[pageIndex] = bumpPageRevision({
          ...page,
          elements: nextElements,
        });
        return nextPages;
      });
    },
    deps: [selectedPageIdRef, selectedIdsRef, setPages],
  });
};
