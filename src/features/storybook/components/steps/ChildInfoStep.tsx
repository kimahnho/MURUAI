/**
 * 1단계: 아동 정보 — 기존 학습자 선택 또는 직접 입력.
 */
import { useState, useEffect } from "react";
import { Check, Loader2, User } from "lucide-react";

import type { ChildInfo } from "../../model/storybookTypes";
import { useStorybookWizardStore } from "../../store/useStorybookWizardStore";
import {
  fetchStudentsForWizard,
  type StudentSummary,
} from "../../data/studentService";

type Mode = "select" | "manual";

const ChildInfoStep = () => {
  const childInfo = useStorybookWizardStore((s) => s.formData.childInfo);
  const setChildInfo = useStorybookWizardStore((s) => s.setChildInfo);

  // 학습자 목록
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);

  // 모드
  const [mode, setMode] = useState<Mode>("select");

  // 직접 입력 로컬 상태
  const [name, setName] = useState(childInfo?.name ?? "");
  const [gender, setGender] = useState<"male" | "female">(
    childInfo?.gender ?? "male",
  );
  const [age, setAge] = useState(childInfo?.age ?? 5);
  const [diagnosis, setDiagnosis] = useState(childInfo?.diagnosis ?? "");
  const [learningGoal, setLearningGoal] = useState(
    childInfo?.learningGoal ?? "",
  );

  // 선택 모드 — 선택한 학습자 ID + 성별 미설정 시 보충 입력
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    childInfo?.studentId ?? null,
  );
  const [selectedGender, setSelectedGender] = useState<"male" | "female" | null>(
    childInfo?.gender ?? null,
  );

  useEffect(() => {
    const load = async () => {
      setIsLoadingStudents(true);
      const result = await fetchStudentsForWizard();
      setStudents(result);
      setIsLoadingStudents(false);

      // 학습자가 없으면 직접 입력 모드로 전환
      if (result.length === 0) {
        setMode("manual");
      }
    };
    void load();
  }, []);

  // 직접 입력 → 스토어 동기화
  const syncManualToStore = (
    overrides: Partial<Pick<ChildInfo, "name" | "gender" | "age" | "diagnosis" | "learningGoal">> = {},
  ) => {
    const info: ChildInfo = {
      id: childInfo?.id ?? crypto.randomUUID(),
      name: overrides.name ?? name,
      gender: overrides.gender ?? gender,
      age: overrides.age ?? age,
      diagnosis: (overrides.diagnosis ?? diagnosis) || undefined,
      learningGoal: (overrides.learningGoal ?? learningGoal) || undefined,
    };
    setChildInfo(info);
  };

  // 학습자 카드 선택
  const handleSelectStudent = (student: StudentSummary) => {
    const currentYear = new Date().getFullYear();
    const computedAge = Math.max(1, currentYear - parseInt(student.birth_year));
    const studentGender =
      student.gender === "male" || student.gender === "female"
        ? student.gender
        : null;

    setSelectedStudentId(student.id);
    setSelectedGender(studentGender);

    // 성별이 있으면 바로 스토어에 저장
    if (studentGender) {
      setChildInfo({
        id: childInfo?.id ?? crypto.randomUUID(),
        studentId: student.id,
        name: student.name,
        gender: studentGender,
        age: computedAge,
      });
    }
  };

  // 성별 보충 선택 (학습자에 gender 없을 때)
  const handleSupplementGender = (g: "male" | "female") => {
    setSelectedGender(g);
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const currentYear = new Date().getFullYear();
    const computedAge = Math.max(1, currentYear - parseInt(student.birth_year));

    setChildInfo({
      id: childInfo?.id ?? crypto.randomUUID(),
      studentId: student.id,
      name: student.name,
      gender: g,
      age: computedAge,
    });
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const isNeedsGender = selectedStudentId !== null && selectedGender === null;

  return (
    <div className="flex flex-col gap-4">
      {/* 모드 탭 — 학습자가 있을 때만 표시 */}
      {students.length > 0 && (
        <div className="flex rounded-lg border border-black-15 p-0.5">
          {([["select", "내 학습자"], ["manual", "직접 입력"]] as const).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => { setMode(value); }}
                className={`flex-1 rounded-md py-1.5 text-13-semibold transition ${
                  mode === value
                    ? "bg-primary text-white"
                    : "text-black-50 hover:text-black-80"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      )}

      {/* 모드 A: 학습자 선택 */}
      {mode === "select" && (
        <div className="flex flex-col gap-3">
          {isLoadingStudents ? (
            <div className="flex items-center justify-center py-8 text-black-40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-black-40">
              <User className="h-8 w-8" />
              <span className="text-13-regular">등록된 학습자가 없어요</span>
            </div>
          ) : (
            <>
              {/* 학습자 카드 리스트 */}
              <div className="flex flex-col gap-2">
                {students.map((student) => {
                  const currentYear = new Date().getFullYear();
                  const studentAge = Math.max(
                    1,
                    currentYear - parseInt(student.birth_year),
                  );
                  const isSelected = selectedStudentId === student.id;
                  const genderLabel =
                    student.gender === "male"
                      ? "남"
                      : student.gender === "female"
                        ? "여"
                        : null;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => { handleSelectStudent(student); }}
                      className={`relative flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary-50"
                          : "border-black-20 hover:bg-black-5"
                      }`}
                    >
                      {/* 선택 체크 */}
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}

                      {/* 아바타 */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black-10">
                        <User className="h-4 w-4 text-black-50" />
                      </div>

                      {/* 정보 */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-14-semibold text-black-90 truncate">
                          {student.name}
                        </span>
                        <span className="text-12-regular text-black-50">
                          만 {studentAge}세{genderLabel ? ` · ${genderLabel}` : ""}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 성별 보충 입력 — 선택한 학습자에 gender가 없을 때 */}
              {isNeedsGender && selectedStudent && (
                <div className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <span className="text-13-semibold text-amber-800">
                    {selectedStudent.name}의 성별을 선택해 주세요
                  </span>
                  <div className="flex gap-2">
                    {([["male", "남자"], ["female", "여자"]] as const).map(
                      ([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => { handleSupplementGender(value); }}
                          className="flex-1 rounded-lg border border-amber-300 py-2 text-13-medium text-amber-800 transition hover:bg-amber-100"
                        >
                          {label}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 모드 B: 직접 입력 */}
      {mode === "manual" && (
        <div className="flex flex-col gap-4">
          {/* 이름 */}
          <label className="flex flex-col gap-1">
            <span className="text-14-semibold text-black-80">
              이름 <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={name}
              placeholder="아동 이름"
              onChange={(e) => {
                setName(e.target.value);
                syncManualToStore({ name: e.target.value });
              }}
              className="rounded-lg border border-black-25 px-3 py-2 text-14-regular focus:border-primary focus:outline-none"
            />
          </label>

          {/* 성별 */}
          <div className="flex flex-col gap-1">
            <span className="text-14-semibold text-black-80">
              성별 <span className="text-red-500">*</span>
            </span>
            <div className="flex gap-2">
              {(["male", "female"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setGender(g);
                    syncManualToStore({ gender: g });
                  }}
                  className={`flex-1 rounded-lg border py-2 text-14-medium transition ${
                    gender === g
                      ? "border-primary bg-primary-100 text-primary"
                      : "border-black-25 text-black-60 hover:bg-black-10"
                  }`}
                >
                  {g === "male" ? "남자" : "여자"}
                </button>
              ))}
            </div>
          </div>

          {/* 나이 */}
          <label className="flex flex-col gap-1">
            <span className="text-14-semibold text-black-80">
              나이 <span className="text-red-500">*</span>
            </span>
            <input
              type="number"
              min={1}
              max={19}
              value={age}
              onChange={(e) => {
                const v = Math.min(19, Math.max(1, Number(e.target.value) || 1));
                setAge(v);
                syncManualToStore({ age: v });
              }}
              className="rounded-lg border border-black-25 px-3 py-2 text-14-regular focus:border-primary focus:outline-none"
            />
          </label>

          {/* 진단명 */}
          <label className="flex flex-col gap-1">
            <span className="text-14-semibold text-black-80">
              진단명 <span className="text-12-regular text-black-40">(선택)</span>
            </span>
            <input
              type="text"
              value={diagnosis}
              placeholder="선택 사항"
              onChange={(e) => {
                setDiagnosis(e.target.value);
                syncManualToStore({ diagnosis: e.target.value });
              }}
              className="rounded-lg border border-black-25 px-3 py-2 text-14-regular focus:border-primary focus:outline-none"
            />
          </label>

          {/* 학습 목표 */}
          <label className="flex flex-col gap-1">
            <span className="text-14-semibold text-black-80">
              학습 목표 <span className="text-12-regular text-black-40">(선택)</span>
            </span>
            <input
              type="text"
              value={learningGoal}
              placeholder="선택 사항"
              onChange={(e) => {
                setLearningGoal(e.target.value);
                syncManualToStore({ learningGoal: e.target.value });
              }}
              className="rounded-lg border border-black-25 px-3 py-2 text-14-regular focus:border-primary focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default ChildInfoStep;
