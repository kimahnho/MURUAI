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

      // 입력기(IME) 초기화를 위해 한 프레임 더 대기해 한글 자모 분리를 방지한다.
      requestAnimationFrame(() => {
        // 더블클릭 진입이면 클릭 지점 단어 선택을 먼저 복원한다.
        const pendingWordSelect = pendingWordSelectRef.current;
        if (pendingWordSelect) {
          pendingWordSelectRef.current = null;
          if (selectWordAtPoint(editable, pendingWordSelect)) {
            return;
          }
        }

        // 단일 클릭 진입이면 클릭 지점 커서 배치를 우선 시도한다.
        const pendingCaret = pendingCaretRef.current;
        if (pendingCaret) {
          pendingCaretRef.current = null;
          if (placeCaretAtPoint(editable, pendingCaret)) {
            return;
          }
        }

        // 복원 정보가 없으면 전체 선택 대신 문장 끝 커서로 시작한다.
        placeCaretAtEnd(editable);
      });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [isEditing, editableRef, pendingCaretRef, pendingWordSelectRef]);
};
