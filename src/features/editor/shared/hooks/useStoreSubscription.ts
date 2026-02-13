import { useEffect } from "react";

export type StoreSubscribeFn<S> = (
  listener: (state: S, prevState: S) => void,
) => () => void;

type UseStoreSubscriptionParams<S> = {
  subscribe: StoreSubscribeFn<S>;
  shouldHandle?: (state: S, prevState: S) => boolean;
  onChange: (state: S, prevState: S) => void;
  deps?: readonly unknown[];
};

/**
 * Zustand subscribe 보일러플레이트를 공통화한다.
 * requestId 가드, cleanup, effect 의존성 패턴을 한 곳에서 유지해
 * 각 구독 훅은 도메인 조건과 반영 로직만 집중하도록 만든다.
 */
export const useStoreSubscription = <S,>({
  subscribe,
  shouldHandle,
  onChange,
  deps = [],
}: UseStoreSubscriptionParams<S>) => {
  useEffect(() => {
    const unsubscribe = subscribe((state, prevState) => {
      if (shouldHandle && !shouldHandle(state, prevState)) return;
      onChange(state, prevState);
    });
    return unsubscribe;
  }, [subscribe, shouldHandle, onChange, ...deps]);
};
