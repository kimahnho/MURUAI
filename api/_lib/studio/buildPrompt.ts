/**
 * 서버 전용 — 치료 AI 시스템 프롬프트 빌더.
 * 도메인 레퍼런스 파일을 fs로 읽어 Gemini 시스템 프롬프트에 주입한다.
 * 클라이언트 번들에 포함되지 않는다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const REFS_DIR = join(__dirname, "refs");

// 레퍼런스 파일 캐시 (cold start 이후 재사용)
const refCache = new Map<string, string>();

function loadRef(filename: string): string {
  const cached = refCache.get(filename);
  if (cached) return cached;
  try {
    const content = readFileSync(join(REFS_DIR, filename), "utf-8");
    refCache.set(filename, content);
    return content;
  } catch {
    console.warn(`[studio/buildPrompt] Failed to load ref: ${filename}`);
    return "";
  }
}

// ── 위기 키워드 안전 검사 (서버 측) ──

const CRISIS_KEYWORDS = [
  "자해", "머리박기", "자살", "학대", "피", "죽고싶",
  "때리", "물어뜯", "할퀴", "목졸",
];

interface SafetyResult {
  isSafe: boolean;
  crisisDetected: boolean;
  message?: string;
}

export function checkSafety(userMessage: string): SafetyResult {
  const lower = userMessage.toLowerCase();
  for (const keyword of CRISIS_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        isSafe: false,
        crisisDetected: true,
        message: `위기 키워드가 감지되었습니다. 즉시 전문 기관에 연락하세요.\n- 자살예방상담전화: 1393\n- 정신건강위기상담전화: 1577-0199\n- 학교폭력신고: 117\n- 아동학대신고: 112`,
      };
    }
  }
  return { isSafe: true, crisisDetected: false };
}

// ── 도메인 → 레퍼런스 매핑 ──

const DOMAIN_REF_MAP: Record<string, string> = {
  emotion: "emotion.md",
  language: "language.md",
  cognition: "cognition.md",
  motor: "motor.md",
  social: "social.md",
  play: "play.md",
};

// 도메인 간 보조 레퍼런스 (lightweight 모드에서는 스킵)
const SECONDARY_DOMAIN_MAP: Record<string, string[]> = {
  emotion: ["social.md"],
  social: ["emotion.md"],
  language: ["cognition.md"],
  cognition: ["language.md"],
  motor: [],
  play: ["social.md"],
};

interface BuildPromptOptions {
  domain?: string;
  lightweight?: boolean;
  autoLearnedContext?: string;
  studentDiagnosis?: string;
}

/**
 * 치료 AI용 시스템 프롬프트를 조립한다.
 * - SKILL.md: 5단계 추론 루프 + 안전 프로토콜
 * - 도메인 레퍼런스: 감지된 도메인의 임상 지식
 * - image-prompt.md: 이미지 생성 스타일 가이드 (lightweight가 아닐 때만)
 */
export function buildServerSystemPrompt(options: BuildPromptOptions): string {
  const { domain, lightweight = false, autoLearnedContext, studentDiagnosis } = options;

  const parts: string[] = [];

  // 핵심: SKILL.md (항상 포함)
  const skill = loadRef("SKILL.md");
  if (skill) parts.push(skill);

  // 도메인별 1차 레퍼런스
  if (domain && DOMAIN_REF_MAP[domain]) {
    const primary = loadRef(DOMAIN_REF_MAP[domain]);
    if (primary) parts.push(primary);
  }

  // 보조 레퍼런스 (lightweight 모드에서는 스킵)
  if (!lightweight && domain && SECONDARY_DOMAIN_MAP[domain]) {
    for (const ref of SECONDARY_DOMAIN_MAP[domain]) {
      const secondary = loadRef(ref);
      if (secondary) parts.push(secondary);
    }
  }

  // 이미지 프롬프트 가이드 (lightweight 모드에서는 스킵)
  if (!lightweight) {
    const imagePrompt = loadRef("image-prompt.md");
    if (imagePrompt) parts.push(imagePrompt);
  }

  // 학생 진단 정보 (익명화된 형태)
  if (studentDiagnosis) {
    parts.push(`\n[현재 학생 진단 정보]\n${studentDiagnosis}`);
  }

  // 자동 학습 컨텍스트
  if (autoLearnedContext) {
    parts.push(`\n[자동 학습된 학생 특성]\n${autoLearnedContext}`);
  }

  // 응답 형식 규칙 (항상 마지막에 추가)
  parts.push(`## 응답 형식 규칙
항상 JSON 객체로 응답하세요: {"intent": "generate|modify|chat", "reply": "메시지", "sheets": [...]}
- intent "generate": 새 학습지 생성. sheets에 5장 필수.
- intent "modify": 기존 학습지 수정. sheets에 수정 포함 전체 5장 필수. sheets 없이 reply만 보내면 안 됩니다.
- intent "chat": 일반 대화. sheets 없음.`);

  return parts.join("\n\n---\n\n");
}
