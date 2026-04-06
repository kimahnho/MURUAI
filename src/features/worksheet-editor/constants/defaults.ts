import type {
  WorksheetComponentType,
  WorksheetConfig,
  ComponentMeta,
  HeaderInstructionConfig,
  ArrowTransformConfig,
  SequentialRepeatConfig,
  SelectionSentenceConfig,
  GridConfig,
  RewardTrackerConfig,
  ChecklistTableConfig,
  InfoGuideConfig,
  OutlineTitleConfig,
  WritingPracticeConfig,
  ColoringAreaConfig,
} from "../model/types";

export const DEFAULT_CONFIGS: Record<WorksheetComponentType, WorksheetConfig> = {
  header_instruction: {
    title: "제목을 입력하세요",
    title_highlights: [],
    instruction: "",
    rule_note: "",
  } satisfies HeaderInstructionConfig,

  arrow_transform: {
    pairs: [
      { original: "간", transformed: "갈" },
      { original: "건", transformed: "걸" },
    ],
  } satisfies ArrowTransformConfig,

  sequential_repeat: {
    section_title: "",
    rows: [
      { syllable: "바", repeat: 5 },
      { syllable: "빠", repeat: 5 },
    ],
  } satisfies SequentialRepeatConfig,

  selection_sentence: {
    sentences: [
      {
        template: "우리 {반/발} 친구들은 {반/발}이 아주 빨라요.",
        correct_answers: ["발", "발"],
      },
    ],
    show_answer_key: false,
  } satisfies SelectionSentenceConfig,

  grid_NxM: {
    rows: 2,
    cols: 3,
    cell_content_type: "image_and_text",
    cell_border: "rounded",
    items: [
      { text: "곰", text_highlight: "" },
      { text: "공", text_highlight: "" },
      { text: "콩", text_highlight: "" },
      { text: "코", text_highlight: "" },
      { text: "포도", text_highlight: "" },
      { text: "토끼", text_highlight: "" },
    ],
  } satisfies GridConfig,

  reward_tracker: {
    slot_count: 5,
    label: "잘했어요!",
  } satisfies RewardTrackerConfig,

  checklist_table: {
    rows: [
      { word: "곰" },
      { word: "공" },
      { word: "콩" },
      { word: "코" },
      { word: "포도" },
    ],
  } satisfies ChecklistTableConfig,

  info_guide: {
    character_emoji: "",
    speech: "안녕! 오늘 함께 연습해볼 거야!",
    tip: "💡 입술을 동그랗게 모아서 소리를 내 볼 수 있어요.",
  } satisfies InfoGuideConfig,

  outline_title: {
    text: "어버이날",
    outline_style: "outline_only",
    outline_color: "#333333",
    subtitle: "",
  } satisfies OutlineTitleConfig,

  writing_practice: {
    notebook_type: "8칸",
    show_model: true,
    show_guide: true,
    text: "바나나우유",
    row_count: 2,
  } satisfies WritingPracticeConfig,

  coloring_area: {
    image_description: "",
    size_ratio: 0.6,
  } satisfies ColoringAreaConfig,
};

export const COMPONENT_META: Record<WorksheetComponentType, ComponentMeta> = {
  header_instruction: { icon: "📝", name: "제목" },
  arrow_transform: { icon: "🔄", name: "변환 쌍" },
  sequential_repeat: { icon: "🔁", name: "반복 연습" },
  selection_sentence: { icon: "✋", name: "문장 선택" },
  grid_NxM: { icon: "⊞", name: "단어 카드" },
  reward_tracker: { icon: "⭐", name: "칭찬 스탬프" },
  checklist_table: { icon: "📊", name: "체크리스트" },
  info_guide: { icon: "💬", name: "안내 가이드" },
  outline_title: { icon: "🅰️", name: "글자 색칠하기" },
  writing_practice: { icon: "✏️", name: "쓰기 칸 노트" },
  coloring_area: { icon: "🎨", name: "색칠공부" },
};

export const NOTEBOOK_SPECS: Record<string, { cols: number; cellSize: string; fs: string; maxRows: number }> = {
  "5칸": { cols: 5, cellSize: "32mm", fs: "27pt", maxRows: 6 },
  "8칸": { cols: 8, cellSize: "20mm", fs: "17pt", maxRows: 10 },
  "10칸": { cols: 10, cellSize: "16mm", fs: "14pt", maxRows: 12 },
};
