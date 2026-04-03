/**
 * 4단계: 스타일 설정 — 저장된 캐릭터 + 그림체 드롭다운(프리셋+커스텀) + 폰트 + 레이아웃.
 */
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ImageIcon, Pencil, Plus, Trash2, X } from "lucide-react";

import { FONT_OPTIONS } from "@/shared/utils/fontOptions";
import { supabase } from "@/shared/api/supabase";

import type { ArtStylePreset, PageLayout, SavedCharacter } from "../../model/storybookTypes";
import { LAYOUT_OPTIONS } from "../../model/storybookTypes";
import { ART_STYLE_PRESETS } from "../../data/artStylePresets";
import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";
import { fetchSavedCharacters, deleteCharacter, saveCharacter } from "../../api/savedCharacterApi";

const ArtStyleStep = () => {
  const artStyle = useStorybookWizardStore((s) => s.formData.artStyle);
  const fontFamily = useStorybookWizardStore((s) => s.formData.fontFamily);
  const layout = useStorybookWizardStore((s) => s.formData.layout);
  const customPromptTemplate = useStorybookWizardStore((s) => s.formData.customPromptTemplate);
  const selectedCharacterId = useStorybookWizardStore((s) => s.formData.selectedCharacterId);
  const setArtStyle = useStorybookWizardStore((s) => s.setArtStyle);
  const setFontFamily = useStorybookWizardStore((s) => s.setFontFamily);
  const setLayout = useStorybookWizardStore((s) => s.setLayout);
  const setCustomPromptTemplate = useStorybookWizardStore((s) => s.setCustomPromptTemplate);
  const selectSavedCharacter = useStorybookWizardStore((s) => s.selectSavedCharacter);
  const clearSavedCharacter = useStorybookWizardStore((s) => s.clearSavedCharacter);

  const childInfo = useStorybookWizardStore((s) => s.formData.childInfo);

  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const characterFileRef = useRef<HTMLInputElement>(null);

  const selectedPreset = ART_STYLE_PRESETS.find((p) => p.id === artStyle);
  const selectedFont = FONT_OPTIONS.find((f) => f.family === fontFamily);
  const isCustom = artStyle === "custom";

  // 저장된 캐릭터 목록 로드
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      try {
        const characters = await fetchSavedCharacters(data.user.id);
        setSavedCharacters(characters);
      } catch {
        // 테이블 미생성 등 에러 무시
      }
    })();
  }, []);

  const handleDeleteCharacter = async (id: string) => {
    try {
      await deleteCharacter(id);
      setSavedCharacters((prev) => prev.filter((c) => c.id !== id));
      if (selectedCharacterId === id) {
        clearSavedCharacter();
      }
    } catch {
      // 삭제 실패 무시
    }
  };

  const handleSelectCharacter = (character: SavedCharacter) => {
    if (selectedCharacterId === character.id) {
      clearSavedCharacter();
    } else {
      selectSavedCharacter(character);
    }
  };

  const handleCharacterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1]);
        };
        reader.readAsDataURL(file);
      });

      const saved = await saveCharacter({
        userId: authData.user.id,
        name: childInfo?.name ? `${childInfo.name} 캐릭터` : "캐릭터",
        imageBase64: base64,
        artStyleId: artStyle ?? null,
        promptTemplate: artStyle === "custom" ? (customPromptTemplate ?? null) : null,
        childInfo: childInfo ?? null,
      });
      setSavedCharacters((prev) => [saved, ...prev]);
    } catch {
      // 업로드 실패 무시
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* 저장된 캐릭터 */}
      <Section title="저장된 캐릭터">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* 업로드 버튼 */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => characterFileRef.current?.click()}
              disabled={isUploading}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-black-25 flex flex-col items-center justify-center gap-1 transition hover:border-primary hover:bg-primary-50 disabled:opacity-50"
            >
              {isUploading ? (
                <span className="text-11-regular text-black-40">업로드 중</span>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-black-40" />
                  <span className="text-10-regular text-black-40">업로드</span>
                </>
              )}
            </button>
            <span className="block text-center text-11-regular text-black-50 mt-1 w-20"> </span>
          </div>
          {savedCharacters.map((character) => (
            <div
              key={character.id}
              className="relative shrink-0 group"
            >
              <button
                type="button"
                onClick={() => { handleSelectCharacter(character); }}
                className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                  selectedCharacterId === character.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-black-20 hover:border-primary/50"
                }`}
              >
                <img
                  src={character.imageUrl}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => { void handleDeleteCharacter(character.id); }}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white-100"
              >
                <X className="h-3 w-3" />
              </button>
              <span className="block text-center text-11-regular text-black-50 mt-1 truncate w-20">
                {character.name}
              </span>
            </div>
          ))}
        </div>
        <p className="text-11-regular text-black-40">
          배경이 흰색인 캐릭터 이미지를 업로드해 주세요.
        </p>
        {selectedCharacterId && (
          <p className="text-12-regular text-primary mt-1">
            캐릭터가 선택되었어요. 다음 단계에서 바로 생성을 시작합니다.
          </p>
        )}
        <input
          ref={characterFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => { void handleCharacterUpload(e); }}
          className="hidden"
        />
      </Section>

      {/* 그림체 드롭다운 */}
      <Section title="그림체">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setIsStyleOpen((v) => !v); setIsFontOpen(false); }}
            className="flex w-full items-center justify-between rounded-lg border border-black-25 px-3 py-2.5 text-left transition hover:bg-black-5"
          >
            <span className="text-14-regular text-black-80">
              {isCustom ? "직접 입력" : selectedPreset?.label ?? "그림체를 선택하세요"}
            </span>
            <ChevronDown className={`h-4 w-4 text-black-50 transition ${isStyleOpen ? "rotate-180" : ""}`} />
          </button>

          {isStyleOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-black-20 bg-white-100 shadow-lg max-h-72 overflow-y-auto">
              {ART_STYLE_PRESETS.map((preset) => (
                <StyleOption
                  key={preset.id}
                  preset={preset}
                  isSelected={artStyle === preset.id}
                  onClick={() => { setArtStyle(preset.id); setIsStyleOpen(false); }}
                />
              ))}
              {/* 구분선 */}
              <div className="mx-3 my-1 border-t border-black-15" />
              {/* 직접 입력 */}
              <button
                type="button"
                onClick={() => { setArtStyle("custom"); setIsStyleOpen(false); }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-black-5 ${
                  isCustom ? "bg-primary-50" : ""
                }`}
              >
                <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded bg-black-10">
                  <Pencil className="h-5 w-5 text-black-50" />
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-13-semibold text-black-90">직접 입력</span>
                  <span className="text-11-regular text-black-50">프롬프트로 그림체를 직접 설명</span>
                </div>
                {isCustom && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            </div>
          )}
        </div>

        {/* 프리셋 미리보기 */}
        {selectedPreset && !isCustom && (
          <div className="mt-1 rounded-lg border border-black-15 overflow-hidden">
            <img
              src={selectedPreset.previewImage}
              alt={selectedPreset.label}
              className="w-full object-contain"
            />
            <div className="px-3 py-2">
              <span className="text-12-regular text-black-50">{selectedPreset.description}</span>
            </div>
          </div>
        )}

        {/* 커스텀 프롬프트 입력 */}
        {isCustom && (
          <textarea
            value={customPromptTemplate ?? ""}
            onChange={(e) => { setCustomPromptTemplate(e.target.value); }}
            placeholder="원하는 그림체를 설명해 주세요 (예: 따뜻한 수채화풍, 파스텔 톤, 부드러운 선)"
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-black-20 px-3 py-2 text-13-regular placeholder:text-black-30 focus:border-primary focus:outline-none"
          />
        )}
      </Section>

      {/* 폰트 드롭다운 */}
      <Section title="폰트">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setIsFontOpen((v) => !v); setIsStyleOpen(false); }}
            className="flex w-full items-center justify-between rounded-lg border border-black-25 px-3 py-2.5 text-left transition hover:bg-black-5"
          >
            <span
              className="text-14-regular text-black-80"
              style={{ fontFamily: selectedFont?.family }}
            >
              {selectedFont?.label ?? fontFamily}
            </span>
            <ChevronDown className={`h-4 w-4 text-black-50 transition ${isFontOpen ? "rotate-180" : ""}`} />
          </button>

          {isFontOpen && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-black-20 bg-white-100 shadow-lg max-h-60 overflow-y-auto">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => { setFontFamily(font.family); setIsFontOpen(false); }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-black-5 ${
                    fontFamily === font.family ? "bg-primary-50" : ""
                  }`}
                >
                  <span
                    className="text-14-regular text-black-80"
                    style={{ fontFamily: font.family }}
                  >
                    {font.label}
                  </span>
                  {fontFamily === font.family && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-12-regular text-black-40 mt-1">(나중에 변경 가능)</p>
      </Section>

      {/* 레이아웃 */}
      <Section title="페이지 레이아웃">
        <div className="flex gap-2">
          {LAYOUT_OPTIONS.map((opt) => (
            <LayoutCard
              key={opt.id}
              layout={opt.id}
              label={opt.label}
              description={opt.description}
              isSelected={layout === opt.id}
              onClick={() => { setLayout(opt.id); }}
            />
          ))}
        </div>
      </Section>
    </div>
  );
};

// ─── 서브 컴포넌트 ───

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <span className="text-14-semibold text-black-80">{title}</span>
    {children}
  </div>
);

const StyleOption = ({
  preset,
  isSelected,
  onClick,
}: {
  preset: ArtStylePreset;
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-black-5 ${
      isSelected ? "bg-primary-50" : ""
    }`}
  >
    <img
      src={preset.previewImage}
      alt={preset.label}
      className="h-10 w-14 shrink-0 rounded object-contain"
    />
    <div className="flex flex-1 flex-col">
      <span className="text-13-semibold text-black-90">{preset.label}</span>
      <span className="text-11-regular text-black-50 line-clamp-1">{preset.description}</span>
    </div>
    {isSelected && (
      <Check className="h-4 w-4 shrink-0 text-primary" />
    )}
  </button>
);

