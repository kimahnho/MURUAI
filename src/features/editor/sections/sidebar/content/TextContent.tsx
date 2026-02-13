/**
 * 텍스트 추가와 텍스트 스타일 진입 액션을 제공하는 패널 컴포넌트.
 */
import { useElementStore } from "@/features/editor/store/elementStore";

type TextPreset = {
  text: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  alignX?: "left" | "center" | "right";
  alignY?: "top" | "middle" | "bottom";
  widthMode?: "auto" | "fixed" | "element";
};

type TextPresetItem = {
  id: string;
  label: string;
  className: string;
  preset: TextPreset;
};

const TEXT_PRESETS: TextPresetItem[] = [
  {
    id: "title",
    label: "제목 추가",
    className: "text-headline-28-bold",
    preset: {
      text: "제목 추가",
      fontSize: 28,
      fontWeight: "bold",
      alignX: "center",
      alignY: "middle",
    },
  },
  {
    id: "subtitle",
    label: "부제목 추가",
    className: "text-title-20-semibold",
    preset: {
      text: "부제목 추가",
      fontSize: 20,
      fontWeight: "bold",
      alignX: "center",
      alignY: "middle",
    },
  },
  {
    id: "body",
    label: "본문 추가",
    className: "text-14-regular",
    preset: {
      text: "본문 추가",
      fontSize: 14,
      fontWeight: "normal",
      alignX: "center",
      alignY: "middle",
    },
  },
];

type TextContentViewProps = {
  presets: TextPresetItem[];
  onSelectPreset: (preset: TextPreset) => void;
};

const TextContentView = ({ presets, onSelectPreset }: TextContentViewProps) => {
  return (
    <div className="flex flex-col w-full gap-6 pt-3">
      <div className="flex flex-col gap-4">
        <div className="flex text-title-16-semibold items-center">
          기본 텍스트 스타일
        </div>
        <div className="flex flex-col items-center w-full gap-2">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className="flex w-full rounded-xl border border-black-30 items-center justify-start px-3 py-4 cursor-pointer"
              // 프리셋 클릭은 텍스트 삽입 요청만 발생시키고, 실제 위치 계산은 캔버스 측 삽입 정책을 따른다.
              onClick={() => { onSelectPreset(preset.preset); }}
            >
              <span className={`flex ${preset.className}`}>
                {preset.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TextContent = () => {
  // requestText는 현재 선택/편집 상태를 고려해 적절한 페이지에 텍스트 요소를 생성한다.
  const onSelectPreset = useElementStore((s) => s.requestText);

  return (
    <TextContentView presets={TEXT_PRESETS} onSelectPreset={onSelectPreset} />
  );
};

export default TextContent;
