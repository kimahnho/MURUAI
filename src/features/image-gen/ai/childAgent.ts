/**
 * 아동별 시각 Agent — Supabase CRUD + 학습
 *
 * 학습 기준 레퍼런스:
 * - Multi-Armed Bandit: 탐색/활용 비율 (ACM, 2022)
 * - Thompson Sampling: 신뢰도 기반 변경 (Stanford Tutorial)
 * - Spotify: explicit + implicit 피드백 결합
 * - Netflix: 빠른 온보딩 + 점진 학습
 * - IJCAI 2019: long-term / short-term 선호 분리
 */
import { supabase } from "@/shared/api/supabase";
import type { ChildVisualAgent, LearnedPattern } from "../model/types";
import { getVisualDefaults, calcFunctionalAge } from "./diagnosisProfile";

// ═══════════════════════════════════════════════════════
//  학습 임계값 (Evidence-based thresholds)
// ═══════════════════════════════════════════════════════

const THRESHOLDS = {
  EXPLORE_PHASE: 5,
  TRANSITION_PHASE: 15,
  EXPLOIT_PHASE: 15,
  STYLE_CHANGE: 5,
  COMPLEXITY_DOWN: 3,
  COMPLEXITY_UP: 5,
  THEME_LIKE: 2,
  THEME_DISLIKE: 1,
  BACKGROUND_CHANGE: 3,
  CONFIRMED_MIN_GEN: 15,
  CONFIRMED_MAX_MODIFY_RATE: 0.2,
  WEIGHT_LIKE: 1.0,
  WEIGHT_DISLIKE: -0.5,
  WEIGHT_MODIFY_THEN_LIKE: 1.5,
  WEIGHT_DOWNLOAD: 0.5,
  WEIGHT_IMMEDIATE_MODIFY: -0.3,
};

