import {
  useEffect,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import { useOrientationStore } from "../store/orientationStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { bumpPageRevision } from "../utils/pageRevision";

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
  useEffect(() => {
    const unsubscribe = useOrientationStore.subscribe((state, prevState) => {
      if (state.orientation === prevState.orientation) return;
      if (isSyncingOrientationRef.current) {
        isSyncingOrientationRef.current = false;
        return;
      }
      const activePageId = selectedPageIdRef.current;
      setPages((prevPages) =>
        prevPages.map((page) =>
          page.id === activePageId
            ? bumpPageRevision({ ...page, orientation: state.orientation })
            : page
        )
      );
    });
    return unsubscribe;
  }, [isSyncingOrientationRef, selectedPageIdRef, setPages]);
};
