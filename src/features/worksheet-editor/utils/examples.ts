/** 예제 데이터 3종 */
import type { WorksheetComponent } from "../model/types";

const id = () => crypto.randomUUID();

export const EXAMPLE_1_EUUMHWA: WorksheetComponent[] = [
  {
    id: id(),
    type: "reward_tracker",
    config: { slot_count: 5, label: "잘했어요!" },
    collapsed: false,
  },
  {
    id: id(),
    type: "header_instruction",
    config: {
      title: "ㄹ 소리와 유음화",
      title_highlights: ["ㄹ"],
      instruction: "아래 단어의 발음이 어떻게 바뀌는지 살펴봅시다.",
      rule_note: "역행적 유음화: ㄴ + ㄹ → [ㄹ + ㄹ]",
    },
    collapsed: false,
  },
  {
    id: id(),
    type: "arrow_transform",
    config: {
      pairs: [
        { original: "간", transformed: "갈" },
        { original: "건", transformed: "걸" },
        { original: "군", transformed: "굴" },
        { original: "신라", transformed: "실라" },
        { original: "천리", transformed: "철리" },
      ],
    },
    collapsed: false,
  },
  {
    id: id(),
    type: "selection_sentence",
    config: {
      show_answer_key: false,
      sentences: [
        { template: "우리 {반/발} 친구들은 {반/발}이 아주 빨라요.", correct_answers: ["발", "발"] },
        { template: "{산/살}에는 무서운 호랑이가 {산/살}아요.", correct_answers: ["산", "살"] },
        {
          template: "길에서 {만/말}을 타고 달리는 사람을 {만/말}났어요.",
          correct_answers: ["말", "만"],
        },
      ],
    },
    collapsed: false,
  },
];

export const EXAMPLE_2_PARENTS_DAY: WorksheetComponent[] = [
  {
    id: id(),
    type: "outline_title",
    config: {
      text: "0월 00일 어버이날",
      outline_style: "outline_only" as const,
      outline_color: "#333333",
      subtitle: "부모님께 감사하는 마음을 담아 카네이션을 색칠해 볼까요?",
    },
    collapsed: false,
  },
  {
    id: id(),
    type: "coloring_area",
    config: { image_description: "카네이션 꽃 라인아트", size_ratio: 0.5 },
    collapsed: false,
  },
  {
    id: id(),
    type: "writing_practice",
    config: {
      notebook_type: "8칸" as const,
      show_model: false,
      show_guide: true,
      text: "엄마, 아빠 감사합니다.",
      row_count: 2,
    },
    collapsed: false,
  },
];

export const EXAMPLE_3_VOCABULARY: WorksheetComponent[] = [
  {
    id: id(),
    type: "header_instruction",
    config: { title: "1단계. 어휘 이해", title_highlights: [], instruction: "그림을 보고 무엇인지 말해봅시다.", rule_note: "" },
    collapsed: false,
  },
  {
    id: id(),
    type: "grid_NxM",
    config: {
      rows: 1,
      cols: 3,
      cell_content_type: "image_and_text" as const,
      cell_border: "rounded" as const,
      items: [
        { text: "", text_highlight: "" },
        { text: "", text_highlight: "" },
        { text: "", text_highlight: "" },
      ],
    },
    collapsed: false,
  },
  {
    id: id(),
    type: "header_instruction",
    config: { title: "2단계. 단어 쓰기", title_highlights: [], instruction: "", rule_note: "" },
    collapsed: false,
  },
  {
    id: id(),
    type: "writing_practice",
    config: { notebook_type: "5칸" as const, show_model: false, show_guide: true, text: "바나나우유", row_count: 2 },
    collapsed: false,
  },
  {
    id: id(),
    type: "header_instruction",
    config: { title: "3단계. 문장 확장", title_highlights: [], instruction: "", rule_note: "" },
    collapsed: false,
  },
  {
    id: id(),
    type: "writing_practice",
    config: { notebook_type: "8칸" as const, show_model: true, show_guide: true, text: "저 바나나우유 주세요.", row_count: 2 },
    collapsed: false,
  },
];
