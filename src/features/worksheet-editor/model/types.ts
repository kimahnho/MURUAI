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
  | "coloring_area";

// --- Config types ---

export interface HeaderInstructionConfig {
  title: string;
  title_highlights: string[];
  instruction: string;
  rule_note: string;
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
  | ColoringAreaConfig;

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
