/**
 * 4단계: 스타일 설정 — 그림체 드롭다운(이미지 미리보기) + 폰트 드롭다운 + 레이아웃 2종.
 */
import { useState } from "react";
import { Check, ChevronDown, ImageIcon } from "lucide-react";

import { FONT_OPTIONS } from "@/shared/utils/fontOptions";

// import type { ArtStylePreset, PageLayout } from "../../model/storybookTypes";  // 이미지 생성 임시 중단
import type { PageLayout } from "../../model/storybookTypes";
import { LAYOUT_OPTIONS } from "../../model/storybookTypes";
// import { ART_STYLE_PRESETS } from "../../data/artStylePresets";  // 이미지 생성 임시 중단
import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";

const ArtStyleStep = () => {
  // const artStyle = useStorybookWizardStore((s) => s.formData.artStyle);  // 이미지 생성 임시 중단
  const fontFamily = useStorybookWizardStore((s) => s.formData.fontFamily);
  const layout = useStorybookWizardStore((s) => s.formData.layout);
  // const setArtStyle = useStorybookWizardStore((s) => s.setArtStyle);  // 이미지 생성 임시 중단
  const setFontFamily = useStorybookWizardStore((s) => s.setFontFamily);
  const setLayout = useStorybookWizardStore((s) => s.setLayout);

  // const [isStyleOpen, setIsStyleOpen] = useState(false);  // 이미지 생성 임시 중단
  const [isFontOpen, setIsFontOpen] = useState(false);

  // const selectedPreset = ART_STYLE_PRESETS.find((p) => p.id === artStyle);  // 이미지 생성 임시 중단
  const selectedFont = FONT_OPTIONS.find((f) => f.family === fontFamily);

  return (
    <div className="flex flex-col gap-5">
      {/* ── 그림체 드롭다운 — 이미지 생성 임시 중단으로 비활성화 ── */}
      {/* <Section title="그림체">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setIsStyleOpen((v) => !v); setIsFontOpen(false); }}
            className="flex w-full items-center justify-between rounded-lg border border-black-25 px-3 py-2.5 text-left transition hover:bg-black-5"
          >
            <span className="text-14-regular text-black-80">
              {selectedPreset?.label ?? "그림체를 선택하세요"}
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
            </div>
          )}
        </div>

        {selectedPreset && (
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
      </Section> */}
      {/* ── 이미지 생성 임시 중단: 그림체 안내 박스 숨김 ── */}
      {/* <Section title="그림체">
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5">
          <ImageIcon className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-13-regular text-amber-700">
            이미지 생성 기능을 점검 중이에요. 텍스트만 생성됩니다.
          </span>
        </div>
      </Section> */}

      {/* 폰트 드롭다운 */}
      <Section title="폰트">
        <div className="relative">
          <button
            type="button"
            onClick={() => { setIsFontOpen((v) => !v); }}
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

// ── 이미지 생성 임시 중단: StyleOption 비활성화 ──
// const StyleOption = ({
//   preset,
//   isSelected,
//   onClick,
// }: {
//   preset: ArtStylePreset;
//   isSelected: boolean;
//   onClick: () => void;
// }) => (
//   <button
//     type="button"
//     onClick={onClick}
//     className={`flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-black-5 ${
//       isSelected ? "bg-primary-50" : ""
//     }`}
//   >
//     <img
//       src={preset.previewImage}
//       alt={preset.label}
//       className="h-10 w-14 shrink-0 rounded object-contain"
//     />
//     <div className="flex flex-1 flex-col">
//       <span className="text-13-semibold text-black-90">{preset.label}</span>
//       <span className="text-11-regular text-black-50 line-clamp-1">{preset.description}</span>
//     </div>
//     {isSelected && (
//       <Check className="h-4 w-4 shrink-0 text-primary" />
//     )}
//   </button>
// );

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
