/**
 * 어휘 따라쓰기 칸 크기 선택 모달.
 * 작게/중간/크게 3단계 중 A4 폭에 맞는 크기만 선택 가능하다.
 */
import BaseModal from "@/shared/ui/BaseModal";
import Button from "@/shared/ui/Button";

import {
  CELL_SIZE_PRESETS,
  canFitInPage,
  type VocabCellSize,
} from "../../utils/tracingGridUtils";

interface VocabTracingSizeModalProps {
  isOpen: boolean;
  cellSize: VocabCellSize;
  maxCharCount: number;
  onClose: () => void;
  onChangeCellSize: (size: VocabCellSize) => void;
  onConfirm: () => void;
}

const SIZE_KEYS: VocabCellSize[] = ["small", "medium", "large"];

const VocabTracingSizeModal = ({
  isOpen,
  cellSize,
  maxCharCount,
  onClose,
  onChangeCellSize,
  onConfirm,
}: VocabTracingSizeModalProps) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="따라쓰기 크기 설정" size="sm">
      <div className="flex flex-col gap-5 p-1">
        {/* 크기 선택 버튼 */}
        <div className="flex gap-2">
          {SIZE_KEYS.map((key) => {
            const preset = CELL_SIZE_PRESETS[key];
            const fits = canFitInPage(maxCharCount, key);
            const isSelected = cellSize === key;

            return (
              <button
                key={key}
                type="button"
                disabled={!fits}
                onClick={() => onChangeCellSize(key)}
                className={`flex-1 rounded-xl py-3 text-14-semibold transition ${
                  isSelected
                    ? "border-2 border-primary bg-primary-50 text-primary"
                    : fits
                      ? "border border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
                      : "cursor-not-allowed border border-black-15 text-black-30"
                }`}
              >
                {preset.label}
                <span className="block text-12-regular mt-0.5">
                  {preset.cellMm}mm
                </span>
              </button>
            );
          })}
        </div>

        {/* 안내 문구 */}
        {!canFitInPage(maxCharCount, cellSize) && (
          <p className="text-12-regular text-error-700">
            선택한 크기는 단어 길이에 비해 용지에 맞지 않습니다.
          </p>
        )}

        {/* 확인 버튼 */}
        <Button
          variant="primary"
          fullWidth
          onClick={onConfirm}
          disabled={!canFitInPage(maxCharCount, cellSize)}
        >
          생성하기
        </Button>
      </div>
    </BaseModal>
  );
};

export default VocabTracingSizeModal;
