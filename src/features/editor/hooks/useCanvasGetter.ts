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
