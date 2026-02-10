import { useState } from "react";
import { Pencil } from "lucide-react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";
import { studentModel } from "../model/student.model";
import { useStudentStore } from "../store/useStudentStore";

type EditUserModalContentProps = {
  studentId: string;
  onClose: () => void;
};

const EditUserModalContent = ({
  studentId,
  onClose,
}: EditUserModalContentProps) => {
  const { students, refreshStudents } = useStudentStore();
  const student = students.find((item) => item.id === studentId);

  const initialName = student?.name ?? "";
  const initialBirthYear = student?.birth_year ?? "";
  const initialNotes = student?.significant ?? "";
  const initialGoals = student?.learning_goal ?? "";

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [birthYear, setBirthYear] = useState(initialBirthYear);
  const [notes, setNotes] = useState(initialNotes);
  const [learningGoals, setLearningGoals] = useState(initialGoals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = () => {
    setName(initialName);
    setBirthYear(initialBirthYear);
    setNotes(initialNotes);
    setLearningGoals(initialGoals);
    setIsEditing(false);
    setError(null);
  };

  const handleBirthYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/^\d{0,4}$/.test(value)) {
      setBirthYear(value);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    console.log("handleSubmit 호출, isEditing:", isEditing);
    if (!isEditing) {
      return;
    }
    if (!student?.id) {
      setError("아동 정보를 찾지 못했어요.");
      return;
    }
    setLoading(true);
    setError(null);

    console.log("업데이트 데이터:", {
      id: student.id,
      name: name.trim(),
      birth_year: birthYear,
      significant: notes.trim() || undefined,
      learning_goal: learningGoals.trim() || undefined,
    });

    const { error: updateError } = await studentModel.update({
      id: student.id,
      name: name.trim(),
      birth_year: birthYear,
      significant: notes.trim() || undefined,
      learning_goal: learningGoals.trim() || undefined,
    });

    setLoading(false);

    if (updateError) {
      console.error("업데이트 에러:", updateError);
      setError(updateError.message);
      return;
    }

    console.log("업데이트 성공");
    await refreshStudents();
    handleReset();
    onClose();
  };

  const isSubmitDisabled =
    loading || !name.trim() || !birthYear.trim() || !isEditing;

  const modalTitle = (
    <div className="flex items-center justify-between">
      <h2 className="text-title-20-semibold text-black-100">아동 정보</h2>
      {!isEditing && (
        <button
          type="button"
          onClick={() => {
            console.log("수정 모드 활성화");
            setIsEditing(true);
          }}
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

        {!student && (
          <div className="rounded-lg bg-black-5 px-4 py-3 text-14-regular text-black-60">
            아동 정보를 찾지 못했어요.
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            아동 이름
          </label>
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(event) => {
                console.log("이름 변경:", event.target.value);
                setName(event.target.value);
              }}
              className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              placeholder="이름을 입력하세요"
              required
            />
          ) : (
            <div className="rounded-lg border border-black-10 bg-black-5 px-4 py-3 text-15-regular text-black-90">
              {initialName || "이름 없음"}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            출생 연도
          </label>
          {isEditing ? (
            <input
              type="text"
              value={birthYear}
              onChange={handleBirthYearChange}
              className="w-1/4 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
              placeholder="예: 2015"
              maxLength={4}
              required
            />
          ) : (
            <div className="w-1/3 rounded-lg border border-black-10 bg-black-5 px-4 py-3 text-15-regular text-black-90">
              {initialBirthYear || "-"}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            특이사항
          </label>
          {isEditing ? (
            <textarea
              value={notes}
              onChange={(event) => { setNotes(event.target.value); }}
              className="min-h-24 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none resize-none"
              placeholder="특이사항을 입력하세요"
            />
          ) : (
            <div className="min-h-24 rounded-lg border border-black-10 bg-black-5 px-4 py-3 text-15-regular text-black-90">
              {initialNotes || "특이사항이 없습니다."}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-title-14-semibold text-black-100">
            학습 목표
          </label>
          {isEditing ? (
            <textarea
              value={learningGoals}
              onChange={(event) => { setLearningGoals(event.target.value); }}
              className="min-h-24 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none resize-none"
              placeholder="학습 목표를 입력하세요"
            />
          ) : (
            <div className="min-h-24 rounded-lg border border-black-10 bg-black-5 px-4 py-3 text-15-regular text-black-90">
              {initialGoals || "학습 목표가 없습니다."}
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
