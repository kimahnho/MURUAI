import { useEffect, type MutableRefObject, type RefObject } from "react";
import {
  placeCaretAtEnd,
  placeCaretAtPoint,
  selectWordAtPoint,
} from "../textSelection";

type Point = { x: number; y: number };

type UseTextBoxSelectionEffectProps = {
  isEditing: boolean;
  editableRef: RefObject<HTMLDivElement | null>;
  pendingCaretRef: MutableRefObject<Point | null>;
  pendingWordSelectRef: MutableRefObject<Point | null>;
};

export const useTextBoxSelectionEffect = ({
  isEditing,
  editableRef,
  pendingCaretRef,
  pendingWordSelectRef,
}: UseTextBoxSelectionEffectProps) => {
  useEffect(() => {
    if (!isEditing) return;
    const frame = requestAnimationFrame(() => {
      const editable = editableRef.current;
      if (!editable) return;
      editable.focus();

      // IME 초기화를 위한 추가 프레임 대기 (한글 자모 분리 방지)
      requestAnimationFrame(() => {
        // Step 3: select word at the double-click point.
        const pendingWordSelect = pendingWordSelectRef.current;
        if (pendingWordSelect) {
          pendingWordSelectRef.current = null;
          if (selectWordAtPoint(editable, pendingWordSelect)) {
            return;
          }
        }

        // Attempt to place the caret at the click point.
        const pendingCaret = pendingCaretRef.current;
        if (pendingCaret) {
          pendingCaretRef.current = null;
          if (placeCaretAtPoint(editable, pendingCaret)) {
            return;
          }
        }

        // Default: place caret at the end without selecting all.
        placeCaretAtEnd(editable);
      });
    });

    return () => { cancelAnimationFrame(frame); };
  }, [isEditing, editableRef, pendingCaretRef, pendingWordSelectRef]);
};
