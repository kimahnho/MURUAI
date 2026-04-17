/**
 * 스토리북 위자드 모달 — 내용물 기반으로 자연 성장. 뷰포트 초과만 방지.
 *
 * Step 1: 좌측 설정 패널 + 우측 A4 프리뷰 (분할).
 * Step 2: 주인공/기획서 좌우 분할 (AnchorStep 내부 구성).
 * Step 5/6: 좁은 모달 (생성 중 / 완료).
 *
 * 폭/높이는 viewport 기반 clamp만 적용. 내부 스크롤은 각 패널이 담당.
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

  const hasPreview = currentStep === 1;
  const isWideLayout = currentStep === 1 || currentStep === 2;

  // Step 1/2: 좌우 분할 → 넓게 + 크게 잡아서 A4 프리뷰 카드가 시원하게 보이도록
  // Step 5/6: 좁게
  const modalSize: React.CSSProperties = isWideLayout
    ? { width: "min(1280px, 94vw)", height: "min(920px, 94vh)" }
    : { width: "min(520px, 92vw)", maxHeight: "92vh" };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden p-4">
      <div
        className="absolute inset-0 bg-black/30"
        aria-hidden="true"
        onClick={handleClose}
      />

      <div
        className="relative z-10 flex rounded-2xl bg-white-100 transition-all duration-300"
        style={{
          ...modalSize,
          boxShadow:
            "0 25px 60px -12px rgba(124, 58, 237, 0.15), 0 8px 24px -8px rgba(0,0,0,0.1)",
        }}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 rounded-full p-1.5 text-black-30 transition hover:bg-primary-50 hover:text-primary"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>

        {/* 좌측 위자드 패널 — 내부 wizard가 footer를 고정하고 content만 자체 스크롤 */}
        <div
          className={`flex flex-col min-h-0 ${
            hasPreview ? "w-full md:w-[440px] md:shrink-0 md:border-r border-black-10" : "flex-1"
          }`}
        >
          <div className="flex-1 min-h-0 p-6 overflow-hidden">
            <StorybookWizard onClose={handleClose} />
          </div>
        </div>

        {/* 우측 A4 프리뷰 (Step 1 전용) — 카드가 크게 보이도록 패딩 최소화 */}
        {hasPreview && (
          <div className="hidden md:flex flex-1 min-w-0 p-3 overflow-hidden bg-black-3 rounded-r-2xl">
            <PagePreviewPanel />
          </div>
        )}
      </div>
    </div>
  );
};

export default StorybookWizardModal;
