/**
 * 아동 프로필 수정/삭제 모달
 * 프로필 클릭 → 수정 팝업 → 자유 텍스트 수정 + AI 정리 → 저장
 * 삭제는 이 팝업 안에서만 가능
 */
import { useState } from "react";
import { extractDiagnosis } from "../ai/diagnosisProfile";

interface StoredStudent {
  id: string;
  name: string;
  birthYear?: string;
  significant?: string;
  totalSessions?: number;
  memo?: string;
}

const DIAG_SHORT: Record<string, string> = {
  ASD_L1: "ASD L1", ASD_L2: "ASD L2", ASD_L3: "ASD L3",
  ADHD: "ADHD", ID_mild: "지적(경)", ID_moderate: "지적(중)",
  ID_severe: "지적(중도)", down: "다운", language_delay: "언어지연",
};

interface ChildEditModalProps {
  student: StoredStudent;
  onSave: (updated: StoredStudent) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function parseInput(text: string): { name: string; age?: number; diagnosis?: string } {
  const nameMatch = text.match(/([가-힣]{2,4})(?:이|가|는|,|\s|$)/);
  const name = nameMatch?.[1] ?? text.split(/\s/)[0] ?? "";
  const ageMatch = text.match(/(\d{1,2})\s*(?:세|살)/);
  const age = ageMatch ? parseInt(ageMatch[1]) : undefined;
  const diag = extractDiagnosis(text);
  return { name, age, diagnosis: diag.primary ?? undefined };
}

export function ChildEditModal({ student, onSave, onDelete, onClose }: ChildEditModalProps) {
  const age = student.birthYear ? new Date().getFullYear() - parseInt(student.birthYear) : null;
  const initialText = [
    student.name,
    age ? `${age}세` : "",
    student.significant ?? "",
    student.memo ?? "",
  ].filter(Boolean).join(" ");

  const [editText, setEditText] = useState(initialText);
  const [preview, setPreview] = useState<ReturnType<typeof parseInput> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAnalyze = () => {
    if (editText.trim().length < 2) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setPreview(parseInput(editText));
      setIsAnalyzing(false);
    }, 300);
  };

  const handleSave = () => {
    if (!preview) return;
    onSave({
      ...student,
      name: preview.name || student.name,
      birthYear: preview.age ? String(new Date().getFullYear() - preview.age) : student.birthYear,
      significant: preview.diagnosis ?? student.significant,
      memo: editText,
    });
  };

  const handleDelete = () => {
    onDelete(student.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">프로필 수정</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* 현재 정보 */}
        <div className="mb-3 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-base font-bold text-violet-600">
              {student.name[0]}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{student.name}</div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {age && <span>{age}세</span>}
                {student.significant && (
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">
                    {DIAG_SHORT[student.significant] ?? student.significant}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 수정 입력 */}
        <textarea
          value={editText}
          onChange={(e) => { setEditText(e.target.value); setPreview(null); }}
          placeholder="아동 정보를 수정하세요"
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:outline-none"
        />

        {!preview ? (
          <button
            onClick={handleAnalyze}
            disabled={editText.trim().length < 2 || isAnalyzing}
            className="mt-2 w-full rounded-lg bg-gray-900 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {isAnalyzing ? "분석 중..." : "AI 정리"}
          </button>
        ) : (
          <>
            {/* 분석 결과 */}
            <div className="mt-2 rounded-lg bg-violet-50 p-2.5">
              <p className="mb-1.5 text-xs font-medium text-violet-600">AI 정리 결과</p>
              <div className="space-y-1 text-xs text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">이름</span>
                  <span className="font-semibold">{preview.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">나이</span>
                  <span className="font-semibold">{preview.age ? `${preview.age}세` : "미입력"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">진단</span>
                  <span className="font-semibold">
                    {preview.diagnosis ? (DIAG_SHORT[preview.diagnosis] ?? preview.diagnosis) : "미입력"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 rounded-lg bg-violet-500 py-2 text-xs font-medium text-white hover:bg-violet-600"
              >
                저장
              </button>
              <button
                onClick={() => setPreview(null)}
                className="rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
              >
                다시 정리
              </button>
            </div>
          </>
        )}

        {/* 구분선 + 삭제 */}
        <div className="mt-4 border-t border-gray-100 pt-3">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full rounded-lg py-2 text-xs text-red-400 hover:bg-red-50 hover:text-red-500"
            >
              아동 삭제
            </button>
          ) : (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="mb-2 text-xs text-red-600">
                정말 삭제하시겠어요? 생성 이력과 Agent 데이터도 함께 삭제됩니다.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-lg bg-red-500 py-1.5 text-xs font-medium text-white hover:bg-red-600"
                >
                  삭제
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
