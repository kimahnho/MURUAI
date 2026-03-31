/**
 * 세션 적용 — A아동의 학습지 세트를 B아동의 프로필에 맞게 변환.
 * 활동 유형/도메인/세션 구조는 유지하고, 난이도/항목수/스타일/테마를 조정.
 * Main 3 adaptSessionForStudent() + buildAdaptSummaryMessage() 포팅.
 */
import type {
  WorksheetSuggestion,
  SessionSet,
  TherapyStudentProfile,
  DifficultyLevel,
} from "../model/therapyTypes";
import { extractDiagnosis } from "./livingAgent";
import { enforceGuardrails } from "./guardrails";

/**
 * A아동의 세션 세트를 B아동의 프로필에 맞게 변환한다.
 */
export function adaptSessionForStudent(
  sourceSet: SessionSet,
  targetStudent: TherapyStudentProfile,
): SessionSet {
  const diagnosis = targetStudent.diagnosis?.primary
    ? targetStudent.diagnosis
    : extractDiagnosis(targetStudent.diagnosis?.rawText ?? "");

  const autoLearned = targetStudent.autoLearned;

  // B아동의 최적 난이도
  const optimalDiff: DifficultyLevel = (autoLearned?.effectiveDifficulty as DifficultyLevel) ?? "easy";
  const difficultyItemMap: Record<DifficultyLevel, number> = { easy: 3, medium: 5, hard: 7 };

  const adaptedSheets: WorksheetSuggestion[] = (sourceSet.sheets ?? []).map((sheet, i) => {
    // 역할별 난이도 보정 (첫 장은 easy, 마지막은 한 단계 올림)
    let sheetDiff = optimalDiff;
    if (i === 0) sheetDiff = "easy";
    else if (i >= 3 && optimalDiff !== "hard") {
      sheetDiff = optimalDiff === "easy" ? "medium" : "hard";
    }

    const adapted: WorksheetSuggestion = {
      ...sheet,
      difficulty: sheetDiff,
      itemCount: difficultyItemMap[sheetDiff],
    };

    // 가드레일 재적용
    const ageYears = targetStudent.functionalAge
      ? Math.floor(targetStudent.functionalAge / 12)
      : undefined;

    const { corrected } = enforceGuardrails({
      result: {
        domain: adapted.domain,
        difficulty: adapted.difficulty,
        itemCount: adapted.itemCount,
        worksheetType: adapted.worksheetType,
      },
      prompt: "",
      diagnosis,
      age: ageYears,
    });

    return {
      ...adapted,
      difficulty: (corrected.difficulty as DifficultyLevel) ?? adapted.difficulty,
      itemCount: corrected.itemCount ?? adapted.itemCount,
    };
  });

  return {
    ...sourceSet,
    id: `session_${Date.now()}`,
    sheets: adaptedSheets,
  };
}

/** 크로스 적용 변환 요약 메시지 생성 */
export function buildAdaptSummaryMessage(
  sourceStudentName: string,
  targetStudentName: string,
  sourceSheets: WorksheetSuggestion[],
  adaptedSheets: WorksheetSuggestion[],
): string {
  const changes: string[] = [];
  const s0 = sourceSheets[0];
  const a0 = adaptedSheets[0];
  if (s0 && a0) {
    const diffKo: Record<string, string> = { easy: "쉬움", medium: "보통", hard: "어려움" };
    if (s0.difficulty !== a0.difficulty) changes.push(`난이도: ${diffKo[s0.difficulty]} → ${diffKo[a0.difficulty]}`);
    if (s0.itemCount !== a0.itemCount) changes.push(`항목 수: ${s0.itemCount}개 → ${a0.itemCount}개`);
  }

  const changeText = changes.length > 0
    ? changes.map((c) => `• ${c}`).join("\n")
    : "• 변경 없이 그대로 적용";

  return `**${sourceStudentName}**의 학습지를 **${targetStudentName}**에 맞게 조정했어요.\n\n${changeText}`;
}
