/**
 * WorksheetComponent[] → Page 변환.
 * 학습자료 에디터의 컴포넌트들을 기존 CanvasElement 타입으로 변환하여
 * 캔버스 에디터에서 사용 가능한 Page 객체를 생성한다.
 */
import type { CanvasElement, TextElement, ShapeElement, TableElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import type { WorksheetComponent, WorksheetConfig } from "@/features/worksheet-editor/model/types";
import type {
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
  SentenceCompletionConfig,
  SentenceFillConfig,
  PassageQuestionConfig,
  MatchingConnectConfig,
} from "@/features/worksheet-editor/model/types";
import { NOTEBOOK_SPECS, DEFAULT_CONFIGS } from "@/features/worksheet-editor/constants/defaults";
import type { WorksheetComponentType } from "@/features/worksheet-editor/model/types";
import { withLogoCanvasElements } from "./logoElement";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const PAGE_W = mmToPx(210);
const MARGIN = mmToPx(15);
const CONTENT_W = PAGE_W - MARGIN * 2;
const COMP_GAP = mmToPx(10);

const uid = () => crypto.randomUUID();

const textEl = (
  overrides: Partial<TextElement> & { x: number; y: number; w: number; h: number; text: string },
): TextElement => ({
  id: uid(),
  type: "text",
  locked: false,
  style: {
    fontSize: 16,
    fontWeight: "normal",
    color: "#333333",
    underline: false,
    alignX: "left",
    alignY: "top",
  },
  ...overrides,
});

const shapeEl = (
  overrides: Partial<ShapeElement> & { x: number; y: number; w: number; h: number },
): ShapeElement => ({
  id: uid(),
  type: "roundRect",
  fill: "#ffffff",
  ...overrides,
});

// --- Component builders ---

const buildHeader = (config: HeaderInstructionConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;

  const INNER_GAP = mmToPx(2); // 요소 사이 간격
  const titleAlign = config.title_align ?? "left";

  // Title — 폰트 크기에 비례한 높이 (기준 28px → 10mm)
  const TITLE_FONT = 28;
  const titleH = mmToPx(10) * (TITLE_FONT / 28);
  els.push(textEl({
    x, y: curY, w: CONTENT_W, h: titleH,
    text: config.title,
    style: { fontSize: TITLE_FONT, fontWeight: "bold", color: "#2c2c2c", underline: false, alignX: titleAlign, alignY: "middle" },
  }));
  curY += titleH + INNER_GAP;

  // Instruction
  if (config.instruction) {
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(6),
      text: config.instruction,
      style: { fontSize: 14, fontWeight: "normal", color: "#888888", underline: false, alignX: titleAlign, alignY: "top" },
    }));
    curY += mmToPx(6) + INNER_GAP;
  }

  // Rule note
  if (config.rule_note) {
    const charWidth = 7; // fontSize 11 기준 한글 약 7px/자
    const textPadding = mmToPx(4); // 좌우 패딩
    const estimatedTextW = config.rule_note.length * charWidth + textPadding * 2;
    const ruleW = Math.min(Math.max(estimatedTextW, mmToPx(30)), CONTENT_W); // 최소 30mm, 최대 전체
    // 정렬에 따라 박스 X 위치 결정
    const ruleX = titleAlign === "center" ? x + (CONTENT_W - ruleW) / 2
      : titleAlign === "right" ? x + CONTENT_W - ruleW
      : x;

    els.push(shapeEl({
      type: "roundRect", x: ruleX, y: curY, w: ruleW, h: mmToPx(6),
      fill: "#f0f7ff", radius: 4,
      border: { enabled: true, color: "#d0e3ff", width: 1, style: "solid" },
    }));
    els.push(textEl({
      x: ruleX + mmToPx(1), y: curY, w: ruleW - mmToPx(2), h: mmToPx(6),
      text: config.rule_note,
      style: { fontSize: 11, fontWeight: "normal", color: "#2e6da4", underline: false, alignX: "center", alignY: "middle" },
    }));
    curY += mmToPx(6);
  }

  // Bottom line
  els.push(shapeEl({
    type: "rect", x, y: curY, w: CONTENT_W, h: 1.5,
    fill: "#e8e8e8",
  }));
  curY += mmToPx(2);

  return { elements: els, height: curY - y };
};

const buildArrowTransform = (config: ArrowTransformConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  const pairH = mmToPx(8);
  const gap = mmToPx(2);
  const boxW = mmToPx(50);
  const centerX = x + CONTENT_W / 2;
  let curY = y;

  for (const pair of config.pairs) {
    const origX = centerX - boxW - mmToPx(8);
    const transX = centerX + mmToPx(8);

    // Original box
    els.push(shapeEl({ type: "roundRect", x: origX, y: curY, w: boxW, h: pairH, fill: "#fff9e6", radius: 6 }));
    els.push(textEl({ x: origX, y: curY, w: boxW, h: pairH, text: pair.original, style: { fontSize: 20, fontWeight: "bold", color: "#5d4e37", underline: false, alignX: "center", alignY: "middle" } }));

    // Arrow
    els.push(textEl({ x: centerX - mmToPx(4), y: curY, w: mmToPx(8), h: pairH, text: "→", style: { fontSize: 16, fontWeight: "normal", color: "#cccccc", underline: false, alignX: "center", alignY: "middle" } }));

    // Transformed box
    els.push(shapeEl({ type: "roundRect", x: transX, y: curY, w: boxW, h: pairH, fill: "#e6f3ff", radius: 6 }));
    els.push(textEl({ x: transX, y: curY, w: boxW, h: pairH, text: pair.transformed, style: { fontSize: 20, fontWeight: "bold", color: "#2e6da4", underline: false, alignX: "center", alignY: "middle" } }));

    curY += pairH + gap;
  }

  return { elements: els, height: curY - y };
};

