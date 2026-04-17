/**
 * 2단계 재구성된 위자드의 스텝별 유효성 검사.
 *
 * Step 1 (설정): 나이 + 주제 + 그림체(+커스텀) 필수
 * Step 2 (주인공 확인): 기획서(편집본) + 주인공 레퍼런스 이미지 필수
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
  if (!info) return "나이를 입력해 주세요.";
  if (info.age < 1 || info.age > 19) return "나이는 1~19세 범위로 입력해 주세요.";
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
  if (!proposal) return "기획서가 아직 준비되지 않았어요.";
  const emptyPage = proposal.pages.find((p) => !p.textContent.trim());
  if (emptyPage)
    return `${emptyPage.pageNumber}페이지의 텍스트가 비어 있어요.`;
  return null;
};

export const validateArtStyle = (
  style: ArtStyleId | null,
  customPromptTemplate?: string,
): string | null => {
  if (!style) return "그림체를 선택해 주세요.";
  if (style === "custom" && (!customPromptTemplate || !customPromptTemplate.trim())) {
    return "커스텀 그림체 프롬프트를 입력해 주세요.";
  }
  return null;
};

/** Step 1 (설정) — 나이 + 주제 + 그림체 전부 유효해야 진행 가능 */
const canAdvanceStep1 = (formData: WizardFormData): boolean => {
  if (validateChildInfo(formData.childInfo) !== null) return false;
  if (validateTopic(formData.topic) !== null) return false;
  if (validateArtStyle(formData.artStyle, formData.customPromptTemplate) !== null) return false;
  return true;
};

/** Step 2 (주인공 확인) — 주인공 이미지 + 편집된 기획서 필요 */
const canAdvanceStep2 = (formData: WizardFormData): boolean => {
  if (!formData.referenceImageBase64) return false;
  const proposal = formData.editedProposal ?? findSelectedProposal(formData);
  return validateProposal(proposal) === null;
};

/** 현재 단계에서 다음으로 진행 가능한지 검사 */
export const canAdvance = (
  step: WizardStep,
  formData: WizardFormData,
): boolean => {
  switch (step) {
    case 1:
      return canAdvanceStep1(formData);
    case 2:
      return canAdvanceStep2(formData);
    case 5:
      return false; // 생성 중 — 자동 전환
    case 6:
      return false; // 마지막 단계
    default:
      return false;
  }
};

const findSelectedProposal = (
  formData: WizardFormData,
): StoryProposal | null => {
  if (!formData.selectedProposalId) return null;
  return (
    formData.proposals.find((p) => p.id === formData.selectedProposalId) ?? null
  );
};
