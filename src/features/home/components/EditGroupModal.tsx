import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";
import { groupModel } from "../model/group.model";
import { useStudentStore } from "../store/useStudentStore";

type EditGroupModalContentProps = {
  groupId: string;
  onClose: () => void;
};

const EditGroupModalContent = ({
  groupId,
  onClose,
}: EditGroupModalContentProps) => {
  const { groups, students: availableMembers, refreshGroups } =
    useStudentStore();
  const group = groups.find((item) => item.id === groupId);

  const initialName = group?.name ?? "";
  const initialDescription = group?.description ?? "";
  const initialMemberIds = useMemo(() => {
    if (!group?.groups_members_n) return [];
    return group.groups_members_n
      .map((member) => member.student_id)
      .filter((id): id is string => Boolean(id));
  }, [group]);
  const initialMembers = useMemo(() => {
    if (!group?.groups_members_n) return [];
    return group.groups_members_n.flatMap((member) => {
      const students = member.students_n;
      if (!students) return [];
      return Array.isArray(students) ? students : [students];
    });
  }, [group]);

  const [isEditing, setIsEditing] = useState(false);
  const [groupName, setGroupName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [selectedMembers, setSelectedMembers] =
    useState<string[]>(initialMemberIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setGroupName(initialName);
    setDescription(initialDescription);
    setSelectedMembers(initialMemberIds);
    setIsEditing(false);
    setError(null);
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEditing) {
      return;
    }
    if (!group?.id) {
      setError("그룹 정보를 찾지 못했어요.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: updateError } = await groupModel.update({
      id: group.id,
      name: groupName.trim(),
      description: description.trim() || undefined,
      memberIds: selectedMembers,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshGroups();
    handleReset();
    onClose();
  };

  const isSubmitDisabled =
    loading || !groupName.trim() || selectedMembers.length === 0 || !isEditing;

  const modalTitle = (
    <div className="flex items-center justify-between">
      <h2 className="text-title-20-semibold text-black-100">그룹 정보</h2>
      {!isEditing && (
        <button
          type="button"
          onClick={() => { setIsEditing(true); }}
          className="rounded-lg p-2 text-black-70 transition hover:bg-black-10 hover:text-primary"
          aria-label="수정 모드 활성화"
        >
          <Pencil className="h-5 w-5" />
        </button>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen
      onClose={onClose}
      onReset={handleReset}
      title={modalTitle}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-14-regular text-red-600">
            {error}
          </div>
        )}

        {!group && (
          <div className="rounded-lg bg-black-5 px-4 py-3 text-14-regular text-black-60">
            그룹 정보를 찾지 못했어요.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            그룹 이름
          </label>
          {isEditing ? (
            <input
              type="text"
              value={groupName}
              onChange={(event) => { setGroupName(event.target.value); }}
              className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              placeholder="그룹 이름을 입력하세요"
              required
            />
          ) : (
            <div className="rounded-lg border border-black-10 bg-black-5 px-4 py-3 text-15-regular text-black-90">
              {initialName || "그룹 이름 없음"}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            설명
          </label>
          {isEditing ? (
            <textarea
              value={description}
              onChange={(event) => { setDescription(event.target.value); }}
              className="min-h-24 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none resize-none"
              placeholder="그룹 설명을 입력하세요"
            />
          ) : (
            <div className="min-h-24 rounded-lg border border-black-10 bg-black-5 px-4 py-3 text-15-regular text-black-90">
              {initialDescription?.trim() || "그룹 설명이 없습니다."}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            멤버
          </label>
          {isEditing ? (
            <>
              {availableMembers.length > 0 ? (
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
                            {member.name}
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
            </>
          ) : (
            <div className="rounded-lg border border-black-10 bg-black-5 px-4 py-3 text-15-regular text-black-90">
              {initialMembers.length > 0
                ? initialMembers.map((member) => member.name).join(", ")
                : "등록된 아동이 없습니다."}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleReset}
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
                {loading ? "저장 중..." : "저장하기"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-title-14-semibold text-black-70 transition hover:bg-black-10"
            >
              닫기
            </button>
          )}
        </div>
      </form>
    </BaseModal>
  );
};

const EditGroupModal = () => {
  const { openModal, selectedGroupId, closeModal } = useModalStore();
  const isOpen = openModal === "editGroup";

  if (!isOpen || !selectedGroupId) return null;

  return (
    <EditGroupModalContent
      key={selectedGroupId}
      groupId={selectedGroupId}
      onClose={closeModal}
    />
  );
};

export default EditGroupModal;
