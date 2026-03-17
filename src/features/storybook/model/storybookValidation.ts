/**
 * 위자드 단계별 유효성 검사 함수.
 */
import type {
  ChildInfo,
  StoryProposal,
  WizardFormData,
  WizardStep,
  ArtStyleId,
} from "./storybookTypes";
import { TOPIC_MIN_LENGTH, TOPIC_MAX_LENGTH } from "./storybookTypes";

export const validateChildInfo = (info: ChildInfo | null): string | null => {
  if (!info) return "아동 정보를 입력해 주세요.";
  if (!info.name.trim()) return "이름을 입력해 주세요.";
  if (info.age < 1 || info.age > 19) return "나이는 1~19세 범위로 입력해 주세요.";
  if (info.gender !== "male" && info.gender !== "female")
    return "성별을 선택해 주세요.";
  return null;
};

export const validateTopic = (topic: string): string | null => {
  const trimmed = topic.trim();
  if (trimmed.length < TOPIC_MIN_LENGTH)
    return `주제를 ${TOPIC_MIN_LENGTH}자 이상 입력해 주세요.`;
  if (trimmed.length > TOPIC_MAX_LENGTH)
    return `주제는 ${TOPIC_MAX_LENGTH}자 이내로 입력해 주세요.`;
  return null;
};

export const validateProposal = (
  proposal: StoryProposal | null,
): string | null => {
  if (!proposal) return "기획서를 선택해 주세요.";
  const emptyPage = proposal.pages.find((p) => !p.textContent.trim());
  if (emptyPage)
    return `${emptyPage.pageNumber}페이지의 텍스트가 비어 있어요.`;
  return null;
};

export const validateArtStyle = (style: ArtStyleId | null): string | null => {
  if (!style) return "그림체를 선택해 주세요.";
  return null;
};

/** 현재 단계에서 다음으로 진행 가능한지 검사 */
export const canAdvance = (
  step: WizardStep,
  formData: WizardFormData,
): boolean => {
  switch (step) {
    case 1:
      return validateChildInfo(formData.childInfo) === null;
    case 2:
      return validateTopic(formData.topic) === null;
    case 3: {
      const activeProposal = formData.editedProposal ?? findSelectedProposal(formData);
      return validateProposal(activeProposal) === null;
    }
    case 4:
      return validateArtStyle(formData.artStyle) === null;
    case 45:
      return true; // 기본 캐릭터 이미지가 자동 설정되므로 항상 통과
    case 5:
      return false; // 생성 중 — 자동 전환
    case 6:
      return false; // 마지막 단계
    default:
      return false;
  }
};

/** formData에서 선택된 기획서를 찾는 헬퍼 */
const findSelectedProposal = (
  formData: WizardFormData,
): StoryProposal | null => {
  if (!formData.selectedProposalId) return null;
  return (
    formData.proposals.find((p) => p.id === formData.selectedProposalId) ?? null
  );
};
