/**
 * 외부 모듈이 현재 캔버스 스냅샷을 가져갈 수 있도록 getter 등록을 관리하는 훅.
 */
import { useCallback, useEffect } from "react";
import type { CanvasDocument } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";

type CanvasGetterParams = {
  registerCanvasGetter: (getter: () => CanvasDocument) => void;
  pagesRef: ReadonlyRef<CanvasDocument["pages"]>;
};

export const useCanvasGetter = ({
  registerCanvasGetter,
  pagesRef,
}: CanvasGetterParams) => {
  const getCanvasData = useCallback<() => CanvasDocument>(
    () => ({
      pages: pagesRef.current,
    }),
    [pagesRef]
  );

  useEffect(() => {
    registerCanvasGetter(getCanvasData);
  }, [getCanvasData, registerCanvasGetter]);
};