const LayoutCard = ({
  layout,
  label,
  description,
  isSelected,
  onClick,
}: {
  layout: PageLayout;
  label: string;
  description: string;
  isSelected: boolean;
  onClick: () => void;
}) => {
  const isVertical = layout === "vertical";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-2.5 rounded-lg border p-3 transition ${
        isSelected
          ? "border-primary bg-primary-50"
          : "border-black-25 hover:bg-black-5"
      }`}
    >
      {/* A4 비율 미니 프리뷰 — 높이 통일 */}
      <div
        className="flex overflow-hidden rounded-sm bg-white-100 border border-black-15 shadow-sm"
        style={{
          height: 80,
          aspectRatio: isVertical ? "210 / 297" : "297 / 210",
          flexDirection: isVertical ? "column" : "row",
        }}
      >
        {/* 이미지 영역 */}
        <div
          className="flex items-center justify-center bg-blue-50"
          style={{ flex: "1 1 0%", minWidth: 0, minHeight: 0 }}
        >
          <ImageIcon className="h-5 w-5 text-blue-300" />
        </div>
        {/* 텍스트 영역 */}
        <div
          className="flex flex-col justify-center gap-1 px-2 py-1"
          style={{ flex: "1 1 0%", minWidth: 0, minHeight: 0 }}
        >
          <div className="h-px w-full rounded-full bg-black-25" />
          <div className="h-px w-3/4 rounded-full bg-black-20" />
          <div className="h-px w-5/6 rounded-full bg-black-15" />
        </div>
      </div>
      <div className="text-center">
        <div className="text-13-semibold text-black-80">{label}</div>
        <div className="text-11-regular text-black-50">{description}</div>
      </div>
    </button>
  );
};

export default ArtStyleStep;
