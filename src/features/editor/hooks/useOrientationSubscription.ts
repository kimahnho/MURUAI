/**
 * 방향 변경 이벤트를 구독해 활성 페이지의 orientation 패치를 반영하는 훅.
 * 마인드맵처럼 방향에 따라 노드 비율을 다르게 저장하는 컴포넌트가 있으면
 * 방향 변경 직후 즉시 trigger하여 레이아웃 어긋남을 막는다.
 */
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useOrientationStore } from "../store/orientationStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";
import { useStoreSubscription } from "../shared/hooks/useStoreSubscription";
import { updatePageById } from "../utils/pageMutation";
import { useWorksheetElementStore } from "../store/worksheetElementStore";

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

      // 방향이 바뀌면 이 페이지의 마인드맵 컴포넌트들은 기존 비율 좌표가 뒤틀려 보인다.
      // configChangeId를 bump하여 마인드맵 구독을 재실행 → rebuild 경로에서 현재 방향 기준으로
      // 노드 위치가 재생성된다. 캔버스에서 삭제된 노드는 여전히 prune 처리되어 유지된다.
      // setPages 반영 후 구독이 올바른 page.orientation을 읽도록 다음 tick에 트리거.
      setTimeout(() => {
        const ws = useWorksheetElementStore.getState();
        const mindMapComps = ws.insertedComponents.filter((c) => c.type === "mind_map");
        for (const comp of mindMapComps) {
          ws.updateComponentConfig(comp.id, comp.config);
        }
      }, 0);
    },
    deps: [isSyncingOrientationRef, selectedPageIdRef, setPages],
  });
};
