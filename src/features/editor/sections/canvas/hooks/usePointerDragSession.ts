/**
 * 포인터 다운/무브/업 세션을 공통 처리해 클릭-드래그 구분과 cleanup을 표준화하는 훅.
 */
import { useCallback, useEffect, useRef } from "react";

type PointerListeners = {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
  cancelListener: () => void;
  blurListener: () => void;
  visibilityChangeListener: () => void;
};

export type PointerDragEndReason =
  | "pointerup"
  | "pointercancel"
  | "blur"
  | "visibilitychange";

export type PointerDragSessionOptions<TStart, TMove> = {
  thresholdPx?: number;
  onStart?: (ctx: TStart) => void;
  onMove: (ctx: TMove) => void;
  onEnd?: (moved: boolean, reason?: PointerDragEndReason) => void;
};

type StartPointerDragSessionParams<TStart, TMove> =
  PointerDragSessionOptions<TStart, TMove> & {
    startContext: TStart;
    createMoveContext: (event: PointerEvent) => {
      distance: number;
      context: TMove;
    };
  };

export const usePointerDragSession = () => {
  const listenersRef = useRef<PointerListeners | null>(null);

  const cleanup = useCallback(() => {
    const listeners = listenersRef.current;
    if (!listeners) return;
    window.removeEventListener("pointermove", listeners.moveListener);
    window.removeEventListener("pointerup", listeners.upListener);
    window.removeEventListener("pointercancel", listeners.cancelListener);
    window.removeEventListener("blur", listeners.blurListener);
    document.removeEventListener(
      "visibilitychange",
      listeners.visibilityChangeListener,
    );
    listenersRef.current = null;
  }, []);

  const startPointerDragSession = useCallback(
    <TStart, TMove>({
      thresholdPx = 3,
      onStart,
      onMove,
      onEnd,
      startContext,
      createMoveContext,
    }: StartPointerDragSessionParams<TStart, TMove>) => {
      // 새 세션 시작 전 이전 리스너를 정리해 다중 pointer 세션 중첩을 방지한다.
      cleanup();
      let hasMoved = false;
      let ended = false;

      const finish = (reason: PointerDragEndReason) => {
        if (ended) return;
        ended = true;
        cleanup();
        onEnd?.(hasMoved, reason);
      };

      const moveListener = (event: PointerEvent) => {
        const { distance, context } = createMoveContext(event);
        // threshold 전 구간은 클릭 후보로 간주해 드래그 onStart/onMove를 호출하지 않는다.
        if (!hasMoved && distance < thresholdPx) return;
        if (!hasMoved) {
          hasMoved = true;
          onStart?.(startContext);
        }
        onMove(context);
      };

      const upListener = () => {
        finish("pointerup");
      };

      const cancelListener = () => {
        finish("pointercancel");
      };

      const blurListener = () => {
        finish("blur");
      };

      const visibilityChangeListener = () => {
        if (document.visibilityState === "hidden") {
          finish("visibilitychange");
        }
      };

      listenersRef.current = {
        moveListener,
        upListener,
        cancelListener,
        blurListener,
        visibilityChangeListener,
      };
      window.addEventListener("pointermove", moveListener);
      window.addEventListener("pointerup", upListener);
      window.addEventListener("pointercancel", cancelListener);
      window.addEventListener("blur", blurListener);
      document.addEventListener("visibilitychange", visibilityChangeListener);
    },
    [cleanup],
  );

  useEffect(() => cleanup, [cleanup]);

  return { startPointerDragSession, cleanup };
};
