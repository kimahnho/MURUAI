import { useTextContentState } from "../../hooks/useTextContentState";

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
  const { onSelectPreset } = useTextContentState();

  return (
    <TextContentView presets={TEXT_PRESETS} onSelectPreset={onSelectPreset} />
  );
};

export default TextContent;
