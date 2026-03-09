/**
 * 최신 값을 ref에 동기화해 콜백/이펙트에서 stale 값을 방지하는 훅.
 */
import { useLayoutEffect, type MutableRefObject } from "react";

export const useSyncedRef = <T>(
  ref: MutableRefObject<T>,
  value: T
) => {
  useLayoutEffect(() => {
    ref.current = value;
  }, [value]);
};
