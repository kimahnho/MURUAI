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
