import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useOrientationStore } from "../store/orientationStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { updatePageById } from "../utils/pageMutation";

type OrientationSubscriptionParams = {
  selectedPageIdRef: ReadonlyRef<string>;
  isSyncingOrientationRef: MutableRefObject<boolean>;
  setPages: Dispatch<SetStateAction<Page[]>>;
};

export const useOrientationSubscription = ({
  selectedPageIdRef,
  isSyncingOrientationRef,
  setPages,
}: OrientationSubscriptionParams) => {
  useStoreSubscription({
    subscribe: useOrientationStore.subscribe,
    shouldHandle: (state, prevState) =>
      state.orientation !== prevState.orientation,
    onChange: (state) => {
      if (isSyncingOrientationRef.current) {
        // 페이지 전환 동기화로 반영된 방향 변경은 다시 setPages 하지 않고
        // 플래그만 해제해 루프를 차단한다.
        isSyncingOrientationRef.current = false;
        return;
      }
      const activePageId = selectedPageIdRef.current;
      setPages((prevPages) =>
        updatePageById(prevPages, activePageId, (page) => ({
          ...page,
          orientation: state.orientation,
        })),
      );
    },
    deps: [isSyncingOrientationRef, selectedPageIdRef, setPages],
  });
};
