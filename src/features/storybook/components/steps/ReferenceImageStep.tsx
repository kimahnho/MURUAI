/**
 * Step 4.5: AI 캐릭터 레퍼런스 이미지 생성 및 확인.
 * 선택한 그림체로 캐릭터를 AI 생성하고, 사용자가 컨펌하거나 다시 생성할 수 있다.
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, Upload } from "lucide-react";

import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";

const ReferenceImageStep = () => {
  const referenceImageBase64 = useStorybookWizardStore(
    (s) => s.formData.referenceImageBase64,
  );
  const isLoading = useStorybookWizardStore((s) => s.isLoading);
  const error = useStorybookWizardStore((s) => s.error);
  const generateCharacterRef = useStorybookWizardStore(
    (s) => s.generateCharacterRef,
  );
  const setReferenceImageBase64 = useStorybookWizardStore(
    (s) => s.setReferenceImageBase64,
  );
  const characterPrompt = useStorybookWizardStore(
    (s) => s.formData.characterPrompt,
  );
  const setCharacterPrompt = useStorybookWizardStore(
    (s) => s.setCharacterPrompt,
  );
  const [localPrompt, setLocalPrompt] = useState(characterPrompt ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTriggered = useRef(false);

  // Step 진입 시 캐릭터가 없으면 자동 생성
  useEffect(() => {
    if (!referenceImageBase64 && !isLoading && !hasTriggered.current) {
      hasTriggered.current = true;
      void generateCharacterRef();
    }
  }, [referenceImageBase64, isLoading, generateCharacterRef]);

  const handleRegenerate = () => {
    setCharacterPrompt(localPrompt);
    void generateCharacterRef();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setReferenceImageBase64(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-5 py-4">
      {/* 이미지 영역 */}
      <div className="relative w-52 h-52 rounded-2xl border-2 border-black-20 overflow-hidden bg-black-5 flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-13-regular text-black-50">
              캐릭터를 그리고 있어요...
            </span>
          </div>
        ) : referenceImageBase64 ? (
          <img
            src={`data:image/png;base64,${referenceImageBase64}`}
            alt="캐릭터 레퍼런스"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-13-regular text-black-40">
            {error ?? "캐릭터 이미지가 없어요"}
          </span>
        )}
      </div>

      {/* 안내 문구 */}
      <p className="text-13-regular text-black-50 text-center max-w-xs">
        이 캐릭터를 기반으로 스토리북 이미지가 생성됩니다.
        <br />
        마음에 들지 않으면 다시 생성하거나 직접 업로드할 수 있어요.
      </p>

      {/* 커스텀 프롬프트 입력 */}
      <textarea
        value={localPrompt}
        onChange={(e) => { setLocalPrompt(e.target.value); }}
        placeholder="원하는 캐릭터 특징을 입력해 주세요 (예: 안경을 쓴, 빨간 모자를 쓴)"
        disabled={isLoading}
        rows={2}
        className="w-full max-w-xs resize-none rounded-lg border border-black-20 px-3 py-2 text-13-regular placeholder:text-black-30 focus:border-primary focus:outline-none disabled:opacity-50"
      />

      {/* 버튼 영역 */}
      {!isLoading && (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-13-semibold text-primary transition hover:bg-primary-50"
          >
            <RefreshCw className="h-4 w-4" />
            다시 생성
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-black-30 px-4 py-2 text-13-semibold text-black-60 transition hover:bg-black-5"
          >
            <Upload className="h-4 w-4" />
            직접 업로드
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default ReferenceImageStep;
