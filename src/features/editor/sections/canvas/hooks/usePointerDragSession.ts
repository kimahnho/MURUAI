import { useCallback, useEffect, useRef } from "react";

type PointerListeners = {
  moveListener: (event: PointerEvent) => void;
  upListener: () => void;
};

export type PointerDragSessionOptions<TStart, TMove> = {
  thresholdPx?: number;
  onStart?: (ctx: TStart) => void;
  onMove: (ctx: TMove) => void;
  onEnd?: (moved: boolean) => void;
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
      cleanup();
      let hasMoved = false;

      const moveListener = (event: PointerEvent) => {
        const { distance, context } = createMoveContext(event);
        if (!hasMoved && distance < thresholdPx) return;
        if (!hasMoved) {
          hasMoved = true;
          onStart?.(startContext);
        }
        onMove(context);
      };

      const upListener = () => {
        cleanup();
        onEnd?.(hasMoved);
      };

      listenersRef.current = { moveListener, upListener };
      window.addEventListener("pointermove", moveListener);
      window.addEventListener("pointerup", upListener);
    },
    [cleanup],
  );

  useEffect(() => cleanup, [cleanup]);

  return { startPointerDragSession, cleanup };
};
