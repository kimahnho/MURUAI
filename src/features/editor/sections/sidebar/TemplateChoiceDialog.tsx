import BaseModal from "@/shared/ui/BaseModal";

type TemplateChoiceDialogProps = {
  open: boolean;
  onClose: () => void;
  onApplyCurrent: () => void;
  onApplyNew: () => void;
};

const TemplateChoiceDialog = ({
  open,
  onClose,
  onApplyCurrent,
  onApplyNew,
}: TemplateChoiceDialogProps) => (
  <BaseModal isOpen={open} onClose={onClose} title="템플릿 적용">
    <div className="flex flex-col gap-4">
      <p className="text-14-regular text-black-70">
        템플릿을 현재 페이지에 적용할까요, 새 페이지로 추가할까요?
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onApplyCurrent}
          className="w-full px-4 py-3 text-14-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition"
        >
          현재 페이지에 적용하기
        </button>
        <button
          type="button"
          onClick={onApplyNew}
          className="w-full px-4 py-3 text-14-medium text-black-90 bg-white border border-black-25 rounded-lg hover:bg-black-5 transition"
        >
          새로운 페이지에 적용하기
        </button>
      </div>
    </div>
  </BaseModal>
);

export default TemplateChoiceDialog;
