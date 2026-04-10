/**
 * 디자인 요소(도형/선/아이콘 등) 선택 진입점을 제공하는 패널 컴포넌트.
 */
import { Camera, Image, PenLine, Sparkles, Loader2 } from "lucide-react";
import {
  useAiImageGeneration,
  STYLE_OPTIONS,
  type ImageStyle,
  type GeneratedImage,
  type UsageStatus,
} from "../hooks/useAiImageGeneration";

/**
 * 스타일 선택 버튼 (순수 UI)
 */
const StyleButton = ({
  isActive,
  onClick,
  icon: Icon,
  label,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: typeof Camera;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg border transition-all ${
      isActive
        ? "border-primary bg-primary-50 text-primary"
        : "border-black-25 text-black-70 hover:border-black-40 hover:bg-black-5"
    }`}
  >
    <Icon className="icon-xs" />
    <span className="text-12-semibold">{label}</span>
  </button>
);

/**
 * 스타일별 아이콘 매핑
 */
const STYLE_ICONS: Record<ImageStyle, typeof Camera> = {
  photo: Camera,
  illustration: Image,
  lineart: PenLine,
};

/**
 * 생성된 이미지 그리드 (순수 UI)
 */
const GeneratedImageGrid = ({
  images,
  onImageClick,
}: {
  images: GeneratedImage[];
  onImageClick: (url: string) => void;
}) => {
  if (images.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center border border-dashed border-black-25 rounded-xl bg-black-5">
        <span className="text-14-regular text-black-50">
          생성된 이미지가 여기에 표시됩니다
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-2 gap-2">
        {images.map((image) => (
          <button
            key={image.id}
            onClick={() => {
              onImageClick(image.url);
            }}
            className="flex items-center justify-center p-2 border border-black-25 rounded-lg hover:border-primary hover:bg-primary-50 transition-all cursor-pointer"
          >
            <img
              src={image.url}
              alt="Generated"
              className="w-full h-auto object-contain rounded"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

type DesignContentViewProps = {
  selectedStyle: ImageStyle | null;
  prompt: string;
  isGenerating: boolean;
  generatedImages: GeneratedImage[];
  canGenerate: boolean;
  usageStatus: UsageStatus;
  onSelectStyle: (style: ImageStyle) => void;
  onPromptChange: (value: string) => void;
  onGenerate: () => void;
  onImageClick: (url: string) => void;
};

/**
 * DesignContentView
 * - props 기반 순수 렌더링
 */
const DesignContentView = ({
  selectedStyle,
  prompt,
  isGenerating,
  generatedImages,
  canGenerate,
  usageStatus,
  onSelectStyle,
  onPromptChange,
  onGenerate,
  onImageClick,
}: DesignContentViewProps) => (
  <div className="flex flex-col w-full h-full gap-6">
    <div className="flex items-center justify-between text-start">
      <span className="text-14-regular text-black-70">
        AI로 맞춤형 이미지를 만들어보세요.
      </span>
      <span
        className={`text-12-medium ${usageStatus.remaining <= 5 ? "text-red-500" : "text-black-50"}`}
      >
        크레딧 {usageStatus.remaining}회 남음
      </span>
    </div>

    <div className="flex flex-col gap-4">
      {/* 프롬프트 입력 → 스타일 선택 → 생성 버튼 순서 */}
      <div className="flex flex-col gap-2">
        <span className="text-14-semibold text-black-90">
          원하는 이미지를 자유롭게 그려보세요!
        </span>
        <textarea
          value={prompt}
          onChange={(e) => {
            onPromptChange(e.target.value);
          }}
          placeholder={selectedStyle === "lineart"
            ? "생성하고 싶은 색칠공부 이미지를 자유롭게 입력해보세요.\n예: 꽃밭에서 나비를 잡는 아이"
            : "생성하고 싶은 이미지를 설명해주세요.\n예: 웃고 있는 아이가 공원에서 놀고 있는 모습"}
          className="w-full h-32 px-4 py-3 border border-black-25 rounded-xl text-14-regular text-black-90 placeholder:text-black-50 focus:outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      {prompt.trim().length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-14-semibold text-black-90">스타일 선택</span>
          <div className="flex gap-2">
            {STYLE_OPTIONS.map((option) => (
              <StyleButton
                key={option.id}
                isActive={selectedStyle === option.id}
                onClick={() => {
                  onSelectStyle(option.id);
                }}
                icon={STYLE_ICONS[option.id]}
                label={option.label}
              />
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className={`flex items-center justify-center gap-1.5 w-full py-3 rounded-lg text-14-semibold transition-all ${
          canGenerate
            ? "bg-primary text-white-100 hover:bg-primary-700"
            : "bg-black-20 text-black-50 cursor-not-allowed"
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="icon-s animate-spin" />
            생성 중...
          </>
        ) : (
          <>
            <Sparkles className="icon-s" />
            이미지 생성하기
          </>
        )}
      </button>
    </div>

    {/* 생성 결과를 다시 캔버스에 삽입할 수 있는 히스토리 영역 */}
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      <span className="text-14-semibold text-black-90">생성된 이미지</span>
      <GeneratedImageGrid
        images={generatedImages}
        onImageClick={onImageClick}
      />
    </div>
  </div>
);

/**
 * DesignContent
 * - 로직은 useAiImageGeneration 훅에 위임
 */
const DesignContent = () => {
  const {
    selectedStyle,
    prompt,
    isGenerating,
    generatedImages,
    canGenerate,
    usageStatus,
    setSelectedStyle,
    setPrompt,
    generate,
    addImageToCanvas,
  } = useAiImageGeneration();

  return (
    <DesignContentView
      selectedStyle={selectedStyle}
      prompt={prompt}
      isGenerating={isGenerating}
      generatedImages={generatedImages}
      canGenerate={canGenerate}
      usageStatus={usageStatus}
      onSelectStyle={setSelectedStyle}
      onPromptChange={setPrompt}
      onGenerate={generate}
      onImageClick={addImageToCanvas}
    />
  );
};

export default DesignContent;
