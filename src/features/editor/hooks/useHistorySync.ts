import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import { useUnifiedHistoryStore } from "../store/unifiedHistoryStore";
import { usePageSwapStore } from "../store/pageSwapStore";
import type { Page } from "../model/pageTypes";
import type { ReadonlyRef } from "../model/refTypes";

type HistoryInit = (
  pages: Page[],
  selectedPageId: string,
  selectedIds: string[]
) => void;
type HistoryRecord = (
  pages: Page[],
  selectedPageId: string,
  selectedIds: string[],
  label?: string
) => void;
type HistoryRequest = () => void;

type HistorySyncParams = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  pagesRef: ReadonlyRef<Page[]>;
  selectedPageIdRef: ReadonlyRef<string>;
  selectedIdsRef: ReadonlyRef<string[]>;
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedPageId: Dispatch<SetStateAction<string>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  isApplyingHistoryRef: MutableRefObject<boolean>;
  isApplyingTemplateRef: MutableRefObject<boolean>;
};

type HistoryInitParams = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  historyInit: HistoryInit;
  isInitializedRef: MutableRefObject<boolean>;
};

const useHistoryInitialization = ({
  pages,
  selectedPageId,
  selectedIds,
  historyInit,
  isInitializedRef,
}: HistoryInitParams) => {
  useEffect(() => {
    if (!isInitializedRef.current && pages.length > 0) {
      historyInit(pages, selectedPageId, selectedIds);
      isInitializedRef.current = true;
    }
  }, [pages, selectedPageId, selectedIds, historyInit, isInitializedRef]);
};

type HistoryRecordParams = {
  pages: Page[];
  selectedPageId: string;
  selectedIds: string[];
  historyRecord: HistoryRecord;
  historyTransactionActive: boolean;
  undoRequestId: number;
  redoRequestId: number;
  isApplyingHistoryRef: MutableRefObject<boolean>;
  isApplyingTemplateRef: MutableRefObject<boolean>;
  isSwapping: boolean;
  isInitializedRef: MutableRefObject<boolean>;
};

const useHistoryRecordEffect = ({
  pages,
  selectedPageId,
  selectedIds,
  historyRecord,
  historyTransactionActive,
  undoRequestId,
  redoRequestId,
  isApplyingHistoryRef,
  isApplyingTemplateRef,
  isSwapping,
  isInitializedRef,
}: HistoryRecordParams) => {
  const lastUndoRequestIdRef = useRef(0);
  const lastRedoRequestIdRef = useRef(0);
  const blockRecordUntilRef = useRef(0);

  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (isApplyingHistoryRef.current) return;
    if (isApplyingTemplateRef.current) return;
    if (isSwapping) return;

    if (
      undoRequestId !== lastUndoRequestIdRef.current ||
      redoRequestId !== lastRedoRequestIdRef.current
    ) {
      lastUndoRequestIdRef.current = undoRequestId;
      lastRedoRequestIdRef.current = redoRequestId;
      blockRecordUntilRef.current = Date.now() + 100;
      return;
    }

    if (Date.now() < blockRecordUntilRef.current) return;
    if (historyTransactionActive) return;

    historyRecord(pages, selectedPageId, selectedIds);
  }, [
    pages,
    selectedPageId,
    selectedIds,
    historyRecord,
    historyTransactionActive,
    undoRequestId,
    redoRequestId,
    isApplyingHistoryRef,
    isApplyingTemplateRef,
    isSwapping,
    isInitializedRef,
  ]);
};

type HistorySubscriptionParams = {
  setPages: Dispatch<SetStateAction<Page[]>>;
  setSelectedPageId: Dispatch<SetStateAction<string>>;
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  isApplyingHistoryRef: MutableRefObject<boolean>;
};

