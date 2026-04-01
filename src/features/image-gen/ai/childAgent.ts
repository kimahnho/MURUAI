/**
 * 아동별 시각 Agent — CRUD + 학습
 *
 * 학습 기준 레퍼런스:
 * - Multi-Armed Bandit: 탐색/활용 비율 (ACM, 2022)
 * - Thompson Sampling: 신뢰도 기반 변경 (Stanford Tutorial)
 * - Spotify: explicit + implicit 피드백 결합
 * - Netflix: 빠른 온보딩 + 점진 학습
 * - IJCAI 2019: long-term / short-term 선호 분리
 */
import type { ChildVisualAgent, VisualStyle, ColorSensitivity, BackgroundLevel, LearnedPattern } from "../model/types";
import { getVisualDefaults, calcFunctionalAge } from "./diagnosisProfile";

const STORAGE_KEY = "imagegen_child_agents";

// ═══════════════════════════════════════════════════════
//  학습 임계값 (Evidence-based thresholds)
// ═══════════════════════════════════════════════════════

const THRESHOLDS = {
  // ── 탐색/활용 전환 (MAB 기반) ──
  EXPLORE_PHASE: 5,       // 0-5회: 탐색 중심 (질문 많이)
  TRANSITION_PHASE: 15,   // 5-15회: 점진 전환
  EXPLOIT_PHASE: 15,      // 15회+: 활용 중심 (질문 거의 없음)

  // ── 스타일 변경 (Thompson Sampling: 높은 신뢰 필요) ──
  STYLE_CHANGE: 5,        // 같은 스타일 오버라이드 5회 이상 → 기본값 변경

  // ── 복잡도 변경 (Spotify implicit: 중간 신뢰) ──
  COMPLEXITY_DOWN: 3,     // "단순하게" 수정 3회 연속 → 1단계 하향
  COMPLEXITY_UP: 5,       // 좋아요 5회 연속 (현재 복잡도에서) → 1단계 상향 시도

  // ── 테마 학습 (Loss aversion: 부정 경험 빠른 반영) ──
  THEME_LIKE: 2,          // 좋아요 2회 → effectiveThemes 추가
  THEME_DISLIKE: 1,       // 싫어요 1회 → avoidThemes 즉시 추가

  // ── 배경 변경 (MAB exploitation) ──
  BACKGROUND_CHANGE: 3,   // 같은 배경 오버라이드 3회 → 변경

  // ── 확정 기준 (Netflix warm-up) ──
  CONFIRMED_MIN_GEN: 15,  // 최소 15회 생성
  CONFIRMED_MAX_MODIFY_RATE: 0.2, // 수정률 20% 미만이면 "확정"

  // ── 피드백 가중치 (Spotify explicit+implicit) ──
  WEIGHT_LIKE: 1.0,
  WEIGHT_DISLIKE: -0.5,
  WEIGHT_MODIFY_THEN_LIKE: 1.5, // 수정 후 좋아요 = 가장 강한 신호
  WEIGHT_DOWNLOAD: 0.5,         // 다운로드 = implicit 긍정
  WEIGHT_IMMEDIATE_MODIFY: -0.3, // 바로 수정 요청 = implicit 부정
};

// ═══════════════════════════════════════════════════════
//  CRUD
// ═══════════════════════════════════════════════════════

function loadAgents(): ChildVisualAgent[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAgents(agents: ChildVisualAgent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  } catch { /* quota */ }
}

export function getChildAgent(childId: string): ChildVisualAgent | null {
  return loadAgents().find((a) => a.childId === childId) ?? null;
}

export function createChildAgent(
  childId: string,
  userId: string,
  diagnosis: string | null,
  birthYear: string | null,
): ChildVisualAgent {
  const defaults = getVisualDefaults(diagnosis);
  const chronoYears = birthYear ? new Date().getFullYear() - parseInt(birthYear) : 6;
  const functionalAgeMonths = calcFunctionalAge(chronoYears, diagnosis);

  const agent: ChildVisualAgent = {
    id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    childId,
    userId,
    diagnosis,
    functionalAgeMonths,
    baseStyle: defaults.style,
    preferredStyle: defaults.style,
    colorSensitivity: defaults.colorSensitivity,
    backgroundLevel: defaults.backgroundLevel,
    optimalComplexity: defaults.complexity,
    effectiveThemes: [],
    avoidThemes: [],
    learnedPatterns: [],
    generationCount: 0,
    likedCount: 0,
    dislikedCount: 0,
    modifiedCount: 0,
    regenerateCount: 0,
    lastGeneratedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.childId === childId);
  if (idx >= 0) agents[idx] = agent;
  else agents.push(agent);
  saveAgents(agents);
  return agent;
}

export function getOrCreateAgent(
  childId: string,
  userId: string,
  diagnosis: string | null,
  birthYear: string | null,
): ChildVisualAgent {
  return getChildAgent(childId) ?? createChildAgent(childId, userId, diagnosis, birthYear);
}

