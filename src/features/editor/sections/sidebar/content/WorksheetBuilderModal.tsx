/**
 * 학습자료 편집 모달 — BaseModal 안에 Palette + PreviewPanel + EditorPanel 재사용.
 * 완성 후 "캔버스에 적용" 클릭 시 Page 변환 후 캔버스에 삽입.
 */
import BaseModal from "@/shared/ui/BaseModal";
import Button from "@/shared/ui/Button";
import { useWorksheetStore } from "@/features/worksheet-editor/store/worksheetStore";
import Palette from "@/features/worksheet-editor/sections/Palette";
import PreviewPanel from "@/features/worksheet-editor/sections/PreviewPanel";
import EditorPanel from "@/features/worksheet-editor/sections/EditorPanel";
import { buildWorksheetPage } from "@/features/editor/utils/buildWorksheetPage";
import { EXAMPLE_1_EUUMHWA, EXAMPLE_2_PARENTS_DAY, EXAMPLE_3_VOCABULARY } from "@/features/worksheet-editor/utils/examples";

interface WorksheetBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (page: ReturnType<typeof buildWorksheetPage>) => void;
}

const WorksheetBuilderModal = ({ isOpen, onClose, onApply }: WorksheetBuilderModalProps) => {
  const components = useWorksheetStore((s) => s.components);
  const setComponents = useWorksheetStore((s) => s.setComponents);

  const handleApply = () => {
    if (components.length === 0) return;
    const page = buildWorksheetPage(components);
    onApply(page);
    // 모달 닫기 + 스토어 초기화
    setComponents([]);
    onClose();
  };

  const handleClose = () => {
    setComponents([]);
    onClose();
  };

  const handleLoadExample = (data: typeof EXAMPLE_1_EUUMHWA) => {
    const cloned = data.map((c) => ({ ...structuredClone(c), id: crypto.randomUUID() }));
    setComponents(cloned);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={handleClose} title="" size="full" showCloseButton={false}>
      <div className="flex flex-col" style={{ height: "75vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black-25">
          <div className="flex items-center gap-3">
            <span className="text-title-16-semibold">학습자료 만들기</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-12-semibold bg-black-20 text-black-70 hover:bg-black-25 transition"
                onClick={() => handleLoadExample(EXAMPLE_1_EUUMHWA)}
              >
                예제1: 유음화
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-12-semibold bg-black-20 text-black-70 hover:bg-black-25 transition"
                onClick={() => handleLoadExample(EXAMPLE_2_PARENTS_DAY)}
              >
                예제2: 어버이날
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg text-12-semibold bg-black-20 text-black-70 hover:bg-black-25 transition"
                onClick={() => handleLoadExample(EXAMPLE_3_VOCABULARY)}
              >
                예제3: 단어학습
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleApply}
              disabled={components.length === 0}
            >
              캔버스에 적용
            </Button>
          </div>
        </div>

        {/* 3-column layout */}
        <div className="flex flex-1 overflow-hidden">
          <Palette />
          <PreviewPanel />
          <EditorPanel />
        </div>
      </div>
    </BaseModal>
  );
};

export default WorksheetBuilderModal;
