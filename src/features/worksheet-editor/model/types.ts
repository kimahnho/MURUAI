/** 학습자료 에디터 컴포넌트 타입 정의 */

export type WorksheetComponentType =
  | "header_instruction"
  | "arrow_transform"
  | "sequential_repeat"
  | "selection_sentence"
  | "grid_NxM"
  | "reward_tracker"
  | "checklist_table"
  | "info_guide"
  | "outline_title"
  | "writing_practice"
  | "coloring_area"
  | "sentence_completion"
  | "sentence_fill"
  | "passage_question"
  | "matching_connect"
  | "date_name_field"
  | "clock_face"
  | "calendar"
  | "mind_map";

// --- Config types ---

export interface HeaderInstructionConfig {
  title: string;
  title_highlights: string[];
  instruction: string;
  rule_note: string;
  title_align?: "left" | "center" | "right";
}

export interface ArrowTransformConfig {
  pairs: { original: string; transformed: string }[];
}

export interface SequentialRepeatConfig {
  section_title: string;
  rows: { syllable: string; repeat: number }[];
}

export interface SelectionSentenceConfig {
  sentences: { template: string; correct_answers: string[] }[];
  show_answer_key: boolean;
}

export interface GridItem {
  text: string;
  text_highlight: string;
  /** imageSlot에 삽입된 이미지 URL (config에 영속화) */
  imageUrl?: string;
  imageBox?: { x: number; y: number; w: number; h: number };
}

export interface GridConfig {
  rows: number;
  cols: number;
  cell_content_type: "text_only" | "image_and_text";
  cell_border: "rounded" | "square" | "dashed" | "none";
  items: GridItem[];
}

export interface RewardTrackerConfig {
  slot_count: number;
  label: string;
}

export interface ChecklistTableConfig {
  rows: { word: string }[];
}

export interface InfoGuideConfig {
  character_emoji: string;
  speech: string;
  tip: string;
}

export interface OutlineTitleConfig {
  text: string;
  outline_style: "outline_only" | "outline_shadow" | "outline_double";
  outline_color: string;
  subtitle: string;
}

export interface WritingPracticeConfig {
  notebook_type: "5칸" | "8칸" | "10칸";
  show_model: boolean;
  show_guide: boolean;
  text: string;
  row_count: number;
}

export interface ColoringAreaConfig {
  image_description: string;
  size_ratio: number;
}

export interface SentenceCompletionConfig {
  word_bank: string[] | null;
  word_bank_label: string;
  sentences: { template: string }[];
  font_size: number;
}

export interface SentenceFillConfig {
  mode: "blank" | "word_bank" | "judge";
  word_bank: string[] | null;
  sentences: { template: string; correct_answer: string | null }[];
  blank_style: "underline" | "box" | "dotted";
  font_size: number;
  line_spacing: "compact" | "normal" | "wide";
  show_correction_line: boolean;
  show_answer_key: boolean;
  numbering: boolean;
}

export interface PassageQuestionItem {
  question_text: string;
  answer_type: "subjective" | "multiple_choice";
  /** 주관식 답변 공간 */
  answer_space: "line" | "box" | "none";
  /** 객관식 선택지 (최소 2, 최대 5) */
  choices: string[];
}

export interface PassageQuestionConfig {
  instruction: string;
  passage: string | null;
  passage_background: string;
  questions: PassageQuestionItem[];
  answer_line_length: "short" | "medium" | "full";
}

export interface MatchingConnectPair {
  left: string;
  right: string;
}

export interface MatchingConnectConfig {
  pairs: MatchingConnectPair[];
  left_header: string | null;
  right_header: string | null;
  item_style: {
    shape: "rounded_rect" | "pill";
    left_background: string;
    right_background: string;
    font_size: number;
  };
  numbering: boolean;
  show_answer_key: boolean;
  /** 교사용 정답 텍스트 (show_answer_key=true일 때 표시) */
  answer_key_text: string;
}

export interface DateNameFieldConfig {
  layout: "inline" | "stacked";
  show_day: boolean;
  background: "none" | "round_mint" | "round_lavender" | "round_peach";
  font_size: number;
}

export interface ClockFaceConfig {
  clock_type: "analog" | "digital";
  hour: number;
  minute: number;
  show_answer_line: boolean;
  size: "small" | "medium" | "large";
  variant: "blank" | "hour_only" | "full";
  shape: "circle" | "square";
  color_theme: "white" | "pastel_blue" | "pastel_yellow";
  show_numbers: boolean;
  digital_format: "time_only" | "ampm" | "blank";
  digital_color: "black_green" | "white_black" | "blue_dark";
}

export interface CalendarHighlight {
  day: number;
  label: string | null;
  background: string | null;
}

export interface CalendarConfig {
  mode: "monthly" | "weekly";
  year: number;
  month: number;
  week_of_month: number | null;
  start_day: "sunday" | "monday";
  title_format: "year_month" | "month_only" | "custom";
  custom_title: string | null;
  day_header_style: {
    background: string;
    text_color: string;
    sunday_color: string;
    saturday_color: string;
  };
  cell_style: {
    min_height: number;
    border_color: string;
  };
  highlights: CalendarHighlight[];
  weekly_row_headers: string[] | null;
  weekly_rows: number;
  show_prev_next_month: boolean;
}

export interface MindMapNode {
  id: string;
  level: 0 | 1 | 2;
  parent_id: string | null;
  text: string;
  position: { x: number; y: number };
}

export type MindMapColorTheme = "gray" | "pastel" | "pink" | "blue" | "mint" | "yellow" | "lavender";
export type MindMapNodeShape = "circle" | "rounded_rect";

export interface MindMapConfig {
  level1_count: number;
  level2_count_per_node: number;
  line_style: "straight";
  color_theme: MindMapColorTheme;
  node_shape: MindMapNodeShape;
  nodes: MindMapNode[];
}

export type WorksheetConfig =
  | HeaderInstructionConfig
  | ArrowTransformConfig
  | SequentialRepeatConfig
  | SelectionSentenceConfig
  | GridConfig
  | RewardTrackerConfig
  | ChecklistTableConfig
  | InfoGuideConfig
  | OutlineTitleConfig
  | WritingPracticeConfig
  | ColoringAreaConfig
  | SentenceCompletionConfig
  | SentenceFillConfig
  | PassageQuestionConfig
  | MatchingConnectConfig
  | DateNameFieldConfig
  | ClockFaceConfig
  | CalendarConfig
  | MindMapConfig;

export interface WorksheetComponent {
  id: string;
  type: WorksheetComponentType;
  config: WorksheetConfig;
  collapsed: boolean;
}

export interface ComponentMeta {
  icon: string;
  name: string;
}
