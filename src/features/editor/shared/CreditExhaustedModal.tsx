/**
 * 크레딧 부족 모달 — 이미지 생성 시 크레딧이 0이거나 부족할 때 표시.
 * "더 많은 크레딧 요청하기" 버튼 포함.
 */
import { useEffect, useState } from "react";
import { Send, CheckCircle } from "lucide-react";

import BaseModal from "@/shared/ui/BaseModal";
import useToastStore from "@/shared/store/useToastStore";
import {
  requestMoreCredits,
  hasPendingCreditRequest,
} from "@/features/editor/utils/aiTemplateUsage";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";

const CreditExhaustedModal = () => {
  const isOpen = useCreditModalStore((s) => s.isOpen);
  const message = useCreditModalStore((s) => s.message);
  const close = useCreditModalStore((s) => s.close);

  const [hasRequested, setHasRequested] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      void hasPendingCreditRequest().then(setHasRequested);
    }
  }, [isOpen]);

  const handleRequest = async () => {
    if (hasRequested || isRequesting) return;
    setIsRequesting(true);
    const success = await requestMoreCredits();
    setIsRequesting(false);
    if (success) {
      setHasRequested(true);
      useToastStore.getState().showToast("크레딧 요청이 전송되었어요!");
    } else {
      useToastStore.getState().showToast("요청 전송에 실패했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={close}
      title="이미지 크레딧 부족"
      size="sm"
    >
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <p className="text-16-regular text-black-70">
          {message}
        </p>
        <div className="flex flex-col w-full gap-2">
          <button
            type="button"
            onClick={handleRequest}
            disabled={hasRequested || isRequesting}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-14-semibold transition cursor-pointer ${
              hasRequested
                ? "bg-black-10 text-black-50 cursor-default"
                : "bg-primary text-white-100 hover:bg-primary-700"
            }`}
          >
            {hasRequested ? (
              <>
                <CheckCircle className="h-4 w-4" />
                요청 완료
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {isRequesting ? "요청 중..." : "더 많은 크레딧 요청하기"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={close}
            className="w-full rounded-xl border border-black-15 px-4 py-3 text-14-semibold text-black-60 transition hover:bg-black-5 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default CreditExhaustedModal;
