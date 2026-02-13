/**
 * 문서 로드 결과를 바탕으로 초기 페이지/선택 페이지 상태를 구성하는 훅.
 */
import { useMemo, useState } from "react";
import type { CanvasDocument, Page } from "../model/pageTypes";
import { buildInitialPages } from "../utils/pageFactory";

type InitialPageStateParams = {
  loadedDocument: CanvasDocument | null;
  orientation: "horizontal" | "vertical";
};

export const useInitialPageState = ({
  loadedDocument,
  orientation,
}: InitialPageStateParams) => {
  const initialPages = useMemo(
    () => buildInitialPages(loadedDocument, orientation),
    [loadedDocument, orientation]
  );
  const [pages, setPages] = useState<Page[]>(() => initialPages);
  const [selectedPageId, setSelectedPageId] = useState<string>(
    () => initialPages[0].id
  );

  return { pages, setPages, selectedPageId, setSelectedPageId };
};
