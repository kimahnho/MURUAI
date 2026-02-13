import { useEffect, type MutableRefObject } from "react";

export const useSyncedRef = <T>(
  ref: MutableRefObject<T>,
  value: T
) => {
  useEffect(() => {
    ref.current = value;
  }, [ref, value]);
};
