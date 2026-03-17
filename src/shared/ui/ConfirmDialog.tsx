import BaseModal from "@/shared/ui/BaseModal";
import Button from "@/shared/ui/Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  isLoading?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      backdrop="dark"
      closeOnBackdropClick={false}
      showCloseButton={false}
    >
      <p className="text-15-regular text-black-70 mb-6">{description}</p>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === "danger" ? "destructive" : "primary"}
          size="md"
          onClick={onConfirm}
          isLoading={isLoading}
        >
          {confirmLabel}
        </Button>
      </div>
    </BaseModal>
  );
};

export default ConfirmDialog;
