/**
 * 학습자료 에디터 v3 — 컴포넌트 기반 학습자료 조합 도구.
 * 왼쪽 팔레트에서 컴포넌트를 추가하고, 중앙에서 미리보기, 오른쪽에서 속성을 편집한다.
 */
import { useState } from "react";

import useToastStore from "@/shared/store/useToastStore";

import { useWorksheetStore } from "./store/worksheetStore";
import { buildExportJson } from "./utils/exportJson";
import { EXAMPLE_1_EUUMHWA, EXAMPLE_2_PARENTS_DAY, EXAMPLE_3_VOCABULARY } from "./utils/examples";
import Palette from "./sections/Palette";
import PreviewPanel from "./sections/PreviewPanel";
import EditorPanel from "./sections/EditorPanel";

const WorksheetEditorPage = () => {
  const components = useWorksheetStore((s) => s.components);
  const setComponents = useWorksheetStore((s) => s.setComponents);
  const [isJsonOpen, setIsJsonOpen] = useState(false);
  const [jsonOutput, setJsonOutput] = useState("");

  const showToast = useToastStore((s) => s.showToast);

  const handleLoadExample = (
    data: typeof EXAMPLE_1_EUUMHWA,
    label: string,
  ) => {
    // 예제 로드 시 새 ID 부여
    const cloned = data.map((c) => ({ ...structuredClone(c), id: crypto.randomUUID() }));
    setComponents(cloned);
    showToast(label);
  };

  const handleExportJson = () => {
    if (components.length === 0) {
      showToast("컴포넌트를 추가한 후 내보내세요");
      return;
    }
    const json = buildExportJson(components);
    setJsonOutput(JSON.stringify(json, null, 2));
    setIsJsonOpen(true);
  };

  const handlePrintPdf = () => {
    if (components.length === 0) {
      showToast("컴포넌트를 추가한 후 저장하세요");
      return;
    }
    window.print();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-black-20">
      {/* Top bar */}
      <div className="bg-white-100 border-b border-black-25 px-6 py-3 flex items-center gap-4 sticky top-0 z-50 print:hidden">
        <div className="text-lg font-extrabold text-primary">
          무루AI <span className="font-normal text-black-45 text-xs ml-1.5">에디터 v3</span>
        </div>
        <div className="text-[14px] text-black-70 px-3 py-1.5 border border-black-25 rounded-lg bg-black-5 min-w-[200px]">
          새 학습자료
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-lg border-none font-semibold text-[13px] cursor-pointer bg-black-20 text-black-70 hover:bg-black-25 transition"
            onClick={() => handleLoadExample(EXAMPLE_1_EUUMHWA, "예제1: 유음화 연습")}
          >
            예제1: 유음화
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border-none font-semibold text-[13px] cursor-pointer bg-black-20 text-black-70 hover:bg-black-25 transition"
            onClick={() => handleLoadExample(EXAMPLE_2_PARENTS_DAY, "예제2: 어버이날 색칠+쓰기")}
          >
            예제2: 어버이날
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border-none font-semibold text-[13px] cursor-pointer bg-black-20 text-black-70 hover:bg-black-25 transition"
            onClick={() => handleLoadExample(EXAMPLE_3_VOCABULARY, "예제3: 단계별 단어학습")}
          >
            예제3: 단어학습
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border-none font-semibold text-[13px] cursor-pointer bg-black-20 text-black-70 hover:bg-black-25 transition"
            onClick={handleExportJson}
          >
            {"{ } JSON"}
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-lg border-none font-semibold text-[13px] cursor-pointer bg-primary text-white-100 hover:bg-primary-700 transition"
            onClick={handlePrintPdf}
          >
            PDF 저장
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden print:block">
        <div className="print:hidden">
          <Palette />
        </div>
        <PreviewPanel />
        <div className="print:hidden">
          <EditorPanel />
        </div>
      </div>

      {/* JSON Modal */}
      {isJsonOpen && (
        <div
          className="fixed inset-0 bg-black-100/50 z-[300] flex items-center justify-center print:hidden"
          onClick={() => setIsJsonOpen(false)}
        >
          <div
            className="bg-white-100 rounded-2xl p-6 w-[640px] max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold">생성된 JSON</h3>
              <button
                type="button"
                className="px-4 py-2 rounded-lg border-none font-semibold text-[13px] cursor-pointer bg-black-20 text-black-70 hover:bg-black-25 transition"
                onClick={() => setIsJsonOpen(false)}
              >
                닫기
              </button>
            </div>
            <pre className="bg-black-20 p-4 rounded-lg text-[11px] overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono">
              {jsonOutput}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorksheetEditorPage;
