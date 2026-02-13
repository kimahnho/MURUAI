/**
 * 텍스트 편집 시작/종료 시점을 감지해 히스토리 트랜잭션 경계를 제어하는 훅.
 */
import { useEffect } from "react";

type TextEditTransactionParams = {
  editingTextId: string | null;
  beginTransaction: () => void;
  commitTransaction: (label?: string) => void;
};

export const useTextEditTransaction = ({
  editingTextId,
  beginTransaction,
  commitTransaction,
}: TextEditTransactionParams) => {
  useEffect(() => {
    if (editingTextId) {
      beginTransaction();
      return;
    }
    commitTransaction("Text edit");
  }, [editingTextId, beginTransaction, commitTransaction]);
};
