import { useCallback, useEffect, useRef, type RefObject } from "react";
import {
  getLiveRangeInEditable,
  isRangeInEditable,
  restoreSerializedSelection,
  serializeRangeSnapshot,
  type SerializedRangeSnapshot,
} from "../textSelectionSession";

type ToolbarIntent = {
  insideToolbar: boolean;
  ts: number;
};

type ShouldFinishEditingOnBlurArgs = {
  relatedTarget: HTMLElement | null;
};

const TOOLBAR_BLUR_GUARD_MS = 120;

const isElementInToolbar = (element: HTMLElement | null): boolean =>
  Boolean(
    element?.closest("[data-textbox-toolbar]") ||
      element?.closest("[data-text-props-panel]")
  );

export const useTextEditingSessionController = ({
  isEditing,
  editableRef,
}: {
  isEditing: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
}) => {
  const revisionRef = useRef(0);
  const selectionSnapshotRef = useRef<SerializedRangeSnapshot | null>(null);
  const lastExpandedSelectionSnapshotRef = useRef<SerializedRangeSnapshot | null>(
    null,
  );
  const toolbarIntentRef = useRef<ToolbarIntent>({
    insideToolbar: false,
    ts: 0,
  });
  const toolbarInputActiveRef = useRef(false);

  const commitSelectionSnapshot = useCallback(
    (snapshot: SerializedRangeSnapshot | null) => {
      if (!snapshot) return;
      selectionSnapshotRef.current = snapshot;
      if (!snapshot.collapsed) {
        lastExpandedSelectionSnapshotRef.current = snapshot;
      }
    },
    [],
  );

  const captureSelectionIfInsideEditable = useCallback(() => {
    const editable = editableRef.current;
    const live = getLiveRangeInEditable(editable);
    if (!editable || !live) return;

    const activeElement = document.activeElement as HTMLElement | null;
    const focusLeftEditable = activeElement !== editable;
    const hasToolbarIntent = toolbarIntentRef.current.insideToolbar;
    const recentToolbarIntent =
      hasToolbarIntent &&
      Date.now() - toolbarIntentRef.current.ts < TOOLBAR_BLUR_GUARD_MS;

    if (
      (hasToolbarIntent ||
        recentToolbarIntent ||
        toolbarInputActiveRef.current ||
        focusLeftEditable) &&
      live.range.collapsed &&
      selectionSnapshotRef.current &&
      !selectionSnapshotRef.current.collapsed
    ) {
      return;
    }

    revisionRef.current += 1;
    const snapshot = serializeRangeSnapshot({
      range: live.range,
      editable,
      revision: revisionRef.current,
    });
    commitSelectionSnapshot(snapshot);
  }, [editableRef, commitSelectionSnapshot]);

  const setSelectionSnapshot = useCallback((range: Range | null) => {
    const editable = editableRef.current;
    if (!range || !editable || !isRangeInEditable(range, editable)) return;

    revisionRef.current += 1;
    const snapshot = serializeRangeSnapshot({
      range,
      editable,
      revision: revisionRef.current,
    });
    commitSelectionSnapshot(snapshot);
  }, [editableRef, commitSelectionSnapshot]);

  const restoreSelectionFromSnapshot = useCallback(() => {
    return restoreSerializedSelection({
      snapshot: selectionSnapshotRef.current,
      editable: editableRef.current,
    });
  }, [editableRef]);

  const restoreSelectionFromLastExpandedSnapshot = useCallback(() => {
    return restoreSerializedSelection({
      snapshot: lastExpandedSelectionSnapshotRef.current,
      editable: editableRef.current,
    });
  }, [editableRef]);

  const setToolbarIntent = useCallback((insideToolbar: boolean) => {
    toolbarIntentRef.current = {
      insideToolbar,
      ts: Date.now(),
    };
  }, []);

  const setToolbarInputActive = useCallback((active: boolean) => {
    toolbarInputActiveRef.current = active;
  }, []);

  const shouldFinishEditingOnBlur = ({
    relatedTarget,
  }: ShouldFinishEditingOnBlurArgs) => {
    const activeElement = document.activeElement as HTMLElement | null;
    const relatedToolbar = isElementInToolbar(relatedTarget);
    const activeToolbar = isElementInToolbar(activeElement);
    const hasToolbarIntent = toolbarIntentRef.current.insideToolbar;
    const recentToolbarIntent =
      hasToolbarIntent &&
      Date.now() - toolbarIntentRef.current.ts < TOOLBAR_BLUR_GUARD_MS;

    if (
      relatedToolbar ||
      activeToolbar ||
      hasToolbarIntent ||
      recentToolbarIntent ||
      toolbarInputActiveRef.current
    ) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!isEditing) {
      toolbarIntentRef.current = { insideToolbar: false, ts: 0 };
      toolbarInputActiveRef.current = false;
      selectionSnapshotRef.current = null;
      lastExpandedSelectionSnapshotRef.current = null;
      return;
    }

    const handlePointerDownCapture = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      setToolbarIntent(isElementInToolbar(target));
    };

    const handleFocusInCapture = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (isElementInToolbar(target)) {
        setToolbarIntent(true);
      }
    };

    document.addEventListener("pointerdown", handlePointerDownCapture, true);
    document.addEventListener("focusin", handleFocusInCapture, true);
    captureSelectionIfInsideEditable();

    return () => {
      document.removeEventListener("pointerdown", handlePointerDownCapture, true);
      document.removeEventListener("focusin", handleFocusInCapture, true);
    };
  }, [isEditing, captureSelectionIfInsideEditable, setToolbarIntent]);

  return {
    selectionSnapshotRef,
    lastExpandedSelectionSnapshotRef,
    beginEditingSession: () => undefined,
    captureSelectionIfInsideEditable,
    setSelectionSnapshot,
    restoreSelectionFromSnapshot,
    restoreSelectionFromLastExpandedSnapshot,
    shouldFinishEditingOnBlur,
    setToolbarIntent,
    setToolbarInputActive,
  };
};