// ═══════════════════════════════════════════════════════
//  Agent 성숙도 판단 (MAB 탐색/활용 비율)
// ═══════════════════════════════════════════════════════

export type AgentMaturity = "exploring" | "transitioning" | "confident";

export function getMaturity(agent: ChildVisualAgent): AgentMaturity {
  const gen = agent.generationCount;
  if (gen < THRESHOLDS.EXPLORE_PHASE) return "exploring";
  if (gen < THRESHOLDS.TRANSITION_PHASE) return "transitioning";

  // 15회+ 이지만 수정률이 높으면 아직 전환 단계
  const modifyRate = gen > 0 ? (agent.modifiedCount + agent.regenerateCount) / gen : 0;
  if (modifyRate > THRESHOLDS.CONFIRMED_MAX_MODIFY_RATE) return "transitioning";

  return "confident";
}

// ═══════════════════════════════════════════════════════
//  Explicit 피드백 학습
// ═══════════════════════════════════════════════════════

/** 좋아요 — explicit 긍정 신호 */
export function recordLike(childId: string, theme?: string): void {
  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.childId === childId);
  if (idx < 0) return;
  const a = agents[idx];

  a.likedCount += 1;
  a.updatedAt = new Date().toISOString();

  // 테마 학습: 좋아요 횟수 누적 → THEME_LIKE 도달 시 effective에 추가
  if (theme) {
    const likeCountForTheme = (a.learnedPatterns ?? [])
      .filter((p) => p.wasAccepted && p.originalPrompt.includes(theme)).length + 1;

    if (likeCountForTheme >= THRESHOLDS.THEME_LIKE && !a.effectiveThemes.includes(theme)) {
      a.effectiveThemes = [...a.effectiveThemes, theme].slice(-10);
    }
    // avoidThemes에서 복구
    a.avoidThemes = a.avoidThemes.filter((t) => t !== theme);
  }

  saveAgents(agents);
}

/** 싫어요 — explicit 부정 신호 (loss aversion: 1회면 즉시 반영) */
export function recordDislike(childId: string, theme?: string): void {
  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.childId === childId);
  if (idx < 0) return;
  const a = agents[idx];

  a.dislikedCount += 1;
  a.updatedAt = new Date().toISOString();

  // 테마 회피: 1회 싫어요로 즉시 추가 (부정 경험 빠른 반영)
  if (theme && !a.avoidThemes.includes(theme)) {
    a.avoidThemes = [...a.avoidThemes, theme].slice(-10);
    a.effectiveThemes = a.effectiveThemes.filter((t) => t !== theme);
  }

  saveAgents(agents);
}

/** 다운로드 — implicit 긍정 신호 (실제 사용 의도) */
export function recordDownload(childId: string): void {
  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.childId === childId);
  if (idx < 0) return;

  // 다운로드 = 현재 설정에 만족한다는 implicit 신호
  // 별도 카운터 없이 likedCount에 가중치 0.5로 반영
  agents[idx].likedCount += 0.5;
  agents[idx].updatedAt = new Date().toISOString();
  saveAgents(agents);
}

// ═══════════════════════════════════════════════════════
//  재생성 학습 (가장 강한 학습 신호)
// ═══════════════════════════════════════════════════════

/**
 * 재생성 기록 — "수정할래요 → 수정 프롬프트 → 재생성" 과정 전체를 학습
 *
 * Thompson Sampling 원리: 데이터가 쌓일수록 신뢰구간이 좁아지고,
 * 임계값 도달 시 agent 기본값이 변경됨
 */
export function recordRegeneration(
  childId: string,
  originalPrompt: string,
  correction: string,
  changedParams: LearnedPattern["changedParams"],
): void {
  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.childId === childId);
  if (idx < 0) return;
  const a = agents[idx];

  a.regenerateCount += 1;

  // 패턴 저장
  const pattern: LearnedPattern = {
    originalPrompt,
    correction,
    changedParams,
    wasAccepted: false,
    createdAt: new Date().toISOString(),
  };
  a.learnedPatterns = [...(a.learnedPatterns ?? []), pattern].slice(-30);

  // ── 신뢰도 기반 기본값 업데이트 ──
  const recent = (a.learnedPatterns ?? []).slice(-15);

  // 스타일: 5회 이상 같은 오버라이드 → 기본값 변경 (Thompson: 높은 신뢰)
  const styleOverrides = recent.filter((p) => p.changedParams.style).map((p) => p.changedParams.style!);
  const topStyle = mostFrequent(styleOverrides);
  if (topStyle && countOf(styleOverrides, topStyle) >= THRESHOLDS.STYLE_CHANGE) {
    a.preferredStyle = topStyle as VisualStyle;
  }

  // 복잡도: "단순하게" 3회 연속 → 1단계 하향 (Spotify implicit)
  const simplifyCount = recent.filter((p) =>
    p.changedParams.additionalInstruction &&
    /단순|심플|간단|줄여|적게|simple|less/i.test(p.changedParams.additionalInstruction),
  ).length;
  if (simplifyCount >= THRESHOLDS.COMPLEXITY_DOWN) {
    a.optimalComplexity = Math.max(1, a.optimalComplexity - 1);
  }

  // 복잡도 상향: "더 자세하게" 3회 연속
  const detailCount = recent.filter((p) =>
    p.changedParams.additionalInstruction &&
    /자세|디테일|복잡|더\s*많이|추가|detail|more/i.test(p.changedParams.additionalInstruction),
  ).length;
  if (detailCount >= THRESHOLDS.COMPLEXITY_DOWN) {
    a.optimalComplexity = Math.min(5, a.optimalComplexity + 1);
  }

  // 배경: 3회 이상 같은 배경 요청 → 변경 (MAB exploitation)
  const bgOverrides = recent.filter((p) => p.changedParams.background).map((p) => p.changedParams.background!);
  const topBg = mostFrequent(bgOverrides);
  if (topBg && countOf(bgOverrides, topBg) >= THRESHOLDS.BACKGROUND_CHANGE) {
    a.backgroundLevel = topBg as BackgroundLevel;
  }

  a.updatedAt = new Date().toISOString();
  saveAgents(agents);
}