const useHistorySubscriptionEffect = ({
  setPages,
  setSelectedPageId,
  setSelectedIds,
  isApplyingHistoryRef,
}: HistorySubscriptionParams) => {
  const applyHistoryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    const unsubscribe = useUnifiedHistoryStore.subscribe(
      (state, prevState) => {
        const undoChanged = state.undoRequestId !== prevState.undoRequestId;
        const redoChanged = state.redoRequestId !== prevState.redoRequestId;
        if (!undoChanged && !redoChanged) return;
        if (!state.present) return;

        isApplyingHistoryRef.current = true;
        setPages(state.present.pages);
        setSelectedPageId(state.present.selectedPageId);
        setSelectedIds(state.present.selectedIds);

        if (applyHistoryTimeoutRef.current) {
          clearTimeout(applyHistoryTimeoutRef.current);
        }
        applyHistoryTimeoutRef.current = setTimeout(() => {
          isApplyingHistoryRef.current = false;
        }, 150);
      }
    );

    return () => {
      unsubscribe();
      if (applyHistoryTimeoutRef.current) {
        clearTimeout(applyHistoryTimeoutRef.current);
      }
    };
  }, [setPages, setSelectedPageId, setSelectedIds, isApplyingHistoryRef]);
};

type HistoryKeybindingsParams = {
  historyRequestUndo: HistoryRequest;
  historyRequestRedo: HistoryRequest;
};

const useHistoryKeybindings = ({
  historyRequestUndo,
  historyRequestRedo,
}: HistoryKeybindingsParams) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) {
          historyRequestRedo();
        } else {
          historyRequestUndo();
        }
      } else if (event.key.toLowerCase() === "y" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        historyRequestRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [historyRequestRedo, historyRequestUndo]);
};

export const useHistorySync = ({
  pages,
  selectedPageId,
  selectedIds,
  pagesRef,
  selectedPageIdRef,
  selectedIdsRef,
  setPages,
  setSelectedPageId,
  setSelectedIds,
  isApplyingHistoryRef,
  isApplyingTemplateRef,
}: HistorySyncParams) => {
  const historyInit = useUnifiedHistoryStore((state) => state.init);
  const historyRecord = useUnifiedHistoryStore((state) => state.record);
  const historyBeginTransaction = useUnifiedHistoryStore(
    (state) => state.beginTransaction
  );
  const historyCommitTransaction = useUnifiedHistoryStore(
    (state) => state.commitTransaction
  );
  const historyRequestUndo = useUnifiedHistoryStore(
    (state) => state.requestUndo
  );
  const historyRequestRedo = useUnifiedHistoryStore(
    (state) => state.requestRedo
  );
  const historyTransactionActive = useUnifiedHistoryStore(
    (state) => state.transactionActive
  );
  const undoRequestId = useUnifiedHistoryStore((state) => state.undoRequestId);
  const redoRequestId = useUnifiedHistoryStore((state) => state.redoRequestId);
  const swapInFlight = usePageSwapStore((state) => state.swapInFlight);

  const isInitializedRef = useRef(false);
  const isTransactionActiveRef = useRef(false);

  useHistoryInitialization({
    pages,
    selectedPageId,
    selectedIds,
    historyInit,
    isInitializedRef,
  });

  useHistoryRecordEffect({
    pages,
    selectedPageId,
    selectedIds,
    historyRecord,
    historyTransactionActive,
    undoRequestId,
    redoRequestId,
    isApplyingHistoryRef,
    isApplyingTemplateRef,
    isSwapping: swapInFlight > 0,
    isInitializedRef,
  });

  useHistorySubscriptionEffect({
    setPages,
    setSelectedPageId,
    setSelectedIds,
    isApplyingHistoryRef,
  });

  useHistoryKeybindings({ historyRequestUndo, historyRequestRedo });

  const beginTransaction = useCallback(() => {
    if (isTransactionActiveRef.current) return;
    isTransactionActiveRef.current = true;
    historyBeginTransaction(
      pagesRef.current,
      selectedPageIdRef.current,
      selectedIdsRef.current
    );
  }, [historyBeginTransaction, pagesRef, selectedPageIdRef, selectedIdsRef]);

  const commitTransaction = useCallback(
    (label?: string) => {
      if (!isTransactionActiveRef.current) return;
      isTransactionActiveRef.current = false;
      historyCommitTransaction(
        pagesRef.current,
        selectedPageIdRef.current,
        selectedIdsRef.current,
        label
      );
    },
    [historyCommitTransaction, pagesRef, selectedPageIdRef, selectedIdsRef]
  );

  const recordHistory = useCallback(
    (label?: string) => {
      historyRecord(
        pagesRef.current,
        selectedPageIdRef.current,
        selectedIdsRef.current,
        label
      );
    },
    [historyRecord, pagesRef, selectedPageIdRef, selectedIdsRef]
  );

  return { beginTransaction, commitTransaction, recordHistory };
};
