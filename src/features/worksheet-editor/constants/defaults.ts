import type {
  WorksheetComponentType,
  WorksheetConfig,
  ComponentMeta,
  HeaderInstructionConfig,
  ArrowTransformConfig,

  SelectionSentenceConfig,
  GridConfig,
  RewardTrackerConfig,
  ChecklistTableConfig,
  InfoGuideConfig,
  OutlineTitleConfig,
  WritingPracticeConfig,
  ColoringAreaConfig,
  SentenceCompletionConfig,
  SentenceFillConfig,
  PassageQuestionConfig,
  MatchingConnectConfig,
  DateNameFieldConfig,
  ClockFaceConfig,
  CalendarConfig,
  MindMapConfig,
} from "../model/types";
import { generateMindMapNodes } from "../utils/mindMapLayout";

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

  sentence_completion: {
    word_bank: ["가", "이", "는", "에", "를"],
    word_bank_label: "보기",
    sentences: [
      { template: "할머니___ 거실___ 신문___ 읽는다." },
      { template: "엄마___ 부엌___ 접시___ 닦았다." },
    ],
    font_size: 18,
  } satisfies SentenceCompletionConfig,

  sentence_fill: {
    mode: "blank",
    word_bank: null,
    sentences: [
      { template: "___가 밥을 먹어요.", correct_answer: null },
      { template: "엄마가 아기에게 밥을 ___.", correct_answer: null },
    ],
    blank_style: "underline",
    font_size: 18,
    line_spacing: "normal",
    show_correction_line: false,
    show_answer_key: false,
    numbering: true,
  } satisfies SentenceFillConfig,

  passage_question: {
    instruction: "",
    passage: "오늘 아침, 예진이는 스키장에 갔어요. 친구랑 부딪혀서 넘어졌어요. 그래서 병원에 가서 다리에 약을 발랐어요. 다쳐서 속상했어요.",
    passage_background: "#FFF9E6",
    questions: [
      { question_text: "누가 넘어졌어요?", answer_type: "subjective", answer_space: "line", choices: [] },
      { question_text: "어디에서 넘어졌어요?", answer_type: "subjective", answer_space: "line", choices: [] },
      { question_text: "왜 넘어졌어요?", answer_type: "subjective", answer_space: "line", choices: [] },
    ],
    answer_line_length: "medium",
  } satisfies PassageQuestionConfig,

  matching_connect: {
    pairs: [
      { left: "허둥지둥", right: "매우 급하게 서두르는 모양" },
      { left: "오손도손", right: "사이좋게 정답게 지내는 모양" },
      { left: "두리번두리번", right: "이리저리 자꾸 살피는 모양" },
    ],
    left_header: null,
    right_header: null,
    item_style: {
      shape: "rounded_rect",
      left_background: "#FFF9E6",
      right_background: "#E6F3FF",
      font_size: 16,
    },
    numbering: true,
    show_answer_key: false,
    answer_key_text: "",
  } satisfies MatchingConnectConfig,

  date_name_field: {
    layout: "inline",
    show_day: true,
    background: "none",
    font_size: 17,
  } satisfies DateNameFieldConfig,

  clock_face: {
    clock_type: "analog",
    hour: 3,
    minute: 0,
    show_answer_line: true,
    size: "medium",
    variant: "blank",
    shape: "circle",
    color_theme: "white",
    show_numbers: true,
    digital_format: "time_only",
    digital_color: "black_green",
  } satisfies ClockFaceConfig,

  calendar: {
    mode: "monthly",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    week_of_month: null,
    start_day: "sunday",
    title_format: "year_month",
    custom_title: null,
    day_header_style: {
      background: "#D6EAFF",
      text_color: "#333333",
      sunday_color: "#FF6B6B",
      saturday_color: "#4A90D9",
    },
    cell_style: {
      min_height: 22,
      border_color: "#E0E0E0",
    },
    highlights: [],
    weekly_row_headers: null,
    weekly_rows: 1,
    show_prev_next_month: false,
  } satisfies CalendarConfig,

  mind_map: {
    level1_count: 4,
    level2_count_per_node: 0,
    line_style: "straight",
    color_theme: "gray",
    node_shape: "circle",
    nodes: generateMindMapNodes(4, 0),
  } satisfies MindMapConfig,
};

export const COMPONENT_META: Record<WorksheetComponentType, ComponentMeta> = {
  header_instruction: { icon: "📝", name: "제목" },
  arrow_transform: { icon: "🔄", name: "변환 쌍" },

  selection_sentence: { icon: "✋", name: "문장 선택" },
  grid_NxM: { icon: "⊞", name: "단어 카드" },
  reward_tracker: { icon: "⭐", name: "칭찬 스탬프" },
  checklist_table: { icon: "📊", name: "체크리스트" },
  info_guide: { icon: "💬", name: "안내 가이드" },
  outline_title: { icon: "🅰️", name: "글자 색칠하기" },
  writing_practice: { icon: "✏️", name: "쓰기 칸 노트" },
  coloring_area: { icon: "🎨", name: "색칠공부" },
  sentence_completion: { icon: "📝", name: "빈칸 완성" },
  sentence_fill: { icon: "✍️", name: "빈칸 문장" },
  passage_question: { icon: "📖", name: "지문+질문" },
  matching_connect: { icon: "🔗", name: "의미 연결하기" },
  date_name_field: { icon: "📅", name: "날짜&이름" },
  clock_face: { icon: "🕐", name: "시계" },
  calendar: { icon: "📆", name: "달력" },
  mind_map: { icon: "🧠", name: "마인드맵" },
};

export const NOTEBOOK_SPECS: Record<string, { cols: number; cellSize: string; fs: string; maxRows: number }> = {
  "5칸": { cols: 5, cellSize: "32mm", fs: "27pt", maxRows: 6 },
  "8칸": { cols: 8, cellSize: "20mm", fs: "17pt", maxRows: 10 },
  "10칸": { cols: 10, cellSize: "16mm", fs: "14pt", maxRows: 12 },
};
