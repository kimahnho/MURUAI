/**
 * WorksheetComponent[] → Page 변환.
 * 학습자료 에디터의 컴포넌트들을 기존 CanvasElement 타입으로 변환하여
 * 캔버스 에디터에서 사용 가능한 Page 객체를 생성한다.
 */
import type { CanvasElement, TextElement, ShapeElement, TableElement } from "../model/canvasTypes";
import type { Page } from "../model/pageTypes";
import type { WorksheetComponent } from "@/features/worksheet-editor/model/types";
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
} from "@/features/worksheet-editor/model/types";
import { NOTEBOOK_SPECS } from "@/features/worksheet-editor/constants/defaults";
import { withLogoCanvasElements } from "./logoElement";

const MM_TO_PX = 3.7795;
const mmToPx = (mm: number) => mm * MM_TO_PX;

const PAGE_W = mmToPx(210);
const MARGIN = mmToPx(15);
const CONTENT_W = PAGE_W - MARGIN * 2;
const COMP_GAP = mmToPx(5);

const uid = () => crypto.randomUUID();

const textEl = (
  overrides: Partial<TextElement> & { x: number; y: number; w: number; h: number; text: string },
): TextElement => ({
  id: uid(),
  type: "text",
  locked: true,
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

  // Title
  els.push(textEl({
    x, y: curY, w: CONTENT_W, h: mmToPx(10),
    text: config.title,
    style: { fontSize: 28, fontWeight: "bold", color: "#2c2c2c", underline: false, alignX: "left", alignY: "middle" },
  }));
  curY += mmToPx(10);

  // Instruction
  if (config.instruction) {
    els.push(textEl({
      x, y: curY, w: CONTENT_W, h: mmToPx(6),
      text: config.instruction,
      style: { fontSize: 14, fontWeight: "normal", color: "#888888", underline: false, alignX: "left", alignY: "top" },
    }));
    curY += mmToPx(6);
  }

  // Rule note
  if (config.rule_note) {
    els.push(shapeEl({
      type: "roundRect", x, y: curY, w: CONTENT_W, h: mmToPx(6),
      fill: "#f0f7ff", radius: 4,
      border: { enabled: true, color: "#d0e3ff", width: 1, style: "solid" },
    }));
    els.push(textEl({
      x: x + mmToPx(2), y: curY, w: CONTENT_W - mmToPx(4), h: mmToPx(6),
      text: config.rule_note,
      style: { fontSize: 11, fontWeight: "normal", color: "#2e6da4", underline: false, alignX: "left", alignY: "middle" },
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
      style: { fontSize: 10, fontWeight: "normal", color: "#999999", underline: false, alignX: "left", alignY: "middle" },
    }));
    curY += mmToPx(6);
  }

  return { elements: els, height: curY - y };
};

const buildGrid = (config: GridConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  const cellW = CONTENT_W / config.cols;
  const cellH = config.cell_content_type === "image_and_text" ? mmToPx(30) : mmToPx(12);
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

      els.push(shapeEl({
        type: radius > 0 ? "roundRect" : "rect",
        x: cx + 2, y: cy + 2, w: cellW - 4, h: cellH - 4,
        fill: "#ffffff", radius,
        border: borderEnabled ? { enabled: true, color: "#e0e0e0", width: 1, style: borderStyle } : undefined,
      }));

      if (item?.text) {
        els.push(textEl({
          x: cx + 2, y: cy + (config.cell_content_type === "image_and_text" ? cellH - mmToPx(8) : 0),
          w: cellW - 4, h: mmToPx(8),
          text: item.text,
          style: { fontSize: 14, fontWeight: "bold", color: "#333333", underline: false, alignX: "center", alignY: "middle" },
        }));
      }
    }
    curY += cellH;
  }

  return { elements: els, height: curY - y };
};

const buildRewardTracker = (config: RewardTrackerConfig, x: number, y: number): { elements: CanvasElement[]; height: number } => {
  const els: CanvasElement[] = [];
  const slotSize = mmToPx(6);
  const gap = mmToPx(2);
  const totalW = config.slot_count * (slotSize + gap);
  let startX = x + CONTENT_W - totalW;

  if (config.label) {
    els.push(textEl({
      x: startX - mmToPx(20), y, w: mmToPx(18), h: slotSize,
      text: config.label,
      style: { fontSize: 10, fontWeight: "normal", color: "#999999", underline: false, alignX: "right", alignY: "middle" },
    }));
  }

  for (let i = 0; i < config.slot_count; i++) {
    els.push(shapeEl({
      type: "ellipse", x: startX + i * (slotSize + gap), y, w: slotSize, h: slotSize,
      fill: "#ffffff",
      border: { enabled: true, color: "#ffc107", width: 1, style: "solid" },
    }));
  }

  return { elements: els, height: slotSize + mmToPx(2) };
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

  // Character circle
  if (config.character_emoji) {
    els.push(shapeEl({ type: "ellipse", x: x + mmToPx(3), y: y + mmToPx(3), w: mmToPx(16), h: mmToPx(16), fill: "#eeeeee" }));
    els.push(textEl({
      x: x + mmToPx(3), y: y + mmToPx(3), w: mmToPx(16), h: mmToPx(16),
      text: config.character_emoji,
      style: { fontSize: 24, fontWeight: "normal", color: "#333333", underline: false, alignX: "center", alignY: "middle" },
    }));
  }

  const textX = config.character_emoji ? x + mmToPx(22) : x + mmToPx(4);
  const textW = config.character_emoji ? CONTENT_W - mmToPx(26) : CONTENT_W - mmToPx(8);

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
    style: { fontSize: 48, fontWeight: "bold", color: config.outline_color || "#333333", underline: false, alignX: "center", alignY: "middle" },
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

  els.push(shapeEl({
    type: "roundRect", x, y, w: CONTENT_W, h,
    fill: "#ffffff", radius: 8,
    border: { enabled: true, color: "#dddddd", width: 2, style: "dashed" },
  }));
  els.push(textEl({
    x, y: y + h / 2 - mmToPx(5), w: CONTENT_W, h: mmToPx(10),
    text: `🎨 ${config.image_description || "이미지 영역"}`,
    style: { fontSize: 14, fontWeight: "normal", color: "#cccccc", underline: false, alignX: "center", alignY: "middle" },
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
    default:
      return { elements: [], height: 0 };
  }
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
