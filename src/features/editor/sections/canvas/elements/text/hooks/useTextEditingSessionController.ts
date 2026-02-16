import { useEffect, useRef, useState, type RefObject } from "react";
import {
  cloneRangeSafely,
  getLiveRangeInEditable,
  isRangeInEditable,
  restoreSelectionSnapshot,
  type TextSelectionSnapshot,
} from "../textSelectionSession";

type SessionMode = "idle" | "editing" | "toolbar_typing";

type ToolbarIntent = {
  insideToolbar: boolean;
  typingField: "fontSize" | null;
  ts: number;
};

type ShouldFinishEditingOnBlurArgs = {
  relatedTarget: HTMLElement | null;
  pointer: { x: number; y: number };
};

const TOOLBAR_BLUR_GUARD_MS = 200;

const isElementInToolbar = (element: HTMLElement | null): boolean =>
  Boolean(
    element?.closest("#text-toolbar-root") ||
      element?.closest("[data-textbox-toolbar]")
  );

const isPointInToolbar = (x: number, y: number): boolean => {
  const toolbarRoot = document.getElementById("text-toolbar-root");
  const toolbarElements = document.querySelectorAll("[data-textbox-toolbar]");
  if (toolbarRoot) {
    const rect = toolbarRoot.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      const children = toolbarRoot.querySelectorAll(".pointer-events-auto");
      for (const child of children) {
        const childRect = child.getBoundingClientRect();
        if (
          x >= childRect.left &&
          x <= childRect.right &&
          y >= childRect.top &&
          y <= childRect.bottom
        ) {
          return true;
        }
      }
    }
  }
  for (const el of toolbarElements) {
    const rect = el.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return true;
    }
  }
  return false;
};

export const useTextEditingSessionController = ({
  isEditing,
  editableRef,
}: {
  isEditing: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
}) => {
  const [mode, setMode] = useState<SessionMode>(isEditing ? "editing" : "idle");
  const modeRef = useRef<SessionMode>(isEditing ? "editing" : "idle");
  const revisionRef = useRef(0);
  const selectionSnapshotRef = useRef<TextSelectionSnapshot | null>(null);
  const toolbarIntentRef = useRef<ToolbarIntent>({
    insideToolbar: false,
    typingField: null,
    ts: 0,
  });

  const captureSelectionIfInsideEditable = () => {
    const editable = editableRef.current;
    const live = getLiveRangeInEditable(editable);
    if (!live) return;
    // toolbar typing 중이거나 최근 toolbar pointerdown intent가 있는 상태에서
    // blur/focus 왕복으로 발생하는 collapsed selection으로
    // 기존 드래그 선택 snapshot이 덮어써지는 것을 막는다.
    const hasRecentToolbarIntent =
      toolbarIntentRef.current.insideToolbar &&
      Date.now() - toolbarIntentRef.current.ts < TOOLBAR_BLUR_GUARD_MS;
    if (
      (modeRef.current === "toolbar_typing" || hasRecentToolbarIntent) &&
      live.range.collapsed &&
      selectionSnapshotRef.current &&
      !selectionSnapshotRef.current.range.collapsed
    ) {
      return;
    }
    const cloned = cloneRangeSafely(live.range);
    if (!cloned) return;
    revisionRef.current += 1;
    selectionSnapshotRef.current = {
      range: cloned,
      revision: revisionRef.current,
    };
  };

  const setSelectionSnapshot = (range: Range | null) => {
    const editable = editableRef.current;
    if (!range || !editable || !isRangeInEditable(range, editable)) return;
    const cloned = cloneRangeSafely(range);
    if (!cloned) return;
    revisionRef.current += 1;
    selectionSnapshotRef.current = {
      range: cloned,
      revision: revisionRef.current,
    };
  };

  const restoreSelectionFromSnapshot = () => {
    const editable = editableRef.current;
    const snapshot = selectionSnapshotRef.current;
    if (!editable || !snapshot) return null;
    // DOM에서 분리된 노드를 참조하는 snapshot은 무효화한다
    if (
      !document.contains(snapshot.range.startContainer) ||
      !document.contains(snapshot.range.endContainer)
    ) {
      selectionSnapshotRef.current = null;
      return null;
    }
    if (!isRangeInEditable(snapshot.range, editable)) return null;
    return restoreSelectionSnapshot(snapshot);
  };

  const setToolbarIntent = (intent: Partial<ToolbarIntent>) => {
    toolbarIntentRef.current = {
      ...toolbarIntentRef.current,
      ...intent,
      ts: Date.now(),
    };
  };

  const startToolbarTyping = (field: "fontSize") => {
    modeRef.current = "toolbar_typing";
    setMode("toolbar_typing");
    setToolbarIntent({ insideToolbar: true, typingField: field });
  };

  const endToolbarTyping = () => {
    modeRef.current = "editing";
    setMode("editing");
    setToolbarIntent({ typingField: null });
  };

  const shouldFinishEditingOnBlur = ({
    relatedTarget,
    pointer,
  }: ShouldFinishEditingOnBlurArgs) => {
    const activeElement = document.activeElement as HTMLElement | null;
    const pointedToolbar = isPointInToolbar(pointer.x, pointer.y);
    const relatedToolbar = isElementInToolbar(relatedTarget);
    const activeToolbar = isElementInToolbar(activeElement);
    const recentToolbarIntent =
      Date.now() - toolbarIntentRef.current.ts < TOOLBAR_BLUR_GUARD_MS &&
      toolbarIntentRef.current.insideToolbar;

    if (
      modeRef.current === "toolbar_typing" ||
      pointedToolbar ||
      relatedToolbar ||
      activeToolbar ||
      recentToolbarIntent
    ) {
      return false;
    }
    return true;
  };

  useEffect(() => {
    const nextMode = isEditing ? "editing" : "idle";
    modeRef.current = nextMode;
    setMode(nextMode);
    if (!isEditing) {
      toolbarIntentRef.current = { insideToolbar: false, typingField: null, ts: 0 };
      return;
    }

    const handlePointerDownCapture = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (isElementInToolbar(target)) {
        setToolbarIntent({ insideToolbar: true });
      } else {
        setToolbarIntent({ insideToolbar: false, typingField: null });
      }
    };

    const handleFocusInCapture = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (isElementInToolbar(target)) {
        setToolbarIntent({ insideToolbar: true });
      }
    };

    document.addEventListener("pointerdown", handlePointerDownCapture, true);
    document.addEventListener("focusin", handleFocusInCapture, true);
    captureSelectionIfInsideEditable();
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownCapture, true);
      document.removeEventListener("focusin", handleFocusInCapture, true);
    };
  }, [isEditing]);

  return {
    mode,
    selectionSnapshotRef,
    beginEditingSession: () => setMode("editing"),
    captureSelectionIfInsideEditable,
    setSelectionSnapshot,
    restoreSelectionFromSnapshot,
    setToolbarIntent,
    shouldFinishEditingOnBlur,
    startToolbarTyping,
    endToolbarTyping,
  };
};
