import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
type ModalBackdrop = "blur" | "dark" | "none";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset?: () => void;
  closeOnBackdropClick?: boolean;
  title: string | ReactNode;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  backdrop?: ModalBackdrop;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-3xl",
  full: "max-w-4xl",
};

const BACKDROP_CLASS: Record<ModalBackdrop, string> = {
  blur: "backdrop-blur-sm",
  dark: "bg-black-90/30",
  none: "",
};

const BaseModal = ({
  isOpen,
  onClose,
  onReset,
  closeOnBackdropClick = true,
  title,
  children,
  size = "md",
  showCloseButton = true,
  backdrop = "blur",
}: BaseModalProps) => {
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

  const handleClose = () => {
    onReset?.();
    onClose();
  };

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (!closeOnBackdropClick) return;
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center overflow-hidden ${BACKDROP_CLASS[backdrop]}`}
      onClick={handleBackdropClick}
    >
      {/* 모달 배경 */}
      <div className="absolute inset-0" aria-hidden="true" />

      {/* 모달 콘텐츠 */}
      <div
        className={`relative z-10 w-full ${SIZE_CLASS[size]} rounded-2xl bg-white-100 p-6 shadow-xl max-h-[90vh] overflow-y-auto`}
        onClick={(event) => { event.stopPropagation(); }}
      >
        {/* 닫기 버튼 */}
        {showCloseButton && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-6 right-6 z-20 rounded-lg p-1 text-black-70 transition hover:bg-black-10 hover:text-black-100"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* 헤더 */}
        <div className="mb-6">
          {typeof title === "string" ? (
            <h2 className={`text-title-20-semibold text-black-100 ${showCloseButton ? "pr-8" : ""}`}>{title}</h2>
          ) : (
            <div className={showCloseButton ? "pr-8" : ""}>{title}</div>
          )}
        </div>

        {/* 컨텐츠 */}
        {children}
      </div>
    </div>
  );
};

export default BaseModal;