// ═══════════════════════════════════════════════════════
//  헬퍼: auth + 매퍼
// ═══════════════════════════════════════════════════════

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("인증이 필요합니다.");
  return user.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToAgent(row: any): ChildVisualAgent {
  return {
    id: row.id,
    childId: row.student_id,
    userId: row.user_id,
    diagnosis: row.diagnosis,
    functionalAgeMonths: row.functional_age_months,
    baseStyle: row.base_style,
    preferredStyle: row.preferred_style,
    colorSensitivity: row.color_sensitivity,
    backgroundLevel: row.background_level,
    optimalComplexity: row.optimal_complexity,
    effectiveThemes: row.effective_themes ?? [],
    avoidThemes: row.avoid_themes ?? [],
    generationCount: row.generation_count,
    likedCount: row.liked_count,
    dislikedCount: row.disliked_count,
    modifiedCount: row.modified_count,
    regenerateCount: row.regenerate_count,
    lastGeneratedAt: row.last_generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToPattern(row: any): LearnedPattern {
  return {
    originalPrompt: row.original_prompt ?? "",
    correction: row.correction ?? "",
    changedParams: row.changed_params ?? {},
    wasAccepted: row.was_accepted ?? false,
    createdAt: row.created_at,
  };
}

// ═══════════════════════════════════════════════════════
//  CRUD
// ═══════════════════════════════════════════════════════

export async function getChildAgent(studentId: string): Promise<ChildVisualAgent | null> {
  const { data, error } = await supabase
    .from("new_image_gen_agents")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return mapRowToAgent(data);
}

export async function createChildAgent(
  studentId: string,
  diagnosis: string | null,
  birthYear: string | null,
): Promise<ChildVisualAgent> {
  const userId = await getUserId();
  const defaults = getVisualDefaults(diagnosis);
  const chronoYears = birthYear ? new Date().getFullYear() - parseInt(birthYear) : 6;
  const functionalAgeMonths = calcFunctionalAge(chronoYears, diagnosis);

  const { data, error } = await supabase
    .from("new_image_gen_agents")
    .upsert({
      user_id: userId,
      student_id: studentId,
      diagnosis,
      functional_age_months: functionalAgeMonths,
      base_style: defaults.style,
      preferred_style: defaults.style,
      color_sensitivity: defaults.colorSensitivity,
      background_level: defaults.backgroundLevel,
      optimal_complexity: defaults.complexity,
      effective_themes: [],
      avoid_themes: [],
      generation_count: 0,
      liked_count: 0,
      disliked_count: 0,
      modified_count: 0,
      regenerate_count: 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: "student_id" })
    .select()
    .single();
  if (error) throw error;
  return mapRowToAgent(data);
}

export async function getOrCreateAgent(
  studentId: string,
  diagnosis: string | null,
  birthYear: string | null,
): Promise<ChildVisualAgent> {
  const existing = await getChildAgent(studentId);
  if (existing) return existing;
  return createChildAgent(studentId, diagnosis, birthYear);
}

// ═══════════════════════════════════════════════════════
//  LearnedPatterns 조회 (별도 테이블)
// ═══════════════════════════════════════════════════════

export async function getLearnedPatterns(agentId: string, limit = 30): Promise<LearnedPattern[]> {
  const { data, error } = await supabase
    .from("new_image_gen_learned_patterns")
    .select("*")
    .eq("agent_id", agentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.warn("학습 패턴 조회 실패", error);
    return [];
  }
  return (data ?? []).map(mapRowToPattern);
}

// ═══════════════════════════════════════════════════════
//  Agent 성숙도 판단 (MAB 탐색/활용 비율)
// ═══════════════════════════════════════════════════════

export type AgentMaturity = "exploring" | "transitioning" | "confident";

export function getMaturity(agent: ChildVisualAgent): AgentMaturity {
  const gen = agent.generationCount;
  if (gen < THRESHOLDS.EXPLORE_PHASE) return "exploring";
  if (gen < THRESHOLDS.TRANSITION_PHASE) return "transitioning";

  const modifyRate = gen > 0 ? (agent.modifiedCount + agent.regenerateCount) / gen : 0;
  if (modifyRate > THRESHOLDS.CONFIRMED_MAX_MODIFY_RATE) return "transitioning";

  return "confident";
}

// ═══════════════════════════════════════════════════════
//  내부 헬퍼: agent 조회 + update
// ═══════════════════════════════════════════════════════

async function getAgentByChildId(childId: string): Promise<ChildVisualAgent | null> {
  return getChildAgent(childId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function updateAgent(agentId: string, patch: Record<string, any>): Promise<void> {
  const { error } = await supabase
    .from("new_image_gen_agents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", agentId);
  if (error) console.warn("Agent 업데이트 실패", error);
}

// ═══════════════════════════════════════════════════════
//  Explicit 피드백 학습
// ═══════════════════════════════════════════════════════

/** 좋아요 — explicit 긍정 신호 */
export async function recordLike(childId: string, theme?: string): Promise<void> {
  const agent = await getAgentByChildId(childId);
  if (!agent) return;

  let effectiveThemes = [...agent.effectiveThemes];
  let avoidThemes = [...agent.avoidThemes];

  if (theme) {
    // 테마 카운팅: learned_patterns에서 조회
    const patterns = await getLearnedPatterns(agent.id);
    const likeCountForTheme = patterns
      .filter((p) => p.wasAccepted && p.originalPrompt.includes(theme)).length + 1;

    if (likeCountForTheme >= THRESHOLDS.THEME_LIKE && !effectiveThemes.includes(theme)) {
      effectiveThemes = [...effectiveThemes, theme].slice(-10);
    }
    avoidThemes = avoidThemes.filter((t) => t !== theme);
  }

  await updateAgent(agent.id, {
    liked_count: agent.likedCount + 1,
    effective_themes: effectiveThemes,
    avoid_themes: avoidThemes,
  });
}

/** 싫어요 — explicit 부정 신호 (loss aversion: 1회면 즉시 반영) */
export async function recordDislike(childId: string, theme?: string): Promise<void> {
  const agent = await getAgentByChildId(childId);
  if (!agent) return;

  let avoidThemes = [...agent.avoidThemes];
  let effectiveThemes = [...agent.effectiveThemes];

  if (theme && !avoidThemes.includes(theme)) {
    avoidThemes = [...avoidThemes, theme].slice(-10);
    effectiveThemes = effectiveThemes.filter((t) => t !== theme);
  }

  await updateAgent(agent.id, {
    disliked_count: agent.dislikedCount + 1,
    avoid_themes: avoidThemes,
    effective_themes: effectiveThemes,
  });
}

/** 다운로드 — implicit 긍정 신호 (실제 사용 의도) */
export async function recordDownload(childId: string): Promise<void> {
  const agent = await getAgentByChildId(childId);
  if (!agent) return;

  await updateAgent(agent.id, {
    liked_count: agent.likedCount + 0.5,
  });
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
export async function recordRegeneration(
  childId: string,
  originalPrompt: string,
  correction: string,
  changedParams: LearnedPattern["changedParams"],
): Promise<void> {
  const agent = await getAgentByChildId(childId);
  if (!agent) return;

  const userId = await getUserId();

  // 1. learned_patterns 테이블에 INSERT
  const { error: patternError } = await supabase
    .from("new_image_gen_learned_patterns")
    .insert({
      agent_id: agent.id,
      user_id: userId,
      original_prompt: originalPrompt,
      correction,
      changed_params: changedParams,
      was_accepted: false,
    });
  if (patternError) console.warn("학습 패턴 저장 실패", patternError);

  // 2. 최근 15개 패턴 조회 (Thompson Sampling)
  const recent = await getLearnedPatterns(agent.id, 15);

  // 3. 신뢰도 기반 기본값 업데이트
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patch: Record<string, any> = {
    regenerate_count: agent.regenerateCount + 1,
  };

  // 스타일: 5회 이상 같은 오버라이드 → 기본값 변경
  const styleOverrides = recent.filter((p) => p.changedParams.style).map((p) => p.changedParams.style!);
  const topStyle = mostFrequent(styleOverrides);
  if (topStyle && countOf(styleOverrides, topStyle) >= THRESHOLDS.STYLE_CHANGE) {
    patch.preferred_style = topStyle;
  }

  // 복잡도: "단순하게" 3회 연속 → 1단계 하향
  const simplifyCount = recent.filter((p) =>
    p.changedParams.additionalInstruction &&
    /단순|심플|간단|줄여|적게|simple|less/i.test(p.changedParams.additionalInstruction),
  ).length;
  if (simplifyCount >= THRESHOLDS.COMPLEXITY_DOWN) {
    patch.optimal_complexity = Math.max(1, agent.optimalComplexity - 1);
  }

  // 복잡도 상향: "더 자세하게" 3회 연속
  const detailCount = recent.filter((p) =>
    p.changedParams.additionalInstruction &&
    /자세|디테일|복잡|더\s*많이|추가|detail|more/i.test(p.changedParams.additionalInstruction),
  ).length;
  if (detailCount >= THRESHOLDS.COMPLEXITY_DOWN) {
    patch.optimal_complexity = Math.min(5, agent.optimalComplexity + 1);
  }

  // 배경: 3회 이상 같은 배경 요청 → 변경
  const bgOverrides = recent.filter((p) => p.changedParams.background).map((p) => p.changedParams.background!);
  const topBg = mostFrequent(bgOverrides);
  if (topBg && countOf(bgOverrides, topBg) >= THRESHOLDS.BACKGROUND_CHANGE) {
    patch.background_level = topBg;
  }

  await updateAgent(agent.id, patch);
}

/** 재생성 → 좋아요 = 가장 강한 학습 신호 */
export async function confirmRegenerationSuccess(childId: string): Promise<void> {
  const agent = await getAgentByChildId(childId);
  if (!agent) return;

  // 최신 패턴 1개 조회
  const { data, error } = await supabase
    .from("new_image_gen_learned_patterns")
    .select("id")
    .eq("agent_id", agent.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return;

  await supabase
    .from("new_image_gen_learned_patterns")
    .update({ was_accepted: true })
    .eq("id", data.id);
}

// ═══════════════════════════════════════════════════════
//  생성 카운트
// ═══════════════════════════════════════════════════════

export async function incrementGeneration(childId: string): Promise<void> {
  const agent = await getAgentByChildId(childId);
  if (!agent) return;

  await updateAgent(agent.id, {
    generation_count: agent.generationCount + 1,
    last_generated_at: new Date().toISOString(),
  });
}

// ═══════════════════════════════════════════════════════
//  Agent 상태 요약 (UI 표시용)
// ═══════════════════════════════════════════════════════

export interface AgentSummary {
  maturity: AgentMaturity;
  maturityLabel: string;
  confidencePercent: number;
  modifyRate: number;
  topThemes: string[];
  recentLearnings: string[];
}

/**
 * Agent 상태 요약 — 순수 계산 (DB 접근 없음)
 * patterns는 외부에서 미리 조회하여 전달
 */
export function getAgentSummary(agent: ChildVisualAgent, patterns: LearnedPattern[]): AgentSummary {
  const maturity = getMaturity(agent);
  const gen = agent.generationCount;
  const modifyRate = gen > 0 ? (agent.modifiedCount + agent.regenerateCount) / gen : 0;

  const genScore = Math.min(gen / THRESHOLDS.EXPLOIT_PHASE, 1);
  const modScore = 1 - Math.min(modifyRate / 0.5, 1);
  const confidencePercent = Math.round(genScore * 0.6 + modScore * 0.4) * 100;

  const maturityLabels: Record<AgentMaturity, string> = {
    exploring: "학습 중",
    transitioning: "적응 중",
    confident: "맞춤 완료",
  };

  const recentLearnings: string[] = [];
  const accepted = patterns.filter((p) => p.wasAccepted).slice(0, 3);
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
