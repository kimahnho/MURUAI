/**
 * 이미지 프롬프트 빌더 v3
 *
 * 번역 단계 제거 — Gemini 3.1 Flash Image Preview가 한국어 직접 이해.
 * 유저 입력 그대로 + agent 보완 + 안전 규칙을 1개 프롬프트로 조립.
 * Gemini 호출 0번. 순수 로컬 로직만.
 */
import type { ChildVisualAgent, VisualStyle, BackgroundLevel } from "../model/types";

// ═══════════════════════════════════════════════════════
//  입력 분석 (로컬, API 호출 없음)
// ═══════════════════════════════════════════════════════

export interface ParsedInput {
  isMultiCut: boolean;
  cutCount: number;
  subject: string;
  characters: string[];
  isSequence: boolean;
  isKoreanCulture: boolean;
  rawInput: string;
}

const MULTI_CUT_PATTERNS = /(\d+)\s*(?:컷|장|개|프레임|씬|scene)/;
const SEQUENCE_KEYWORDS = /순서|과정|단계|이야기|스토리|변화|전후|전래|동화/;
const KOREAN_CULTURE = /흥부|놀부|콩쥐|팥쥐|심청|홍길동|토끼전|선녀|나무꾼|해와달|호랑이|도깨비|금도끼|은도끼|떡|한복|설날|추석|윷놀이|제기|팽이/;

export function parseInput(input: string): ParsedInput {
  const cutMatch = input.match(MULTI_CUT_PATTERNS);
  const cutCount = cutMatch ? parseInt(cutMatch[1]) : 1;

  const characters: string[] = [];
  const charPatterns = input.match(/([가-힣]{2,4})(?:와|과|이와|랑)\s*([가-힣]{2,4})/);
  if (charPatterns) {
    characters.push(charPatterns[1], charPatterns[2]);
  }

  const subject = input
    .replace(MULTI_CUT_PATTERNS, "")
    .replace(/이미지|그려줘|만들어줘|생성해줘|생성/g, "")
    .trim();

  return {
    isMultiCut: cutCount > 1,
    cutCount,
    subject: subject || input,
    characters,
    isSequence: SEQUENCE_KEYWORDS.test(input) || cutCount > 2,
    isKoreanCulture: KOREAN_CULTURE.test(input),
    rawInput: input,
  };
}

// ═══════════════════════════════════════════════════════
//  Agent 기본값 (유저가 안 정한 부분만)
// ═══════════════════════════════════════════════════════

const STYLE_DEFAULTS: Record<VisualStyle, string> = {
  flat: "Clean flat illustration, thick outlines, solid bright colors, rounded shapes.",
  pastel: "Soft pastel colors, gray outlines, muted tones, gentle and calm.",
  realistic: "Photorealistic, clean white background, soft lighting, Korean context.",
  high_contrast: "Bold high-contrast, extra thick outlines, vibrant saturated colors.",
  line_art: "Black and white line drawing, clean outlines, no fill colors.",
};

const BG_DEFAULTS: Record<BackgroundLevel, string> = {
  none: "Pure white background.",
  simple: "Light solid background.",
  contextual: "Simple contextual background.",
};

function getComplexityGuide(level: number): string {
  const guides: Record<number, string> = {
    1: "Very simple, 2-3 elements max.",
    2: "Simple, minimal detail.",
    3: "Moderate detail, 3-5 elements.",
    4: "Moderately detailed.",
    5: "Detailed with multiple elements.",
  };
  return guides[level] ?? guides[3];
}

function getDiagMod(diagnosis: string | null): string {
  if (!diagnosis) return "";
  const m: Record<string, string> = {
    ASD_L3: "Maximum simplicity, 2-3 elements, exaggerated expressions.",
    ASD_L2: "Reduced complexity, clear boundaries.",
    ADHD: "High contrast focal element, minimal background.",
    ID_severe: "Very simple, photorealistic preferred.",
    ID_moderate: "Simple, 3-5 colors, everyday objects.",
  };
  return m[diagnosis] ?? "";
}

function getLearned(agent: ChildVisualAgent): string {
  const parts: string[] = [];
  if (agent.effectiveThemes.length > 0) parts.push(`Child likes: ${agent.effectiveThemes.join(", ")}.`);
  if (agent.avoidThemes.length > 0) parts.push(`Avoid: ${agent.avoidThemes.join(", ")}.`);
  const lessons = (agent.learnedPatterns ?? []).filter((p) => p.wasAccepted).slice(-3).map((p) => p.changedParams.additionalInstruction).filter(Boolean);
  if (lessons.length > 0) parts.push(`Learned: ${lessons.join("; ")}.`);
  return parts.join(" ");
}

// ═══════════════════════════════════════════════════════
//  PUBLIC API — 프롬프트 조립 (Gemini 호출 0번)
// ═══════════════════════════════════════════════════════

export interface PromptBuildResult {
  prompt: string;
  style: VisualStyle;
  backgroundLevel: BackgroundLevel;
  complexity: number;
  parsed: ParsedInput;
}

/**
 * 유저 입력 + agent → 이미지 생성 프롬프트 1개
 *
 * Gemini 호출 없음. 로컬에서 조립만.
 * 유저 입력이 최상단, agent는 보완, 안전 규칙은 필수.
 */
export function buildImagePrompt(
  userInput: string,
  agent: ChildVisualAgent,
): PromptBuildResult {
  const parsed = parseInput(userInput);

  const parts: string[] = [];

  // ══ 1. 유저 입력 (절대 최우선, 그대로) ══
  parts.push(userInput);

  // 멀티컷이면 레이아웃 지시 추가
  if (parsed.isMultiCut) {
    const grid = parsed.cutCount <= 4 ? "2x2" : parsed.cutCount <= 6 ? "2x3" : "2x4";
    parts.push(`\nLayout: Single image with ${parsed.cutCount} panels in ${grid} grid. Each panel shows one scene in sequence.`);
  }

  // 캐릭터 일관성 (멀티컷 + 캐릭터 감지 시)
  if (parsed.characters.length > 0 && parsed.isMultiCut) {
    parts.push(`Characters ${parsed.characters.join(", ")} must look identical across all panels.`);
  }

  // 한국 문화 맥락
  if (parsed.isKoreanCulture) {
    parts.push("Korean traditional context: hanbok clothing, traditional Korean architecture, Korean cultural items.");
  }

  // ══ 2. Agent 보완 (유저가 안 정한 부분만) ══
  const agentHints = [
    `[Defaults — only if not specified above]`,
    `Style: ${STYLE_DEFAULTS[agent.preferredStyle]}`,
    `Background: ${BG_DEFAULTS[agent.backgroundLevel]}`,
    `Complexity: ${getComplexityGuide(agent.optimalComplexity)}`,
  ];

  if (agent.functionalAgeMonths) {
    agentHints.push(`For child ~${Math.round(agent.functionalAgeMonths / 12)} years functional age.`);
  }

  const diag = getDiagMod(agent.diagnosis);
  if (diag) agentHints.push(diag);

  const learned = getLearned(agent);
  if (learned) agentHints.push(learned);

  parts.push("\n" + agentHints.join(" "));

  // ══ 3. 안전 규칙 (필수) ══
  parts.push("\n[MUST] No text/words/letters/numbers/hangul in the image. No violence. Age-appropriate. Printable A4.");

  return {
    prompt: parts.join("\n"),
    style: agent.preferredStyle,
    backgroundLevel: agent.backgroundLevel,
    complexity: agent.optimalComplexity,
    parsed,
  };
}
