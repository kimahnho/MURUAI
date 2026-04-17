/**
 * Step 1 · 설정 — 기본 3개(나이·주제·그림체) + "세부 설정" 토글 뒤 4개(페이지 수·폰트·레이아웃·업로드).
 *
 * 저장된 주인공은 기본 뷰 상단 carousel (개수 ≥ 1일 때만).
 * 우측 A4 프리뷰(PagePreviewPanel)는 StorybookWizardModal에서 별도 렌더링.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import { FONT_OPTIONS } from "@/shared/utils/fontOptions";
import { supabase } from "@/shared/api/supabase";
import { getGenAI } from "@/shared/api/genai";
import { captureSentryError } from "@/shared/utils/sentryUtils";

import type { ArtStylePreset, PageLayout, SavedCharacter } from "../../model/storybookTypes";
import {
  LAYOUT_OPTIONS,
  PAGE_COUNT_MIN,
  PAGE_COUNT_MAX,
  TOPIC_MAX_LENGTH,
  getTopicPresetsForAge,
} from "../../model/storybookTypes";
import { ART_STYLE_PRESETS } from "../../data/artStylePresets";
import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";
import {
  fetchSavedCharacters,
  deleteCharacter,
  saveCharacter,
} from "../../api/savedCharacterApi";

// ─── 주제 추천 유틸 ───

const pickRandom = <T,>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
};

const generateTopicSuggestions = async (age: number): Promise<string[]> => {
  const ai = getGenAI();
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: `${age}세 아동을 위한 그림책 주제를 6개 추천해주세요.

규칙:
- ${age}세의 언어 이해력과 관심사에 맞는 주제
- 다양한 카테고리: 감정, 우정, 가족, 모험, 일상, 동물, 상상, 성장 중에서 골고루
- 각 주제는 구체적인 상황이나 이야기가 떠오르는 문장으로 (추상적 단어 하나 금지)
- 15자 이내

JSON 배열만 출력:
["주제1", "주제2", "주제3", "주제4", "주제5", "주제6"]`,
    config: {},
  });
  const text = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) throw new Error("추천 응답 없음");
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("JSON 파싱 실패");
  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  return parsed.filter((item): item is string => typeof item === "string").slice(0, 6);
};

// ─── 메인 ───

const SetupStep = () => {
  const childInfo = useStorybookWizardStore((s) => s.formData.childInfo);
  const setChildInfo = useStorybookWizardStore((s) => s.setChildInfo);
  const topic = useStorybookWizardStore((s) => s.formData.topic);
  const setTopic = useStorybookWizardStore((s) => s.setTopic);
  const pageCount = useStorybookWizardStore((s) => s.formData.pageCount);
  const setPageCount = useStorybookWizardStore((s) => s.setPageCount);
  const artStyle = useStorybookWizardStore((s) => s.formData.artStyle);
  const setArtStyle = useStorybookWizardStore((s) => s.setArtStyle);
  const fontFamily = useStorybookWizardStore((s) => s.formData.fontFamily);
  const setFontFamily = useStorybookWizardStore((s) => s.setFontFamily);
  const layout = useStorybookWizardStore((s) => s.formData.layout);
  const setLayout = useStorybookWizardStore((s) => s.setLayout);
  const customPromptTemplate = useStorybookWizardStore(
    (s) => s.formData.customPromptTemplate,
  );
  const setCustomPromptTemplate = useStorybookWizardStore(
    (s) => s.setCustomPromptTemplate,
  );
  const selectedCharacterId = useStorybookWizardStore(
    (s) => s.formData.selectedCharacterId,
  );
  const selectSavedCharacter = useStorybookWizardStore((s) => s.selectSavedCharacter);
  const clearSavedCharacter = useStorybookWizardStore((s) => s.clearSavedCharacter);

  const [ageInput, setAgeInput] = useState(
    childInfo?.age ? String(childInfo.age) : "",
  );
  const [pageCountInput, setPageCountInput] = useState(String(pageCount));
  const age = childInfo?.age ?? 6;
  const allPresets = useMemo(() => getTopicPresetsForAge(age), [age]);
  const [displayPresets, setDisplayPresets] = useState<string[]>(() =>
    pickRandom(allPresets, 6),
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const shuffleCountRef = useRef(0);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [savedCharacters, setSavedCharacters] = useState<SavedCharacter[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const characterFileRef = useRef<HTMLInputElement>(null);
  const advancedCharacterFileRef = useRef<HTMLInputElement>(null);

  const selectedFont = FONT_OPTIONS.find((f) => f.family === fontFamily);
  const isCustom = artStyle === "custom";

  useEffect(() => {
    setDisplayPresets(pickRandom(allPresets, 6));
    shuffleCountRef.current = 0;
  }, [allPresets]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      try {
        const characters = await fetchSavedCharacters(data.user.id);
        setSavedCharacters(characters);
      } catch {
        // 테이블 미생성 등 무시
      }
    })();
  }, []);

  // 나이
  const handleAgeChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 2);
    setAgeInput(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= 1 && num <= 19) {
      setChildInfo({ id: childInfo?.id ?? crypto.randomUUID(), age: num });
    }
  };
  const handleAgeBlur = () => {
    const num = parseInt(ageInput, 10);
    if (isNaN(num) || num < 1) {
      setAgeInput("");
      setChildInfo({ id: childInfo?.id ?? crypto.randomUUID(), age: 0 });
      return;
    }
    const clamped = Math.min(19, Math.max(1, num));
    setAgeInput(String(clamped));
    setChildInfo({ id: childInfo?.id ?? crypto.randomUUID(), age: clamped });
  };

  // 페이지 수
  const handlePageCountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 2);
    setPageCountInput(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num >= PAGE_COUNT_MIN && num <= PAGE_COUNT_MAX) {
      setPageCount(num);
    }
  };
  const handlePageCountBlur = () => {
    const num = parseInt(pageCountInput, 10);
    if (isNaN(num)) {
      setPageCountInput(String(pageCount));
      return;
    }
    const clamped = Math.min(PAGE_COUNT_MAX, Math.max(PAGE_COUNT_MIN, num));
    setPageCountInput(String(clamped));
    setPageCount(clamped);
  };

  // 주제 셔플/AI
  const handleRefreshTopics = async () => {
    shuffleCountRef.current += 1;
    if (shuffleCountRef.current <= 2) {
      setDisplayPresets(pickRandom(allPresets, 6));
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const results = await generateTopicSuggestions(age);
      setDisplayPresets(results);
    } catch (error) {
      console.warn("주제 추천 실패 — 프리셋 셔플로 대체", error);
      captureSentryError(error, "스토리북 주제 추천");
      setDisplayPresets(pickRandom(allPresets, 6));
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // 저장된 캐릭터
  const handleDeleteCharacter = async (id: string) => {
    try {
      await deleteCharacter(id);
      setSavedCharacters((prev) => prev.filter((c) => c.id !== id));
      if (selectedCharacterId === id) clearSavedCharacter();
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
        name: "캐릭터",
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

  const hasSavedCharacters = savedCharacters.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* 저장된 주인공 carousel (있을 때만 기본 뷰에 노출) */}
      {hasSavedCharacters && (
        <Section title="저장된 주인공">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => characterFileRef.current?.click()}
              disabled={isUploading}
              className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-black-25 flex flex-col items-center justify-center gap-1 transition hover:border-primary hover:bg-primary-50 disabled:opacity-50"
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
            {savedCharacters.map((character) => (
              <div key={character.id} className="relative shrink-0 group">
                <button
                  type="button"
                  onClick={() => { handleSelectCharacter(character); }}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                    selectedCharacterId === character.id
                      ? "border-primary ring-2 ring-primary-200"
                      : "border-black-20 hover:border-primary-300"
                  }`}
                >
                  <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => { void handleDeleteCharacter(character.id); }}
                  className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-error-500 text-white-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {selectedCharacterId && (
            <p className="text-12-regular text-primary">
              선택된 주인공으로 바로 이야기를 만들어요.
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
      )}

      {/* 나이 */}
      <Section title="나이" description="나이에 따라 이야기의 문장 구성과 내용이 달라져요">
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={ageInput}
            onChange={(e) => { handleAgeChange(e.target.value); }}
            onBlur={handleAgeBlur}
            placeholder="나이"
            className="w-20 rounded-lg border border-black-25 px-3 py-2 text-center text-14-semibold text-black-90 focus:border-primary focus:outline-none"
          />
          <span className="text-14-regular text-black-60">세</span>
        </div>
      </Section>

      {/* 주제 */}
      <Section title="주제">
        <div className="relative">
          <textarea
            value={topic}
            onChange={(e) => { setTopic(e.target.value.slice(0, TOPIC_MAX_LENGTH)); }}
            placeholder="예: 처음 유치원에 가는 날, 친구와 사이좋게 지내기"
            rows={3}
            className="w-full resize-none rounded-lg border border-black-25 px-3 py-2 text-14-regular focus:border-primary focus:outline-none"
          />
          <span className={`absolute bottom-2 right-3 text-12-medium ${
            topic.length >= TOPIC_MAX_LENGTH ? "text-error-700" : "text-black-40"
          }`}>
            {topic.length}/{TOPIC_MAX_LENGTH}
          </span>
        </div>
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center justify-between">
            <span className="text-12-medium text-black-50">{age}세 추천 주제</span>
            <button
              type="button"
              onClick={() => { void handleRefreshTopics(); }}
              disabled={isLoadingSuggestions}
              className="flex items-center gap-1 text-12-medium text-primary hover:text-primary-700 transition disabled:text-black-30"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingSuggestions ? "animate-spin" : ""}`} />
              다른 주제
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {isLoadingSuggestions ? (
              <span className="text-13-regular text-black-40 py-2">추천 주제를 만들고 있어요...</span>
            ) : (
              displayPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { setTopic(preset); }}
                  className={`rounded-full border px-3 py-1.5 text-13-medium transition ${
                    topic === preset
                      ? "border-primary bg-primary-100 text-primary"
                      : "border-black-25 text-black-60 hover:bg-black-10"
                  }`}
                >
                  {preset}
                </button>
              ))
            )}
          </div>
        </div>
      </Section>

      {/* 그림체 — 썸네일 그리드로 한눈에 비교·선택 */}
      <Section title="그림체">
        <div className="grid grid-cols-3 gap-2">
          {ART_STYLE_PRESETS.map((preset) => (
            <ArtStyleCard
              key={preset.id}
              preset={preset}
              isSelected={artStyle === preset.id}
              onClick={() => { setArtStyle(preset.id); }}
            />
          ))}
          <CustomStyleCard
            isSelected={isCustom}
            onClick={() => { setArtStyle("custom"); }}
          />
        </div>
        {isCustom && (
          <textarea
            value={customPromptTemplate ?? ""}
            onChange={(e) => { setCustomPromptTemplate(e.target.value); }}
            placeholder="예: 볼터치 있는 귀여운 아이, 따뜻한 색감"
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-black-20 px-3 py-2 text-13-regular placeholder:text-black-30 focus:border-primary focus:outline-none"
          />
        )}
      </Section>

      {/* ─── 세부 설정 토글 ─── */}
      <button
        type="button"
        onClick={() => { setIsAdvancedOpen((v) => !v); }}
        className="flex items-center justify-center gap-1.5 self-start text-13-semibold text-black-60 hover:text-primary transition"
      >
        <span>세부 설정</span>
        <ChevronDown className={`h-4 w-4 transition ${isAdvancedOpen ? "rotate-180" : ""}`} />
      </button>

      {isAdvancedOpen && (
        <div className="flex flex-col gap-5 rounded-lg border border-black-15 bg-black-3 p-4">
          {/* 페이지 수 */}
          <Section title="페이지 수" description={`${PAGE_COUNT_MIN}~${PAGE_COUNT_MAX}페이지`}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={pageCountInput}
                onChange={(e) => { handlePageCountChange(e.target.value); }}
                onBlur={handlePageCountBlur}
                className="w-20 rounded-lg border border-black-25 px-3 py-2 text-center text-14-semibold text-black-90 focus:border-primary focus:outline-none"
              />
              <span className="text-14-regular text-black-60">페이지</span>
            </div>
          </Section>

          {/* 폰트 */}
          <Section title="폰트">
            <div className="relative">
              <button
                type="button"
                onClick={() => { setIsFontOpen((v) => !v); }}
                className="flex w-full items-center justify-between rounded-lg border border-black-25 px-3 py-2.5 text-left bg-white-100 transition hover:bg-black-5"
              >
                <span className="text-14-regular text-black-80" style={{ fontFamily: selectedFont?.family }}>
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
                      <span className="text-14-regular text-black-80" style={{ fontFamily: font.family }}>
                        {font.label}
                      </span>
                      {fontFamily === font.family && <Check className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* 레이아웃 */}
          <Section title="페이지 레이아웃">
            <div className="grid grid-cols-3 gap-2">
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

          {/* 저장된 주인공이 없을 때만: 업로드 버튼 */}
          {!hasSavedCharacters && (
            <Section title="주인공 업로드 (선택)">
              <button
                type="button"
                onClick={() => advancedCharacterFileRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-black-25 px-4 py-3 text-13-regular text-black-60 transition hover:border-primary hover:bg-primary-50 disabled:opacity-50"
              >
                {isUploading ? (
                  <span>업로드 중...</span>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>주인공 이미지 업로드</span>
                  </>
                )}
              </button>
              <input
                ref={advancedCharacterFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { void handleCharacterUpload(e); }}
                className="hidden"
              />
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

// ─── 서브 컴포넌트 ───

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-col gap-0.5">
      <span className="text-14-semibold text-black-80">{title}</span>
      {description && <span className="text-12-regular text-black-50">{description}</span>}
    </div>
    {children}
  </div>
);

// 그림체 썸네일 카드 — 시각 중심 직접 선택 (드롭다운 대체)
const ArtStyleCard = ({
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
    className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition bg-white-100 ${
      isSelected
        ? "border-primary ring-2 ring-primary-200"
        : "border-black-20 hover:border-primary-300"
    }`}
  >
    <div className="w-full aspect-square rounded overflow-hidden bg-black-5">
      <img src={preset.previewImage} alt={preset.label} className="w-full h-full object-cover" />
    </div>
    <span className="text-12-semibold text-black-90 text-center leading-tight">
      {preset.label}
    </span>
    {isSelected && (
      <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
        <Check className="h-3 w-3 text-white-100" />
      </span>
    )}
  </button>
);

// 직접 입력 카드 — 다른 썸네일과 동일한 크기, Pencil 아이콘
const CustomStyleCard = ({
  isSelected,
  onClick,
}: {
  isSelected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-2 transition bg-white-100 ${
      isSelected
        ? "border-primary ring-2 ring-primary-200"
        : "border-black-20 hover:border-primary-300"
    }`}
  >
    <div className="w-full aspect-square rounded bg-primary-50 flex items-center justify-center">
      <Pencil className="h-7 w-7 text-primary" />
    </div>
    <span className="text-12-semibold text-black-90 text-center leading-tight">
      직접 입력
    </span>
    {isSelected && (
      <span className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
        <Check className="h-3 w-3 text-white-100" />
      </span>
    )}
  </button>
);

// 레이아웃별 미니 프리뷰 — 실제 비율 반영 (6종 지원)
const LayoutPreview = ({ layout }: { layout: PageLayout }) => {
  const isLandscape = layout === "horizontal" || layout === "text-left";
  const ar = isLandscape ? "297/210" : "210/297";
  const wrap = "overflow-hidden rounded border border-black-15 shadow-sm";

  const img = (flex: string) => (
    <div className="flex items-center justify-center bg-primary-100" style={{ flex }}>
      <img src="/main_logo.png" alt="" className="object-contain opacity-40" style={{ maxWidth: "40%", maxHeight: "40%" }} />
    </div>
  );
  const txt = (flex: string) => (
    <div className="flex flex-col justify-center gap-1 px-2 bg-white-100" style={{ flex }}>
      <div className="rounded-full bg-black-30" style={{ height: 2 }} />
      <div className="w-3/4 rounded-full bg-black-20" style={{ height: 2 }} />
    </div>
  );
  const overlay = (pos: "top" | "bottom") => (
    <div
      className="absolute left-0 right-0 flex flex-col justify-center gap-1 px-2 bg-white-100/85"
      style={{ [pos]: 0, height: "25%" }}
    >
      <div className="rounded-full bg-black-30" style={{ height: 2 }} />
      <div className="w-3/4 rounded-full bg-black-20" style={{ height: 2 }} />
    </div>
  );
  const boxStyle: React.CSSProperties = isLandscape
    ? { width: "100%", aspectRatio: ar }
    : { height: 90, aspectRatio: ar, maxWidth: "100%" };

  switch (layout) {
    case "vertical":
      return (
        <div className={`flex ${wrap}`} style={{ ...boxStyle, flexDirection: "column" }}>
          {img("1.5 1 0%")}{txt("1 1 0%")}
        </div>
      );
    case "horizontal":
      return (
        <div className={`flex ${wrap}`} style={{ ...boxStyle, flexDirection: "row" }}>
          {img("1.5 1 0%")}{txt("1 1 0%")}
        </div>
      );
    case "text-top":
      return (
        <div className={`flex ${wrap}`} style={{ ...boxStyle, flexDirection: "column" }}>
          {txt("1 1 0%")}{img("1.5 1 0%")}
        </div>
      );
    case "text-left":
      return (
        <div className={`flex ${wrap}`} style={{ ...boxStyle, flexDirection: "row" }}>
          {txt("1 1 0%")}{img("1.5 1 0%")}
        </div>
      );
    case "fullscreen-bottom":
      return (
        <div className={`relative ${wrap}`} style={boxStyle}>
          <div className="absolute inset-0 flex items-center justify-center bg-primary-100">
            <img src="/main_logo.png" alt="" className="object-contain opacity-40" style={{ maxWidth: "40%", maxHeight: "40%" }} />
          </div>
          {overlay("bottom")}
        </div>
      );
    case "fullscreen-top":
      return (
        <div className={`relative ${wrap}`} style={boxStyle}>
          <div className="absolute inset-0 flex items-center justify-center bg-primary-100">
            <img src="/main_logo.png" alt="" className="object-contain opacity-40" style={{ maxWidth: "40%", maxHeight: "40%" }} />
          </div>
          {overlay("top")}
        </div>
      );
    default:
      return (
        <div className={`flex ${wrap}`} style={{ ...boxStyle, flexDirection: "column" }}>
          {img("1.5 1 0%")}{txt("1 1 0%")}
        </div>
      );
  }
};

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
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition bg-white-100 ${
      isSelected ? "border-primary bg-primary-50" : "border-black-25 hover:bg-black-5"
    }`}
  >
    <LayoutPreview layout={layout} />
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className="text-13-semibold text-black-90">{label}</span>
      <span className="text-12-regular text-black-70 leading-snug">{description}</span>
    </div>
  </button>
);

export default SetupStep;
