import type { Dispatch, SetStateAction } from "react";
import { useFontStore } from "../store/fontStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { updateElementsByPageId } from "../utils/pageMutation";

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
      setPages((prevPages) =>
        updateElementsByPageId(prevPages, activePageId, (elements) =>
          elements.map((element) => {
            if (element.locked || !targetIds.includes(element.id)) {
              return element;
            }
            if (element.type === "text") {
              return {
                ...element,
                style: {
                  ...element.style,
                  ...(payload.fontFamily ? { fontFamily: payload.fontFamily } : {}),
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
                  ...(payload.fontFamily ? { fontFamily: payload.fontFamily } : {}),
                  ...(nextWeight ? { fontWeight: nextWeight } : {}),
                },
              };
            }
            return element;
          }),
        ),
      );
    },
    deps: [selectedPageIdRef, selectedIdsRef, setPages],
  });
};
