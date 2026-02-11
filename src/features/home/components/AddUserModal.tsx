import { useState } from "react";
import { useModalStore } from "@/shared/store/useModalStore";
import BaseModal from "@/shared/ui/BaseModal";
import { studentModel } from "../model/student.model";
import { useStudentStore } from "../store/useStudentStore";

const AddUserModal = () => {
  const { openModal, closeModal } = useModalStore();
  const { refreshStudents } = useStudentStore();
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [notes, setNotes] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen = openModal === "addUser";

  const handleReset = () => {
    setName("");
    setBirthYear("");
    setNotes("");
    setLearningGoals("");
    setError(null);
  };

  const handleBirthYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // 숫자만 입력 가능하고 최대 4자리
    if (/^\d{0,4}$/.test(value)) {
      setBirthYear(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: createError } = await studentModel.create({
      name,
      birth_year: birthYear,
      significant: notes || undefined,
      learning_goal: learningGoals || undefined,
    });

    setLoading(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    if (data) {
      // Store 업데이트
      await refreshStudents();
      handleReset();
      closeModal();
    }
  };

  const isSubmitDisabled = loading || !name.trim() || !birthYear.trim();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeModal}
      onReset={handleReset}
      title="아동 추가하기"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 에러 메시지 */}
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-14-regular text-red-600">
            {error}
          </div>
        )}

        {/* 아동 이름 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="name"
            className="text-title-14-semibold text-black-100"
          >
            아동 이름
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => { setName(e.target.value); }}
            className="rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
            placeholder="이름을 입력하세요"
            required
          />
        </div>

        {/* 출생 연도 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="birthYear"
            className="text-title-14-semibold text-black-100"
          >
            출생 연도
          </label>
          <input
            type="text"
            id="birthYear"
            value={birthYear}
            onChange={handleBirthYearChange}
            className="rounded-lg w-1/4 border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none"
            placeholder="예: 2015"
            maxLength={4}
            required
          />
        </div>

        {/* 특이사항 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="notes"
            className="text-title-14-semibold text-black-100"
          >
            특이사항 (선택)
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => { setNotes(e.target.value); }}
            className="min-h-24 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none resize-none"
            placeholder="특이사항을 입력하세요"
          />
        </div>

        {/* 학습 목표 */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="learningGoals"
            className="text-title-14-semibold text-black-100"
          >
            학습 목표 (선택)
          </label>
          <textarea
            id="learningGoals"
            value={learningGoals}
            onChange={(e) => { setLearningGoals(e.target.value); }}
            className="min-h-24 rounded-lg border border-black-30 px-4 py-3 text-15-regular text-black-100 transition focus:border-primary focus:outline-none resize-none"
            placeholder="학습 목표를 입력하세요"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={() => {
              handleReset();
              closeModal();
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

export default AddUserModal;
