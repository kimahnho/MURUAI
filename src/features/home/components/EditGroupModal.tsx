/**
 * 그룹 정보 조회/수정/삭제 모달.
 */
import { useMemo, useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import Button from "@/shared/ui/Button";
import { mp } from "@/shared/utils/mixpanel";
import { groupModel } from "../model/group.model";
import { useStudentStore } from "../store/useStudentStore";

type EditGroupModalContentProps = {
  groupId: string;
  onClose: () => void;
};

const EditGroupModalContent = ({ groupId, onClose }: EditGroupModalContentProps) => {
  const { groups, students: availableMembers, refreshGroups } = useStudentStore();
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
  const [selectedMembers, setSelectedMembers] = useState<string[]>(initialMemberIds);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
        : prev,
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEditing || !group?.id) return;

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

    mp.track("그룹 수정");
    await refreshGroups();
    handleReset();
    onClose();
  };

  const handleDelete = async () => {
    if (!group?.id) return;
    setIsDeleting(true);

    const { error: deleteError } = await groupModel.delete(group.id);
    setIsDeleting(false);

    if (deleteError) {
      setError(deleteError.message);
      setIsDeleteOpen(false);
      return;
    }

    mp.track("그룹 삭제");
    await refreshGroups();
    setIsDeleteOpen(false);
    onClose();
  };

  const isSubmitDisabled = loading || !groupName.trim() || selectedMembers.length === 0 || !isEditing;

  const modalTitle = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <span className="text-title-16-semibold">{initialName.charAt(0) || "?"}</span>
        </div>
        <div className="flex flex-col">
          <h2 className="text-title-18-semibold text-black-100">{initialName || "그룹 정보"}</h2>
          <span className="text-12-regular text-black-50">
            멤버 {initialMembers.length}명
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg p-2 text-black-50 transition hover:bg-black-10 hover:text-primary cursor-pointer"
            aria-label="수정"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-black-50 transition hover:bg-black-10 hover:text-black-100 cursor-pointer"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <BaseModal isOpen onClose={onClose} onReset={handleReset} title={modalTitle} showCloseButton={false}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-error-50 border border-error-100 px-4 py-3 text-14-regular text-error-700">
              {error}
            </div>
          )}

          {!group && (
            <div className="rounded-xl bg-black-5 px-4 py-3 text-14-regular text-black-60">
              그룹 정보를 찾지 못했어요.
            </div>
          )}

          {/* 그룹 이름 */}
          <Field label="그룹 이름">
            {isEditing ? (
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-lg border border-black-25 px-4 py-3 text-15-regular text-black-90 transition focus:border-primary focus:outline-none"
                placeholder="그룹 이름을 입력하세요"
                required
              />
            ) : (
              <ReadOnlyValue>{initialName || "그룹 이름 없음"}</ReadOnlyValue>
            )}
          </Field>

          {/* 설명 */}
          <Field label="설명">
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-20 w-full rounded-lg border border-black-25 px-4 py-3 text-15-regular text-black-90 transition focus:border-primary focus:outline-none resize-none"
                placeholder="그룹 설명을 입력하세요"
              />
            ) : (
              <ReadOnlyValue>{initialDescription?.trim() || "설명이 없습니다."}</ReadOnlyValue>
            )}
          </Field>

          {/* 멤버 */}
          <Field label="멤버">
            {isEditing ? (
              <>
                {availableMembers.length > 0 ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      {availableMembers.map((member) => {
                        const memberId = member.id;
                        if (!memberId) return null;
                        const isSelected = selectedMembers.includes(memberId);

                        return (
                          <label
                            key={memberId}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition cursor-pointer ${
                              isSelected
                                ? "border-primary bg-primary-50"
                                : "border-black-25 hover:bg-black-5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleMemberToggle(memberId)}
                              className="h-4 w-4 rounded border-black-30 text-primary accent-primary"
                            />
                            <span className="text-14-medium text-black-90">{member.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <span className="text-12-regular text-black-50">
                      {selectedMembers.length}/5명 선택됨
                    </span>
                  </>
                ) : (
                  <div className="rounded-lg bg-black-5 px-4 py-3 text-14-regular text-black-60">
                    먼저 아동을 추가해주세요.
                  </div>
                )}
              </>
            ) : (
              <ReadOnlyValue>
                {initialMembers.length > 0
                  ? initialMembers.map((m) => m.name).join(", ")
                  : "등록된 아동이 없습니다."}
              </ReadOnlyValue>
            )}
          </Field>

          {/* 액션 버튼 */}
          <div className="flex items-center gap-3 mt-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="md" onClick={handleReset} className="flex-1">
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={isSubmitDisabled}
                  isLoading={loading}
                  className="flex-1"
                >
                  저장하기
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="destructive"
                  size="md"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setIsDeleteOpen(true)}
                >
                  삭제
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="md" onClick={onClose}>
                  닫기
                </Button>
              </>
            )}
          </div>
        </form>
      </BaseModal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={() => { void handleDelete(); }}
        title="그룹 삭제"
        description={`"${initialName}" 그룹을 삭제하시겠습니까? 그룹에 속한 아동은 삭제되지 않습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
};

// ─── 서브 컴포넌트 ───

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-13-semibold text-black-60">{label}</span>
    {children}
  </div>
);

const ReadOnlyValue = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-lg bg-black-5 px-4 py-3 text-15-regular text-black-90">
    {children}
  </div>
);

// ─── 엔트리 ───

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