/** 재생성 → 좋아요 = 가장 강한 학습 신호 (Spotify: modify_then_like) */
export function confirmRegenerationSuccess(childId: string): void {
  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.childId === childId);
  if (idx < 0) return;

  const patterns = agents[idx].learnedPatterns ?? [];
  if (patterns.length > 0) {
    patterns[patterns.length - 1].wasAccepted = true;
  }
  agents[idx].learnedPatterns = patterns;
  agents[idx].updatedAt = new Date().toISOString();
  saveAgents(agents);
}

// ═══════════════════════════════════════════════════════
//  생성 카운트
// ═══════════════════════════════════════════════════════

export function incrementGeneration(childId: string): void {
  const agents = loadAgents();
  const idx = agents.findIndex((a) => a.childId === childId);
  if (idx < 0) return;

  agents[idx].generationCount += 1;
  agents[idx].lastGeneratedAt = new Date().toISOString();
  agents[idx].updatedAt = new Date().toISOString();
  saveAgents(agents);
}

// ═══════════════════════════════════════════════════════
//  Agent 상태 요약 (UI 표시용)
// ═══════════════════════════════════════════════════════

export interface AgentSummary {
  maturity: AgentMaturity;
  maturityLabel: string;
  confidencePercent: number;        // 0-100
  modifyRate: number;               // 수정률 0-1
  topThemes: string[];
  recentLearnings: string[];        // 최근 학습한 것 (자연어)
}

export function getAgentSummary(agent: ChildVisualAgent): AgentSummary {
  const maturity = getMaturity(agent);
  const gen = agent.generationCount;
  const modifyRate = gen > 0 ? (agent.modifiedCount + agent.regenerateCount) / gen : 0;

  // 신뢰도: 생성 수 + 낮은 수정률 → 높은 신뢰
  const genScore = Math.min(gen / THRESHOLDS.EXPLOIT_PHASE, 1); // 0-1
  const modScore = 1 - Math.min(modifyRate / 0.5, 1);           // 수정률 낮을수록 높음
  const confidencePercent = Math.round(genScore * 0.6 + modScore * 0.4) * 100;

  const maturityLabels: Record<AgentMaturity, string> = {
    exploring: "학습 중",
    transitioning: "적응 중",
    confident: "맞춤 완료",
  };

  // 최근 학습 내용 요약
  const recentLearnings: string[] = [];
  const accepted = (agent.learnedPatterns ?? []).filter((p) => p.wasAccepted).slice(-3);
  for (const p of accepted) {
    if (p.changedParams.style) recentLearnings.push(`스타일을 ${p.changedParams.style}로 조정`);
    if (p.changedParams.background) recentLearnings.push(`배경을 ${p.changedParams.background}로 변경`);
    if (p.changedParams.additionalInstruction) recentLearnings.push(`"${p.changedParams.additionalInstruction}" 반영`);
  }

  return {
    maturity,
    maturityLabel: maturityLabels[maturity],
    confidencePercent,
    modifyRate,
    topThemes: agent.effectiveThemes.slice(0, 3),
    recentLearnings: recentLearnings.slice(0, 3),
  };
}

// ═══════════════════════════════════════════════════════
//  유틸
// ═══════════════════════════════════════════════════════

function mostFrequent(arr: string[]): string | null {
  const counts: Record<string, number> = {};
  for (const v of arr) counts[v] = (counts[v] ?? 0) + 1;
  let max = 0;
  let result: string | null = null;
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) { max = v; result = k; }
  }
  return result;
}

function countOf(arr: string[], value: string): number {
  return arr.filter((v) => v === value).length;
}
