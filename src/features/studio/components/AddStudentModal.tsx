/**
 * 아동 추가 모달 — 이름, 출생년도, 성별, 주호소를 입력받아 students_n에 저장.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { captureSentryError } from "@/shared/utils/sentryUtils";

interface AddStudentModalProps {
  onClose: () => void;
  onCreated: (student: { id: string; name: string; birth_year?: string; gender?: string; significant?: string }) => void;
}

const GENDER_OPTIONS = [
  { value: "male", label: "남" },
  { value: "female", label: "여" },
];

const currentYear = new Date().getFullYear();

const AddStudentModal = ({ onClose, onCreated }: AddStudentModalProps) => {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<string>("");
  const [significant, setSignificant] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user?.id) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from("students_n")
        .insert({
          user_id: user.id,
          name: name.trim(),
          birth_year: birthYear || null,
          gender: gender || null,
          significant: significant.trim() || null,
          learning_goal: learningGoal.trim() || null,
        })
        .select("id, name, birth_year, gender, significant, learning_goal")
        .single();

      if (error) throw error;
      if (data) onCreated(data);
    } catch (err) {
      captureSentryError(err, "AddStudentModal 아동 추가");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black-15">
          <span className="text-title-16-semibold text-black-90">새 아동 추가</span>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="h-4 w-4 text-black-50" />
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          {/* 이름 (필수) */}
          <div className="flex flex-col gap-1">
            <label className="text-13-regular font-semibold text-black-70">
              이름 <span className="text-error-700">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="아동 이름"
              className="rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-80 placeholder:text-black-40 outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {/* 출생년도 + 성별 (한 줄) */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 w-28">
              <label className="text-13-regular font-semibold text-black-70">출생년도</label>
              <input
                type="number"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder={`${currentYear - 6}`}
                min={2000}
                max={currentYear}
                className="rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-80 placeholder:text-black-40 outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-13-regular font-semibold text-black-70">성별</label>
              <div className="flex gap-2">
                {GENDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setGender(gender === opt.value ? "" : opt.value)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-14-regular transition cursor-pointer ${
                      gender === opt.value
                        ? "border-primary-200 bg-primary-50 text-primary"
                        : "border-black-25 text-black-60 hover:border-primary-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 특이사항 */}
          <div className="flex flex-col gap-1">
            <label className="text-13-regular font-semibold text-black-70">특이사항</label>
            <input
              value={significant}
              onChange={(e) => setSignificant(e.target.value)}
              placeholder="예: ASD Level 2, 감각 과민"
              className="rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-80 placeholder:text-black-40 outline-none focus:border-primary"
            />
          </div>

          {/* 학습 목표 */}
          <div className="flex flex-col gap-1">
            <label className="text-13-regular font-semibold text-black-70">학습 목표</label>
            <input
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value)}
              placeholder="예: 기본 감정 4개 인식, ㅅ 발음 교정"
              className="rounded-lg border border-black-25 px-3 py-2 text-14-regular text-black-80 placeholder:text-black-40 outline-none focus:border-primary"
            />
            <span className="text-12-regular text-black-40">
              AI가 아동의 특이사항과 목표에 맞춘 학습지를 생성해요
            </span>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-black-25 px-4 py-2.5 text-14-semibold text-black-70 hover:bg-black-5 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-14-semibold text-white-100 hover:bg-primary-700 transition cursor-pointer disabled:opacity-40"
            >
              {isSaving ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;
