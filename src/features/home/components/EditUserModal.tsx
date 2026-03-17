/**
 * 학생 정보 조회/수정/삭제 모달.
 */
import { useState } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import Button from "@/shared/ui/Button";
import { mp } from "@/shared/utils/mixpanel";
import { studentModel } from "../model/student.model";
import { useStudentStore } from "../store/useStudentStore";

type EditUserModalContentProps = {
  studentId: string;
  onClose: () => void;
};

const EditUserModalContent = ({ studentId, onClose }: EditUserModalContentProps) => {
  const { students, refreshStudents } = useStudentStore();
  const student = students.find((item) => item.id === studentId);

  const initialName = student?.name ?? "";
  const initialBirthYear = student?.birth_year ?? "";
  const initialGender = student?.gender ?? null;
  const initialNotes = student?.significant ?? "";
  const initialGoals = student?.learning_goal ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [birthYear, setBirthYear] = useState(initialBirthYear);
  const [gender, setGender] = useState<string | null>(initialGender);
  const [notes, setNotes] = useState(initialNotes);
  const [learningGoals, setLearningGoals] = useState(initialGoals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleReset = () => {
    setName(initialName);
    setBirthYear(initialBirthYear);
    setGender(initialGender);
    setNotes(initialNotes);
    setLearningGoals(initialGoals);
    setIsEditing(false);
    setError(null);
  };

  const handleBirthYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^\d{0,4}$/.test(value)) setBirthYear(value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isEditing || !student?.id) return;

    setLoading(true);
    setError(null);

    const { error: updateError } = await studentModel.update({
      id: student.id,
      name: name.trim(),
      birth_year: birthYear,
      gender,
      significant: notes.trim() || undefined,
      learning_goal: learningGoals.trim() || undefined,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    mp.track("아동 수정");
    await refreshStudents();
    handleReset();
    onClose();
  };

  const handleDelete = async () => {
    if (!student?.id) return;
    setIsDeleting(true);

    const { error: deleteError } = await studentModel.delete(student.id);
    setIsDeleting(false);

    if (deleteError) {
      setError(deleteError.message);
      setIsDeleteOpen(false);
      return;
    }

    mp.track("아동 삭제");
    await refreshStudents();
    setIsDeleteOpen(false);
    onClose();
  };

  const isSubmitDisabled = loading || !name.trim() || !birthYear.trim() || !isEditing;

  const age = initialBirthYear ? new Date().getFullYear() - parseInt(initialBirthYear) : null;
  const genderLabel = initialGender === "male" ? "남" : initialGender === "female" ? "여" : null;

  const modalTitle = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary">
          <span className="text-title-16-semibold">{initialName.charAt(0) || "?"}</span>
        </div>
        <div className="flex flex-col">
          <h2 className="text-title-18-semibold text-black-100">{initialName || "아동 정보"}</h2>
          {age && (
            <span className="text-12-regular text-black-50">
              만 {age}세{genderLabel ? ` · ${genderLabel}` : ""}
            </span>
          )}
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

          {!student && (
            <div className="rounded-xl bg-black-5 px-4 py-3 text-14-regular text-black-60">
              아동 정보를 찾지 못했어요.
            </div>
          )}

          {/* 이름 */}
          <Field label="아동 이름">
            {isEditing ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-black-25 px-4 py-3 text-15-regular text-black-90 transition focus:border-primary focus:outline-none"
                placeholder="이름을 입력하세요"
                required
              />
            ) : (
              <ReadOnlyValue>{initialName || "이름 없음"}</ReadOnlyValue>
            )}
          </Field>

          {/* 출생 연도 + 성별 (한 행) */}
          <div className="flex gap-4">
            <Field label="출생 연도">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={birthYear}
                    onChange={handleBirthYearChange}
                    className="w-28 rounded-lg border border-black-25 px-3 py-3 text-15-regular text-black-90 transition focus:border-primary focus:outline-none"
                    placeholder="2015"
                    maxLength={4}
                    required
                  />
                  {birthYear.length === 4 && (
                    <span className="text-13-regular text-black-50 shrink-0">
                      만 {new Date().getFullYear() - parseInt(birthYear)}세
                    </span>
                  )}
                </div>
              ) : (
                <ReadOnlyValue>
                  {initialBirthYear
                    ? `${initialBirthYear}년 (만 ${new Date().getFullYear() - parseInt(initialBirthYear)}세)`
                    : "-"}
                </ReadOnlyValue>
              )}
            </Field>

            <Field label="성별">
              {isEditing ? (
                <div className="flex gap-2">
                  {([["male", "남자"], ["female", "여자"]] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(gender === value ? null : value)}
                      className={`rounded-lg border px-5 py-2.5 text-14-medium transition cursor-pointer ${
                        gender === value
                          ? "border-primary bg-primary-100 text-primary"
                          : "border-black-25 text-black-60 hover:bg-black-5"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <ReadOnlyValue>
                  {initialGender === "male" ? "남자" : initialGender === "female" ? "여자" : "미설정"}
                </ReadOnlyValue>
              )}
            </Field>
          </div>

          {/* 특이사항 */}
          <Field label="특이사항">
            {isEditing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-20 w-full rounded-lg border border-black-25 px-4 py-3 text-15-regular text-black-90 transition focus:border-primary focus:outline-none resize-none"
                placeholder="특이사항을 입력하세요"
              />
            ) : (
              <ReadOnlyValue>{initialNotes || "특이사항이 없습니다."}</ReadOnlyValue>
            )}
          </Field>

          {/* 학습 목표 */}
          <Field label="학습 목표">
            {isEditing ? (
              <textarea
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                className="min-h-20 w-full rounded-lg border border-black-25 px-4 py-3 text-15-regular text-black-90 transition focus:border-primary focus:outline-none resize-none"
                placeholder="학습 목표를 입력하세요"
              />
            ) : (
              <ReadOnlyValue>{initialGoals || "학습 목표가 없습니다."}</ReadOnlyValue>
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
        title="아동 삭제"
        description={`"${initialName}" 아동 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
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

const EditUserModal = () => {
  const { openModal, selectedUserId, closeModal } = useModalStore();
  const isOpen = openModal === "editUser";

  if (!isOpen || !selectedUserId) return null;

  return (
    <EditUserModalContent
      key={selectedUserId}
      studentId={selectedUserId}
      onClose={closeModal}
    />
  );
};

export default EditUserModal;
