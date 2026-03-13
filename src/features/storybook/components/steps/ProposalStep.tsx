/**
 * 3단계: 기획서 선택 — 2개 후보 카드 + 직접 수정 토글.
 */
import { useState } from "react";
import { Check, Pencil } from "lucide-react";

import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";

const ProposalStep = () => {
  const proposals = useStorybookWizardStore((s) => s.formData.proposals);
  const selectedId = useStorybookWizardStore(
    (s) => s.formData.selectedProposalId,
  );
  const editedProposal = useStorybookWizardStore(
    (s) => s.formData.editedProposal,
  );
  const selectProposal = useStorybookWizardStore((s) => s.selectProposal);
  const updateProposalPage = useStorybookWizardStore(
    (s) => s.updateProposalPage,
  );

  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {/* 기획서 카드 */}
      <div className="flex flex-col gap-3">
        {proposals.map((proposal) => {
          const isSelected = selectedId === proposal.id;
          return (
            <button
              key={proposal.id}
              type="button"
              onClick={() => { selectProposal(proposal.id); }}
              className={`relative flex flex-col gap-1 rounded-lg border p-3 text-left transition ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-black-25 hover:bg-black-5"
              }`}
            >
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <span className="text-14-semibold text-black-90">
                {proposal.title}
              </span>
              <span className="text-13-regular text-black-60">
                {proposal.summary}
              </span>
            </button>
          );
        })}
      </div>

      {/* 직접 수정 토글 */}
      {selectedId && (
        <button
          type="button"
          onClick={() => { setIsEditing((v) => !v); }}
          className="flex items-center gap-1.5 self-start text-13-medium text-primary hover:underline"
        >
          <Pencil className="h-3.5 w-3.5" />
          {isEditing ? "수정 닫기" : "직접 수정하기"}
        </button>
      )}

      {/* 인라인 편집 */}
      {isEditing && editedProposal && (
        <div className="flex flex-col gap-2 rounded-lg border border-black-15 bg-black-5 p-3">
          {editedProposal.pages.map((page) => (
            <div key={page.pageNumber} className="flex flex-col gap-0.5">
              <span className="text-12-medium text-black-50">
                {page.pageNumber}페이지
              </span>
              <textarea
                value={page.textContent}
                onChange={(e) => {
                  updateProposalPage(
                    editedProposal.id,
                    page.pageNumber,
                    e.target.value,
                  );
                }}
                rows={2}
                className="w-full resize-none rounded border border-black-20 px-2 py-1.5 text-13-regular focus:border-primary focus:outline-none"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProposalStep;
