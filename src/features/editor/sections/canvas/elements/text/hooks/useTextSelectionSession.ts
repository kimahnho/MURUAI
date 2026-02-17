import type { RefObject } from "react";
import {
  getLiveRangeInEditable,
  normalizeSelectionRange,
} from "../textSelectionSession";
import { useTextEditingSessionController } from "./useTextEditingSessionController";

export const useTextSelectionSession = ({
  isEditing,
  editableRef,
}: {
  isEditing: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
}) => {
  const controller = useTextEditingSessionController({
    isEditing,
    editableRef,
  });

  const getSelectionRange = () =>
    normalizeSelectionRange({
      editable: editableRef.current,
      snapshot: controller.selectionSnapshotRef.current,
    });

  const ensureToolbarSelection = (): { selection: Selection; range: Range } | null => {
    const editable = editableRef.current;
    if (!editable) return null;

    const live = getLiveRangeInEditable(editable);
    if (live && !live.range.collapsed) return live;

    const snapshot = controller.selectionSnapshotRef.current;
    if (snapshot && !snapshot.collapsed) {
      editable.focus();
      const restored = controller.restoreSelectionFromSnapshot();
      if (restored && !restored.range.collapsed) return restored;
    }

    const lastExpandedSnapshot =
      controller.lastExpandedSelectionSnapshotRef.current;
    if (lastExpandedSnapshot && !lastExpandedSnapshot.collapsed) {
      editable.focus();
      const restored = controller.restoreSelectionFromLastExpandedSnapshot();
      if (restored && !restored.range.collapsed) return restored;
    }

    editable.focus();
    const fallbackLive = getLiveRangeInEditable(editable);
    if (fallbackLive) return fallbackLive;

    return getSelectionRange();
  };

  const handleToolbarPointerDown = () => {
    if (!isEditing) return;
    controller.captureSelectionIfInsideEditable();
    controller.setToolbarIntent(true);
  };

  return {
    selectionSnapshotRef: controller.selectionSnapshotRef,
    beginEditingSession: controller.beginEditingSession,
    captureSelectionIfInsideEditable: controller.captureSelectionIfInsideEditable,
    setSelectionSnapshot: controller.setSelectionSnapshot,
    restoreSelectionFromSnapshot: controller.restoreSelectionFromSnapshot,
    restoreSelectionFromLastExpandedSnapshot:
      controller.restoreSelectionFromLastExpandedSnapshot,
    shouldFinishEditingOnBlur: controller.shouldFinishEditingOnBlur,
    setToolbarInputActive: controller.setToolbarInputActive,
    handleToolbarPointerDown,
    getSelectionRange,
    ensureToolbarSelection,
  };
};
