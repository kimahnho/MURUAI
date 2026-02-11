import { useState } from "react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";
import { groupModel } from "../model/group.model";
import { useStudentStore } from "../store/useStudentStore";

const AddGroupModalContent = ({ onClose }: { onClose: () => void }) => {
  const { students: availableMembers, refreshGroups } = useStudentStore();
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setGroupName("");
    setDescription("");
    setSelectedMembers([]);
    setLoading(false);
    setError(null);
  };

  const hasMembers = availableMembers.length > 0;

  const calculateAge = (birthYear: string) => {
    const currentYear = new Date().getFullYear();
    return currentYear - parseInt(birthYear, 10);
  };

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : prev.length < 5
        ? [...prev, memberId]
        : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: createError } = await groupModel.create({
      name: groupName.trim(),
      description: description.trim() || undefined,
      memberIds: selectedMembers,
    });

    setLoading(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    if (data) {
      // Store 업데이트
      await refreshGroups();
      handleReset();
      onClose();
    }
  };

  const isSubmitDisabled =
    loading || !groupName.trim() || selectedMembers.length === 0;

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      onReset={handleReset}
      title="그룹 추가하기"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-14-regular text-red-600">
            {error}
          </div>
        )}

        {/* 그룹 이름 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="groupName"
            className="text-title-14-semibold text-black-100"
          >
            그룹 이름
          </label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => { setGroupName(e.target.value); }}
            className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
            placeholder="그룹 이름을 입력하세요"
            required
          />
        </div>

        {/* 설명 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="description"
            className="text-title-14-semibold text-black-100"
          >
            설명 (선택)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
            className="min-h-24 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none resize-none"
            placeholder="그룹 설명을 입력하세요"
          />
        </div>

        {/* 멤버 선택 */}
        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            멤버 선택 (최대 5명)
          </label>
          {hasMembers ? (
            <>
              <div className="flex flex-col gap-2">
                {availableMembers.map((member) => {
                  const memberId = member.id;
                  if (!memberId) return null;
                  const isSelected = selectedMembers.includes(memberId);

                  return (
                    <label
                      key={memberId}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-black-30 hover:bg-black-5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => { handleMemberToggle(memberId); }}
                        className="h-5 w-5 rounded border-black-30 text-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <div className="flex-1 text-15-medium text-black-100">
                        {member.name} | 만 {calculateAge(member.birth_year)}세 (
                        {member.birth_year}년생)
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="text-12-regular text-black-60">
                {selectedMembers.length}/5명 선택됨
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-black-30 bg-black-5 px-4 py-3 text-15-regular text-black-70">
              먼저 아동을 추가해주세요.
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-title-14-semibold text-black-70 transition hover:bg-black-10"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={`flex-1 rounded-lg px-4 py-3 text-title-14-semibold text-white-100 transition ${
              isSubmitDisabled
                ? "bg-black-40 cursor-not-allowed"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading ? "추가 중..." : "추가하기"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};

const AddGroupModal = () => {
  const { openModal, closeModal } = useModalStore();
  const isOpen = openModal === "addGroup";

  if (!isOpen) return null;

  return <AddGroupModalContent onClose={closeModal} />;
};

export default AddGroupModal;