const buildSequentialRepeat = (config: SequentialRepeatConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;

  if (config.section_title) {
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(5),
      text: config.section_title,
      style: { fontSize: 12, fontWeight: "bold", color: "#555555", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += mmToPx(6);
  }

  for (const row of config.rows) {
    const sylW = mmToPx(8);
    const sylGap = mmToPx(2);
    for (let j = 0; j < (row.repeat || 5); j++) {
      els.push(textEl({
        x: x + j * (sylW + sylGap), y: curY, w: sylW, h: mmToPx(8),
        text: row.syllable,
        style: { fontSize: 20, fontWeight: "bold", color: "#333333", underline: false, alignX: "center", alignY: "middle" },
      }));
    }
    curY += mmToPx(10);
  }

  return { elements: els, height: curY - y };
};

const buildSelectionSentence = (config: SelectionSentenceConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;

  for (let i = 0; i < config.sentences.length; i++) {
    const s = config.sentences[i];
    const display = s.template.replace(/\{([^}]+)\}/g, (_, ch: string) => `[ ${ch.split("/").join(" / ")} ]`);

    // Background
    els.push(shapeEl({ type: "roundRect", x, y: curY, w: CONTENT_W, h: mmToPx(8), fill: "#e8f4fd", radius: 6 }));
    els.push(textEl({
      x: x + mmToPx(2), y: curY, w: CONTENT_W - mmToPx(4), h: mmToPx(8),
      text: `${i + 1}. ${display}`,
      style: { fontSize: 13, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += mmToPx(10);
  }

  if (config.show_answer_key) {
    const answers = config.sentences.map((s, i) => `${i + 1}.${(s.correct_answers || []).join(",")}`).filter((a) => a.length > 2).join(" | ");
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(5),
      text: `정답: ${answers}`,
      style: { fontSize: 10, fontWeight: "normal", color: "#999999", underline: false, alignX: "right", alignY: "middle" },
    }));
    curY += mmToPx(6);
  }

  return { elements: els, height: curY - y };
};

const BLANK_MM_PER_UNDERSCORE = 5; // 밑줄 1개당 5mm, ___ = 15mm, ______ = 30mm

const buildSentenceCompletion = (config: SentenceCompletionConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;

  // Word bank 칩 영역 — 칩 너비가 단어 길이에 따라 동적, 배경도 자동 늘어남
  if (config.word_bank && config.word_bank.length > 0) {
    const label = config.word_bank_label || "보기";
    const chipH = mmToPx(6);
    const chipGap = mmToPx(2);
    const labelW = mmToPx(12);
    const padX = mmToPx(2);
    const padY = mmToPx(2);

    // 칩 배치 계산 (줄 넘김 포함)
    const chipRows: { word: string; cx: number; cy: number; w: number }[] = [];
    let rowX = labelW + padX;
    let rowY = 0;
    let rowCount = 1;
    for (const word of config.word_bank) {
      // 글자 수에 비례한 너비 (최소 10mm)
      const chipW = Math.max(mmToPx(10), mmToPx(4) + word.length * mmToPx(3.5));
      // 줄 넘김
      if (rowX + chipW > CONTENT_W - padX && rowX > labelW + padX) {
        rowX = labelW + padX;
        rowY += chipH + chipGap;
        rowCount++;
      }
      chipRows.push({ word, cx: rowX, cy: rowY, w: chipW });
      rowX += chipW + chipGap;
    }

    // 배경 높이: 칩 줄 수에 따라 동적
    const bgH = padY * 2 + rowCount * chipH + (rowCount - 1) * chipGap;
    els.push(shapeEl({
      type: "roundRect", x, y: curY, w: CONTENT_W, h: bgH,
      fill: "#fafafa", radius: 4,
      border: { enabled: true, color: "#e0e0e0", width: 1, style: "solid" },
    }));
    // 라벨
    els.push(textEl({
      x: x + padX, y: curY, w: labelW, h: bgH,
      text: `${label}:`,
      style: { fontSize: 12, fontWeight: "bold", color: "#999999", underline: false, alignX: "left", alignY: "middle" },
    }));
    // 칩 렌더
    for (const chip of chipRows) {
      const chipY = curY + padY + chip.cy;
      els.push(shapeEl({
        type: "roundRect", x: x + chip.cx, y: chipY, w: chip.w, h: chipH,
        fill: "#ffffff", radius: 12,
        border: { enabled: true, color: "#dddddd", width: 1, style: "solid" },
      }));
      els.push(textEl({
        x: x + chip.cx, y: chipY, w: chip.w, h: chipH,
        text: chip.word,
        style: { fontSize: 14, fontWeight: "bold", color: "#333333", underline: false, alignX: "center", alignY: "middle" },
      }));
    }
    curY += bgH + mmToPx(3);
  }

  // 문장 렌더링 — 항상 단일 칼럼, 번호는 텍스트에 직접 포함, ___를 밑줄 도형으로 치환
  const lineH = mmToPx(10);
  for (let i = 0; i < config.sentences.length; i++) {
    const s = config.sentences[i];
    const num = `${i + 1}. `;

    // ___ 패턴을 분리해서 텍스트 + 밑줄 도형으로 교차 배치
    const parts = s.template.split(/(_{3,})/);
    let partX = x + mmToPx(2);
    const fullText = `${num}${s.template}`;

    // 밑줄이 없으면 텍스트만
    if (parts.length <= 1) {
      els.push(textEl({
        x: x + mmToPx(2), y: curY, w: CONTENT_W - mmToPx(4), h: lineH,
        text: fullText,
        style: { fontSize: config.font_size, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
      }));
    } else {
      // 밑줄이 있으면 분할 렌더
      let isFirst = true;
      for (const part of parts) {
        if (part.match(/^_{3,}$/)) {
          // 밑줄 도형 — 밑줄 개수에 비례 (최소 15mm)
          const blankW = mmToPx(Math.max(15, part.length * BLANK_MM_PER_UNDERSCORE));
          els.push(shapeEl({
            type: "rect", x: partX, y: curY + lineH - mmToPx(1.5), w: blankW, h: 1.5,
            fill: "#999999",
          }));
          partX += blankW + mmToPx(1);
        } else if (part) {
          // 텍스트 조각 (첫 조각에만 번호 붙임)
          const txt = isFirst ? `${num}${part}` : part;
          isFirst = false;
          // 글자 수 기반 대략적 너비
          const approxW = Math.max(mmToPx(5), txt.length * config.font_size * 0.6);
          els.push(textEl({
            x: partX, y: curY, w: approxW, h: lineH,
            text: txt,
            style: { fontSize: config.font_size, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
          }));
          partX += approxW;
        }
      }
    }
    curY += lineH;
  }

  return { elements: els, height: curY - y };
};

const LINE_SPACING_MM: Record<string, number> = { compact: 6, normal: 10, wide: 14 };

const buildSentenceFill = (config: SentenceFillConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;
  const spacingMm = LINE_SPACING_MM[config.line_spacing] || 10;
  const lineH = mmToPx(spacingMm);
  const isJudge = config.mode === "judge";

  // Word bank (word_bank 모드)
  if (config.mode === "word_bank" && config.word_bank && config.word_bank.length > 0) {
    const words = config.word_bank.filter(Boolean).join(" / ");
    const bgH = mmToPx(10);
    els.push(shapeEl({
      type: "roundRect", x, y: curY, w: CONTENT_W, h: bgH,
      fill: "#EEF4FF", radius: 6,
      border: { enabled: true, color: "#C8D8EF", width: 1, style: "solid" },
    }));
    els.push(textEl({
      x: x + mmToPx(2), y: curY, w: mmToPx(10), h: bgH,
      text: "보기",
      style: { fontSize: 12, fontWeight: "bold", color: "#888888", underline: false, alignX: "left", alignY: "middle" },
    }));
    els.push(textEl({
      x: x + mmToPx(13), y: curY, w: CONTENT_W - mmToPx(15), h: bgH,
      text: words,
      style: { fontSize: 16, fontWeight: "bold", color: "#2E5A8E", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += bgH + mmToPx(3);
  }

  // 문장 렌더링
  for (let i = 0; i < config.sentences.length; i++) {
    const s = config.sentences[i];
    const num = config.numbering ? `${i + 1}. ` : "";
    const text = `${num}${s.template}`;

    els.push(textEl({
      x: x + mmToPx(2), y: curY, w: CONTENT_W - mmToPx(4), h: lineH,
      text,
      style: { fontSize: config.font_size, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += lineH;

    // judge 모드 수정 쓰기 라인
    if (isJudge && config.show_correction_line) {
      els.push(textEl({
        x: x + mmToPx(6), y: curY, w: mmToPx(4), h: mmToPx(5),
        text: "→",
        style: { fontSize: 12, fontWeight: "normal", color: "#cccccc", underline: false, alignX: "left", alignY: "middle" },
      }));
      els.push(shapeEl({
        type: "rect", x: x + mmToPx(10), y: curY + mmToPx(4), w: CONTENT_W - mmToPx(14), h: 1.5,
        fill: "#cccccc",
      }));
      curY += mmToPx(6);
    }
  }

  // 정답지
  if (config.show_answer_key) {
    curY += mmToPx(3);
    const answers = config.sentences.map((s, i) => `${i + 1}.${s.correct_answer || "?"}`).join("  ");
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(5),
      text: `정답: ${answers}`,
      style: { fontSize: 10, fontWeight: "normal", color: "#999999", underline: false, alignX: "right", alignY: "middle" },
    }));
    curY += mmToPx(6);
  }

  return { elements: els, height: curY - y };
};

const ANSWER_LENGTH_RATIO: Record<string, number> = { short: 0.4, medium: 0.7, full: 1.0 };
const MC_LABELS = ["①", "②", "③", "④", "⑤"];

const buildPassageQuestion = (config: PassageQuestionConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;

  // 지시문 (선택)
  if (config.instruction) {
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(8),
      text: config.instruction,
      widthMode: "fixed",
      style: { fontSize: 18, fontWeight: "bold", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += mmToPx(11);
  }

  // 지문 영역
  if (config.passage) {
    const passageFontSize = 15;
    const padX = mmToPx(4);
    const padY = mmToPx(3);
    const textW = CONTENT_W - padX * 2;
    const charsPerLine = Math.floor(textW / (passageFontSize * 0.65));
    const lineCount = Math.max(1, Math.ceil(config.passage.length / Math.max(1, charsPerLine)));
    const passageH = padY * 2 + lineCount * passageFontSize * 1.8;
    const bg = config.passage_background || "#FFF9E6";
    els.push(shapeEl({
      type: "roundRect", x, y: curY, w: CONTENT_W, h: passageH,
      fill: bg, radius: 8,
      border: { enabled: true, color: "#E8E0C8", width: 1, style: "solid" },
    }));
    els.push(textEl({
      x: x + padX, y: curY + padY, w: textW, h: passageH - padY * 2,
      text: config.passage,
      widthMode: "fixed",
      style: { fontSize: passageFontSize, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "top" },
    }));
    curY += passageH + mmToPx(4);
  }

  // 질문 목록
  const qGap = mmToPx(10);
  const answerRatio = ANSWER_LENGTH_RATIO[config.answer_line_length] || 0.7;

  for (let i = 0; i < config.questions.length; i++) {
    const q = config.questions[i];
    const numText = `${i + 1}. `;

    // 질문 텍스트
    els.push(textEl({
      x: x + mmToPx(2), y: curY, w: CONTENT_W - mmToPx(4), h: mmToPx(7),
      text: `${numText}${q.question_text}`,
      widthMode: "fixed",
      style: { fontSize: 16, fontWeight: "bold", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += mmToPx(7);

    if (q.answer_type === "multiple_choice") {
      // 객관식 선택지
      const choiceH = mmToPx(6);
      const choiceIndent = x + mmToPx(8);
      for (let ci = 0; ci < q.choices.length; ci++) {
        const label = MC_LABELS[ci] || `${ci + 1}`;
        els.push(textEl({
          x: choiceIndent, y: curY, w: CONTENT_W - mmToPx(12), h: choiceH,
          text: `${label} ${q.choices[ci] || ""}`,
          widthMode: "fixed",
          style: { fontSize: 14, fontWeight: "normal", color: "#555555", underline: false, alignX: "left", alignY: "middle" },
        }));
        curY += choiceH;
      }
    } else {
      // 주관식 답변 공간 — 질문과 밑줄 사이 여백 확보
      curY += mmToPx(3);
      if (q.answer_space === "line") {
        const lineW = (CONTENT_W - mmToPx(12)) * answerRatio;
        els.push(shapeEl({
          type: "rect", x: x + mmToPx(8), y: curY + mmToPx(5), w: lineW, h: 1.5,
          fill: "#cccccc",
        }));
        curY += mmToPx(7);
      } else if (q.answer_space === "box") {
        const boxW = (CONTENT_W - mmToPx(12)) * answerRatio;
        els.push(shapeEl({
          type: "roundRect", x: x + mmToPx(8), y: curY + mmToPx(1), w: boxW, h: mmToPx(12),
          fill: "#ffffff", radius: 4,
          border: { enabled: true, color: "#dddddd", width: 1, style: "solid" },
        }));
        curY += mmToPx(14);
      }
    }

    curY += qGap - mmToPx(7);
  }

  return { elements: els, height: curY - y };
};

// 결정적 셔플 (seed 기반 Fisher-Yates)
const shuffleWithSeed = <T>(arr: T[], seed: number): T[] => {
  const result = [...arr];
  let s = seed;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const CIRCLED_NUMS = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧"];

const buildMatchingConnect = (config: MatchingConnectConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;
  const pairCount = config.pairs.length;
  const connectRatio = 0.25;
  const sideW = (CONTENT_W * (1 - connectRatio)) / 2;
  const connectW = CONTENT_W * connectRatio;
  const leftX = x;
  const rightX = x + sideW + connectW;
  const fs = config.item_style.font_size;
  const shape = config.item_style.shape;
  const radius = shape === "pill" ? 999 : 8;
  const leftBg = config.item_style.left_background;
  const rightBg = config.item_style.right_background;

  // 헤더
  if (config.left_header || config.right_header) {
    if (config.left_header) {
      els.push(textEl({
        x: leftX, y: curY, w: sideW, h: mmToPx(6),
        text: config.left_header,
        widthMode: "fixed",
        style: { fontSize: 12, fontWeight: "bold", color: "#888888", underline: false, alignX: "center", alignY: "middle" },
      }));
    }
    if (config.right_header) {
      els.push(textEl({
        x: rightX, y: curY, w: sideW, h: mmToPx(6),
        text: config.right_header,
        widthMode: "fixed",
        style: { fontSize: 12, fontWeight: "bold", color: "#888888", underline: false, alignX: "center", alignY: "middle" },
      }));
    }
    curY += mmToPx(8);
  }

  // 항목 높이/간격
  const itemH = pairCount <= 5 ? mmToPx(14) : mmToPx(11);
  const gap = pairCount <= 5 ? mmToPx(10) : mmToPx(6);
  const dotR = mmToPx(1.5);

  // 우측 셔플 (seed=42 고정 — 프리뷰/빌드 일관성)
  const rightIndices = Array.from({ length: pairCount }, (_, i) => i);
  let shuffled = shuffleWithSeed(rightIndices, 42);
  // 원래 순서와 같으면 재셔플
  if (shuffled.every((v, i) => v === i)) shuffled = shuffleWithSeed(rightIndices, 43);

  for (let i = 0; i < pairCount; i++) {
    const leftPair = config.pairs[i];
    const rightPair = config.pairs[shuffled[i]];
    const rowY = curY + i * (itemH + gap);

    // 좌측 항목 박스
    const leftNum = config.numbering ? `${CIRCLED_NUMS[i] || `${i + 1}.`} ` : "";
    const boxW = sideW - mmToPx(4);
    const textPad = mmToPx(3);
    els.push(shapeEl({
      type: "roundRect",
      x: leftX, y: rowY, w: boxW, h: itemH,
      fill: leftBg, radius,
      border: { enabled: true, color: "#ddd", width: 1, style: "solid" },
    }));
    els.push(textEl({
      x: leftX + textPad, y: rowY, w: boxW - textPad * 2, h: itemH,
      text: `${leftNum}${leftPair.left}`,
      widthMode: "fixed",
      style: { fontSize: fs, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
    }));

    // 좌측 dot
    els.push(shapeEl({
      type: "ellipse",
      x: leftX + boxW + mmToPx(0.5), y: rowY + itemH / 2 - dotR, w: dotR * 2, h: dotR * 2,
      fill: "#999999",
    }));

    // 우측 항목 박스
    const rBoxX = rightX + mmToPx(4);
    els.push(shapeEl({
      type: "roundRect",
      x: rBoxX, y: rowY, w: boxW, h: itemH,
      fill: rightBg, radius,
      border: { enabled: true, color: "#ddd", width: 1, style: "solid" },
    }));
    els.push(textEl({
      x: rBoxX + textPad, y: rowY, w: boxW - textPad * 2, h: itemH,
      text: rightPair.right,
      widthMode: "fixed",
      style: { fontSize: fs, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
    }));

    // 우측 dot
    els.push(shapeEl({
      type: "ellipse",
      x: rBoxX - dotR * 2 - mmToPx(0.5), y: rowY + itemH / 2 - dotR, w: dotR * 2, h: dotR * 2,
      fill: "#999999",
    }));
  }

  curY += pairCount * (itemH + gap) - gap;

  // 정답 표시 (교사용)
  if (config.show_answer_key && config.answer_key_text) {
    curY += mmToPx(2);
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(5),
      text: `정답: ${config.answer_key_text}`,
      widthMode: "fixed",
      style: { fontSize: 10, fontWeight: "normal", color: "#999999", underline: false, alignX: "right", alignY: "middle" },
    }));
    curY += mmToPx(6);
  }

  return { elements: els, height: curY - y };
};

const buildGrid = (config: GridConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  const isImageMode = config.cell_content_type === "image_and_text";
  const cellW = CONTENT_W / config.cols;
  const textH = mmToPx(8);
  const imgSize = Math.min(cellW - 8, mmToPx(40)); // 정사각형, 좌우 4px 패딩, 최대 40mm
  const cellH = isImageMode ? imgSize + textH + 4 : mmToPx(12);
  let curY = y;

  for (let r = 0; r < config.rows; r++) {
    for (let c = 0; c < config.cols; c++) {
      const idx = r * config.cols + c;
      const item = config.items[idx];
      const cx = x + c * cellW;
      const cy = curY;

      const borderStyle = config.cell_border === "dashed" ? "dashed" : "solid";
      const borderEnabled = config.cell_border !== "none";
      const radius = config.cell_border === "rounded" ? 6 : 0;

      // 카드 배경
      els.push(shapeEl({
        type: radius > 0 ? "roundRect" : "rect",
        x: cx + 2, y: cy + 2, w: cellW - 4, h: cellH - 4,
        fill: "#ffffff", radius,
        border: borderEnabled ? { enabled: true, color: "#e0e0e0", width: 1, style: borderStyle } : undefined,
      }));

      // 하단 텍스트 라벨 ID (imageSlot의 labelId로 연결)
      const labelTextId = uid();

      if (isImageMode) {
        // 이미지 삽입 프레임 (imageSlot) — 셀 중앙 정렬
        const hasImage = item?.imageUrl && (item.imageUrl.startsWith("url(") || item.imageUrl.startsWith("data:"));
        const imgOffsetX = (cellW - imgSize) / 2;
        els.push(shapeEl({
          type: "roundRect",
          x: cx + imgOffsetX, y: cy + 4, w: imgSize, h: imgSize,
          fill: hasImage ? item.imageUrl! : "#f5f5f5",
          radius: 4,
          border: hasImage ? undefined : { enabled: true, color: "#e8e8e8", width: 1, style: "dashed" as "solid" | "dashed" | "dotted" | "double" },
          subType: "imageSlot" as import("../model/canvasTypes").ShapeSubType,
          text: hasImage ? "" : "두 번 클릭해서 이미지 삽입",
          textStyle: hasImage ? undefined : { fontSize: 10, fontWeight: "normal", color: "#bbbbbb" },
          labelId: labelTextId,
          ...(hasImage && item.imageBox ? { imageBox: item.imageBox } : {}),
        }));
      }

      // 텍스트 라벨 (하단) — imageSlot의 labelId와 연결
      const textY = isImageMode ? cy + 4 + imgSize : cy;
      els.push(textEl({
        id: labelTextId,
        x: cx + 2, y: textY, w: cellW - 4, h: textH,
        text: item?.text || "",
        style: { fontSize: 14, fontWeight: "bold", color: "#333333", underline: false, alignX: "center", alignY: "middle" },
      }));
    }
    curY += cellH;
  }

  return { elements: els, height: curY - y };
};

const buildRewardTracker = (config: RewardTrackerConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  const slotSize = mmToPx(14); // 14mm (기존 6mm에서 2배+ 확대)
  const gap = mmToPx(4);
  const icon = (config as RewardTrackerConfig & { icon?: string }).icon || "☆";
  const totalW = config.slot_count * (slotSize + gap) - gap;
  const startX = x + (CONTENT_W - totalW) / 2; // 중앙 정렬

  if (config.label) {
    els.push(textEl({
      x, y, w: CONTENT_W, h: mmToPx(7),
      text: config.label,
      style: { fontSize: 16, fontWeight: "bold", color: "#666666", underline: false, alignX: "center", alignY: "middle" },
    }));
  }

  const slotY = config.label ? y + mmToPx(8) : y;

  for (let i = 0; i < config.slot_count; i++) {
    els.push(shapeEl({
      type: "ellipse",
      x: startX + i * (slotSize + gap), y: slotY,
      w: slotSize, h: slotSize,
      fill: "#ffffff",
      border: { enabled: true, color: "#ffc107", width: 2, style: "solid" },
    }));
    els.push(textEl({
      x: startX + i * (slotSize + gap), y: slotY,
      w: slotSize, h: slotSize,
      text: icon,
      style: { fontSize: 22, fontWeight: "normal", color: "#ffc107", underline: false, alignX: "center", alignY: "middle" },
    }));
  }

  const totalH = (config.label ? mmToPx(8) : 0) + slotSize + mmToPx(3);
  return { elements: els, height: totalH };
};

const buildChecklist = (config: ChecklistTableConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const rows = config.rows.length + 1; // header + data
  const cols = 5;
  const rowH = mmToPx(8);
  const w = CONTENT_W;
  const h = rows * rowH;
  const colWidths = [w * 0.08, w * 0.32, w * 0.15, w * 0.15, w * 0.3];

  const cells: { text: string; style?: { fontSize: number; alignX: "left" | "center" | "right"; fontWeight?: "normal" | "bold" } }[][] = [];
  cells.push([
    { text: "No", style: { fontSize: 11, alignX: "center", fontWeight: "bold" } },
    { text: "어휘", style: { fontSize: 11, alignX: "center", fontWeight: "bold" } },
    { text: "어두", style: { fontSize: 11, alignX: "center", fontWeight: "bold" } },
    { text: "어중", style: { fontSize: 11, alignX: "center", fontWeight: "bold" } },
    { text: "메모", style: { fontSize: 11, alignX: "center", fontWeight: "bold" } },
  ]);
  config.rows.forEach((r, i) => {
    cells.push([
      { text: `${i + 1}`, style: { fontSize: 11, alignX: "center" } },
      { text: r.word, style: { fontSize: 11, alignX: "left" } },
      { text: "", style: { fontSize: 11, alignX: "center" } },
      { text: "", style: { fontSize: 11, alignX: "center" } },
      { text: "", style: { fontSize: 11, alignX: "left" } },
    ]);
  });

  const table: TableElement = {
    id: uid(),
    type: "table",
    x, y, w, h,
    rows, cols,
    cells: cells as never,
    colWidths,
    rowHeights: Array(rows).fill(rowH),
    cellStyle: { fontSize: 11, alignX: "center" },
    borderConfig: {
      outer: { color: "#cccccc", width: 1, style: "solid" },
      horizontal: { color: "#dddddd", width: 0.5, style: "solid" },
      vertical: { color: "#dddddd", width: 0.5, style: "solid" },
    },
  };

  return { elements: [table], height: h };
};

const buildInfoGuide = (config: InfoGuideConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  const boxH = mmToPx(25);

  // Background
  els.push(shapeEl({ type: "roundRect", x, y, w: CONTENT_W, h: boxH, fill: "#f9f9ff", radius: 8, border: { enabled: true, color: "#e8e8f0", width: 1, style: "solid" } }));

  // Character circle — 항상 표시 (이모지 비어있어도 회색 원)
  els.push(shapeEl({ type: "ellipse", x: x + mmToPx(3), y: y + mmToPx(3), w: mmToPx(16), h: mmToPx(16), fill: "#eeeeee" }));
  if (config.character_emoji) {
    els.push(textEl({
      x: x + mmToPx(3), y: y + mmToPx(3), w: mmToPx(16), h: mmToPx(16),
      text: config.character_emoji,
      style: { fontSize: 24, fontWeight: "normal", color: "#333333", underline: false, alignX: "center", alignY: "middle" },
    }));
  }

  const textX = x + mmToPx(22);
  const textW = CONTENT_W - mmToPx(26);

  if (config.speech) {
    els.push(textEl({
      x: textX, y: y + mmToPx(2), w: textW, h: mmToPx(10),
      text: config.speech,
      style: { fontSize: 13, fontWeight: "normal", color: "#333333", underline: false, alignX: "left", alignY: "top" },
    }));
  }

  if (config.tip) {
    els.push(textEl({
      x: textX, y: y + mmToPx(14), w: textW, h: mmToPx(8),
      text: config.tip,
      style: { fontSize: 11, fontWeight: "normal", color: "#795548", underline: false, alignX: "left", alignY: "top" },
    }));
  }

  return { elements: els, height: boxH + mmToPx(2) };
};

const buildOutlineTitle = (config: OutlineTitleConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;

  els.push(textEl({
    x, y: curY, w: CONTENT_W, h: mmToPx(18),
    text: config.text,
    style: {
      fontSize: 48,
      fontWeight: "bold",
      color: "#ffffff",
      underline: false,
      alignX: "center",
      alignY: "middle",
      textStroke: {
        enabled: true,
        width: 2,
        color: config.outline_color || "#333333",
      },
    },
  }));
  curY += mmToPx(18);

  if (config.subtitle) {
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(6),
      text: config.subtitle,
      style: { fontSize: 12, fontWeight: "normal", color: "#888888", underline: false, alignX: "center", alignY: "top" },
    }));
    curY += mmToPx(6);
  }

  return { elements: els, height: curY - y };
};

const buildWritingPractice = (config: WritingPracticeConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  let curY = y;

  const nb = NOTEBOOK_SPECS[config.notebook_type || "8칸"] ?? NOTEBOOK_SPECS["8칸"];
  const cellSizePx = mmToPx(parseInt(nb.cellSize));
  const gridW = nb.cols * cellSizePx;
  const gridX = x + (CONTENT_W - gridW) / 2;

  // Model text
  if (config.show_model && config.text) {
    els.push(shapeEl({ type: "roundRect", x, y: curY, w: CONTENT_W, h: mmToPx(7), fill: "#f9f9f9", radius: 4, border: { enabled: true, color: "#e0e0e0", width: 1, style: "solid" } }));
    els.push(textEl({
      x: x + mmToPx(2), y: curY, w: CONTENT_W - mmToPx(4), h: mmToPx(7),
      text: config.text,
      style: { fontSize: 14, fontWeight: "bold", color: "#333333", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += mmToPx(9);
  }

  // Grid as TableElement
  const chars: string[] = [];
  if (config.text) {
    for (const ch of config.text) {
      chars.push(ch === " " ? "" : ch);
    }
  }
  const rc = config.row_count || 2;

  const cells: { text: string; style?: { fontSize: number; alignX: "center"; color?: string } }[][] = [];
  for (let r = 0; r < rc; r++) {
    const row: { text: string; style?: { fontSize: number; alignX: "center"; color?: string } }[] = [];
    for (let c = 0; c < nb.cols; c++) {
      const idx = r * nb.cols + c;
      const ch = idx < chars.length ? chars[idx] : "";
      const isGuide = config.show_guide && ch;
      row.push({
        text: isGuide ? ch : "",
        style: { fontSize: Math.round(cellSizePx * 0.6), alignX: "center" as const, color: isGuide ? "#cccccc" : "#333333" },
      });
    }
    cells.push(row);
  }

  const table: TableElement = {
    id: uid(),
    type: "table",
    x: gridX, y: curY,
    w: gridW, h: rc * cellSizePx,
    rows: rc, cols: nb.cols,
    cells: cells as never,
    colWidths: Array(nb.cols).fill(cellSizePx),
    rowHeights: Array(rc).fill(cellSizePx),
    cellStyle: { fontSize: 24, alignX: "center" },
    borderConfig: {
      outer: { color: "#999999", width: 1, style: "solid" },
      horizontal: { color: "#cccccc", width: 0.5, style: "solid" },
      vertical: { color: "#cccccc", width: 0.5, style: "solid" },
    },
  };

  els.push(table);
  curY += rc * cellSizePx;

  return { elements: els, height: curY - y };
};

const buildColoringArea = (config: ColoringAreaConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const h = mmToPx((config.size_ratio || 0.6) * 200);
  const els: CanvasElement[] = [];

  // 이미지 삽입 프레임 (imageSlot) — 도형 자체에 가이드 텍스트 내장
  // 이미지가 fill을 덮으면 텍스트도 자동으로 안 보임 (shouldClearPlaceholder 로직)
  els.push(shapeEl({
    type: "roundRect", x, y, w: CONTENT_W, h,
    fill: "#f5f5f5", radius: 8,
    border: { enabled: true, color: "#e0e0e0", width: 1.5, style: "dashed" },
    subType: "imageSlot" as import("../model/canvasTypes").ShapeSubType,
    text: "색칠공부 이미지를 삽입해보세요",
    textStyle: { fontSize: 14, fontWeight: "normal", color: "#bbbbbb" },
  }));

  return { elements: els, height: h + mmToPx(2) };
};

// --- Main builder ---

const buildComponentElements = (
  comp: WorksheetComponent,
  x: number,
  y: number,
): { elements: CanvasElement[]; height: number } => {
  switch (comp.type) {
    case "header_instruction":
      return buildHeader(comp.config as HeaderInstructionConfig, x, y);
    case "arrow_transform":
      return buildArrowTransform(comp.config as ArrowTransformConfig, x, y);
    case "sequential_repeat":
      return buildSequentialRepeat(comp.config as SequentialRepeatConfig, x, y);
    case "selection_sentence":
      return buildSelectionSentence(comp.config as SelectionSentenceConfig, x, y);
    case "grid_NxM":
      return buildGrid(comp.config as GridConfig, x, y);
    case "reward_tracker":
      return buildRewardTracker(comp.config as RewardTrackerConfig, x, y);
    case "checklist_table":
      return buildChecklist(comp.config as ChecklistTableConfig, x, y);
    case "info_guide":
      return buildInfoGuide(comp.config as InfoGuideConfig, x, y);
    case "outline_title":
      return buildOutlineTitle(comp.config as OutlineTitleConfig, x, y);
    case "writing_practice":
      return buildWritingPractice(comp.config as WritingPracticeConfig, x, y);
    case "coloring_area":
      return buildColoringArea(comp.config as ColoringAreaConfig, x, y);
    case "sentence_completion":
      return buildSentenceCompletion(comp.config as SentenceCompletionConfig, x, y);
    case "sentence_fill":
      return buildSentenceFill(comp.config as SentenceFillConfig, x, y);
    case "passage_question":
      return buildPassageQuestion(comp.config as PassageQuestionConfig, x, y);
    case "matching_connect":
      return buildMatchingConnect(comp.config as MatchingConnectConfig, x, y);
    case "date_name_field":
    case "clock_face":
      // 자유 배치 요소 — pageFactory에서 직접 삽입
      return { elements: [], height: 0 };
    default:
      return { elements: [], height: 0 };
  }
};

/**
 * 단일 컴포넌트 타입의 기본 config로 CanvasElement[]를 생성.
 * 캔버스의 현재 페이지에 직접 삽입할 때 사용.
 */
export const buildWorksheetComponentElements = (
  componentType: WorksheetComponentType,
  insertY: number,
): CanvasElement[] => {
  const config = structuredClone(DEFAULT_CONFIGS[componentType]);
  return buildWorksheetComponentElementsFromConfig(componentType, config, insertY);
};

/**
 * 주어진 config로 CanvasElement[]를 생성.
 * 편집 패널에서 config 변경 시 요소를 재빌드할 때 사용.
 */
export const buildWorksheetComponentElementsFromConfig = (
  componentType: WorksheetComponentType,
  config: WorksheetConfig,
  insertY: number,
): CanvasElement[] => {
  const comp: WorksheetComponent = {
    id: crypto.randomUUID(),
    type: componentType,
    config,
    collapsed: false,
  };
  const { elements } = buildComponentElements(comp, MARGIN, insertY);
  return elements;
};

/**
 * 모든 워크시트 컴포넌트를 Y축 순서대로 재정렬.
 * 컴포넌트 크기 변경 시 아래 컴포넌트들을 자동으로 밀거나 당김.
 * @returns 재정렬된 전체 elements 배열 + 컴포넌트별 새 elementIds
 */
/**
 * 모든 워크시트 컴포넌트를 **insertedComponents 배열 순서**대로 재배치.
 * 배열 순서가 곧 캔버스 상의 위→아래 순서.
 * 각 컴포넌트의 내부 요소 상대 위치는 유지하고, 컴포넌트 간 COMP_GAP 간격을 보장.
 */
/** XY 완전 자유 배치 — reflow에서 완전 제외 */
const FREE_POSITION_TYPES = new Set<string>(["date_name_field", "clock_face"]);
/** Y 자유 + X 중앙 정렬 — Y는 사용자 설정값 유지, 아래 컴포넌트는 이 컴포넌트 하단부터 스택 */
export const Y_FREE_TYPES = new Set<string>(["header_instruction"]);

export const reflowWorksheetComponents = (
  pageElements: CanvasElement[],
  insertedComponents: { id: string; type?: string; elementIds: string[] }[],
  /** 드래그 중인 컴포넌트 ID — 이 컴포넌트는 reflow에서 제외 (사용자가 드래그 중) */
  skipComponentId?: string,
  /** true면 드롭 시 X를 MARGIN으로 리셋 (기본 false — 드래그 중에는 X 건드리지 않음) */
  resetX = false,
): {
  elements: CanvasElement[];
  updatedElementIds: Map<string, string[]>;
} => {
  // 3가지 카테고리로 분류 (삽입 순서 유지)
  const freeComponents: typeof insertedComponents = [];
  const managedComponents: typeof insertedComponents = []; // Y_FREE + 일반 (순서 유지)
  for (const comp of insertedComponents) {
    if (comp.type && FREE_POSITION_TYPES.has(comp.type)) {
      freeComponents.push(comp);
    } else {
      managedComponents.push(comp); // Y_FREE와 일반을 섞어 원래 순서 유지
    }
  }

  // 워크시트에 속하지 않는 요소 (로고 등)
  const managedElementIds = new Set<string>();
  for (const comp of managedComponents) {
    for (const eid of comp.elementIds) managedElementIds.add(eid);
  }
  const nonWorksheetElements = pageElements.filter(
    (el) => !managedElementIds.has(el.id),
  );

  let curY = MARGIN;
  const allReflowed: CanvasElement[] = [...nonWorksheetElements];
  const updatedElementIds = new Map<string, string[]>();

  // 완전 자유 배치 컴포넌트 — 위치 변경 없음
  for (const comp of freeComponents) {
    updatedElementIds.set(comp.id, comp.elementIds);
  }

  for (const comp of managedComponents) {
    const isYFree = comp.type != null && Y_FREE_TYPES.has(comp.type);
    const idSet = new Set(comp.elementIds);
    const compElements = pageElements.filter((el) => idSet.has(el.id));
    if (compElements.length === 0) continue;

    // 드래그 중인 컴포넌트는 위치를 바꾸지 않고, 공간만 확보
    if (skipComponentId && comp.id === skipComponentId) {
      // 원본 위치 그대로 유지
      allReflowed.push(...compElements);
      updatedElementIds.set(comp.id, compElements.map((el) => el.id));

      // 이 컴포넌트가 차지하는 높이만큼 curY를 확보
      let compMaxBottom = curY;
      for (const el of compElements) {
        if ("y" in el && "h" in el) {
          const bottom = (el as { y: number; h: number }).y + (el as { y: number; h: number }).h;
          if (bottom > compMaxBottom) compMaxBottom = bottom;
        }
      }
      curY = compMaxBottom + COMP_GAP;
      continue;
    }

    // Y 자유 컴포넌트 (header_instruction): Y는 사용자 설정값 유지, X만 중앙 정렬
    // 아래 컴포넌트는 이 컴포넌트 하단부터 스택
    if (isYFree) {
      let deltaX = 0;
      if (resetX) {
        let minX = Infinity;
        let maxRight = -Infinity;
        for (const el of compElements) {
          if ("x" in el) {
            const x = (el as { x: number }).x;
            if (x < minX) minX = x;
          }
          if ("x" in el && "w" in el) {
            const right = (el as { x: number; w: number }).x + (el as { x: number; w: number }).w;
            if (right > maxRight) maxRight = right;
          }
        }
        if (minX !== Infinity && maxRight !== -Infinity) {
          const compWidth = maxRight - minX;
          const targetMinX = (PAGE_W - compWidth) / 2;
          deltaX = targetMinX - minX;
        }
      }

      const shifted = deltaX !== 0
        ? compElements.map((el) => {
            if ("x" in el) return { ...el, x: (el as { x: number }).x + deltaX };
            return el;
          })
        : compElements;

      allReflowed.push(...shifted);
      updatedElementIds.set(comp.id, shifted.map((el) => el.id));

      // 이 컴포넌트의 하단을 curY로 설정 → 아래 컴포넌트가 여기서부터 스택
      let maxBottom = curY;
      for (const el of shifted) {
        if ("y" in el && "h" in el) {
          const bottom = (el as { y: number; h: number }).y + (el as { y: number; h: number }).h;
          if (bottom > maxBottom) maxBottom = bottom;
        }
      }
      curY = maxBottom + COMP_GAP;
      continue;
    }

    // 이 컴포넌트의 기존 최소 Y (+ resetX일 때 최소 X)
    let minY = Infinity;
    for (const el of compElements) {
      if ("y" in el) {
        const y = (el as { y: number }).y;
        if (y < minY) minY = y;
      }
    }
    if (minY === Infinity) minY = curY;

    const deltaY = curY - minY;

    // X 중앙 정렬: 드롭 시에만 적용 (드래그 중에는 X를 건드리지 않음)
    // 컴포넌트 바운딩 박스의 중심을 페이지 중심(PAGE_W/2)에 맞춤
    let deltaX = 0;
    if (resetX) {
      let minX = Infinity;
      let maxRight = -Infinity;
      for (const el of compElements) {
        if ("x" in el) {
          const x = (el as { x: number }).x;
          if (x < minX) minX = x;
        }
        if ("x" in el && "w" in el) {
          const right = (el as { x: number; w: number }).x + (el as { x: number; w: number }).w;
          if (right > maxRight) maxRight = right;
        }
      }
      if (minX !== Infinity && maxRight !== -Infinity) {
        const compWidth = maxRight - minX;
        const targetMinX = (PAGE_W - compWidth) / 2;
        deltaX = targetMinX - minX;
      }
    }

    const shifted = (deltaY !== 0 || deltaX !== 0)
      ? compElements.map((el) => {
          const hasX = "x" in el;
          const hasY = "y" in el;
          if (hasX && hasY) {
            return { ...el, x: (el as { x: number }).x + deltaX, y: (el as { y: number }).y + deltaY };
          }
          if (hasY) return { ...el, y: (el as { y: number }).y + deltaY };
          if (hasX) return { ...el, x: (el as { x: number }).x + deltaX };
          return el;
        })
      : compElements;

    allReflowed.push(...shifted);
    updatedElementIds.set(comp.id, shifted.map((el) => el.id));

    // 이 컴포넌트의 최하단 Y 계산 → 다음 컴포넌트 시작점
    let maxBottom = curY;
    for (const el of shifted) {
      if ("y" in el && "h" in el) {
        const bottom = (el as { y: number; h: number }).y + (el as { y: number; h: number }).h;
        if (bottom > maxBottom) maxBottom = bottom;
      }
    }
    curY = maxBottom + COMP_GAP;
  }

  return { elements: allReflowed, updatedElementIds };
};

export const buildWorksheetPage = (components: WorksheetComponent[]): Page => {
  const allElements: CanvasElement[] = [];
  let curY = MARGIN;

  for (const comp of components) {
    const { elements, height } = buildComponentElements(comp, MARGIN, curY);
    allElements.push(...elements);
    curY += height + COMP_GAP;
  }

  return {
    id: crypto.randomUUID(),
    pageNumber: 1,
    templateId: null,
    orientation: "vertical",
    elements: withLogoCanvasElements(allElements),
    background: { type: "none" },
    rev: 0,
  };
};
