/**
 * 스토리북 위자드 모달 — 좌측 위자드 + 우측 페이지 프리뷰(4단계) 2분할 레이아웃.
 */
import { useEffect } from "react";
import { X } from "lucide-react";

import { useStorybookWizardStore } from "../store/useStorybookWizardStore";
import StorybookWizard from "./StorybookWizard";
import PagePreviewPanel from "./PagePreviewPanel";

interface StorybookWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StorybookWizardModal = ({ isOpen, onClose }: StorybookWizardModalProps) => {
  const reset = useStorybookWizardStore((s) => s.reset);
  const isLoading = useStorybookWizardStore((s) => s.isLoading);
  const currentStep = useStorybookWizardStore((s) => s.currentStep);

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  const hasPreview = currentStep === 4 || currentStep === 45;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-black/20" aria-hidden="true" />

      <div
        className={`relative z-10 flex rounded-2xl bg-white-100 shadow-2xl max-h-[85vh] transition-all duration-300 ${
          hasPreview ? "w-full max-w-4xl" : "w-full max-w-lg"
        }`}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-black-40 transition hover:bg-black-10 hover:text-black-80"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 좌측: 위자드 */}
        <div
          className={`flex flex-col shrink-0 ${
            hasPreview ? "w-95 border-r border-black-10" : "w-full"
          }`}
        >
          <div className="flex-1 min-h-0 p-6">
            <StorybookWizard />
          </div>
        </div>

        {/* 우측: 페이지 프리뷰 (4단계) */}
        {hasPreview && (
          <div className="flex-1 min-w-0 p-6 overflow-y-auto bg-black-3 rounded-r-2xl">
            <PagePreviewPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default StorybookWizardModal;
