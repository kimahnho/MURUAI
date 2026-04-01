/**
 * 아동 선택기 — 좌측 패널
 * 자유 텍스트로 아동 정보 입력 → AI 분석 → 프로필 자동 생성
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useImageGenStore } from "../store/useImageGenStore";
import { getOrCreateAgent, getLearnedPatterns } from "../ai/childAgent";
import { getHistoryByChild } from "../data/imageApi";
import { archiveSession } from "../data/sessionApi";
import { extractDiagnosis } from "../ai/diagnosisProfile";
import { ChildEditModal } from "./ChildEditModal";

export interface StoredStudent {
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

// ═══ DB row ↔ StoredStudent 매퍼 ═══

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToStudent(row: any): StoredStudent {
  return {
    id: row.id,
    name: row.name,
    birthYear: row.birth_year ?? undefined,
    significant: row.diagnosis_code ?? undefined,
    memo: row.memo ?? undefined,
  };
}

/** 자유 텍스트에서 이름/나이/진단 추출 */
function parseChildInput(text: string): { name: string; age?: number; diagnosis?: string; raw: string } {
  const nameMatch = text.match(/([가-힣]{2,4})(?:이|가|는|,|\s|$)/);
  const name = nameMatch?.[1] ?? text.split(/\s/)[0] ?? "이름 미입력";
  const ageMatch = text.match(/(\d{1,2})\s*(?:세|살)/);
  const age = ageMatch ? parseInt(ageMatch[1]) : undefined;
  const diag = extractDiagnosis(text);
  return { name, age, diagnosis: diag.primary ?? undefined, raw: text };
}

export function ChildSelector() {
  const [students, setStudents] = useState<StoredStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addInput, setAddInput] = useState("");
  const [preview, setPreview] = useState<ReturnType<typeof parseChildInput> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StoredStudent | null>(null);

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const selectedChild = useImageGenStore((s) => s.selectedChild);
  const setSelectedChild = useImageGenStore((s) => s.setSelectedChild);
  const setChildAgent = useImageGenStore((s) => s.setChildAgent);
  const setHistory = useImageGenStore((s) => s.setHistory);
  const setLearnedPatterns = useImageGenStore((s) => s.setLearnedPatterns);
  const sessions = useImageGenStore((s) => s.sessions);
  const setSessions = useImageGenStore((s) => s.setSessions);
  const activeSession = useImageGenStore((s) => s.activeSession);

  // ═══ 초기 로드 ═══
  useEffect(() => {
    if (!user?.id) return;
    const loadStudents = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("new_image_gen_students")
        .select("*")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (!error && data) {
        setStudents(data.map(mapRowToStudent));
      }
      setIsLoading(false);
    };
    loadStudents();
  }, [user?.id]);

  // ═══ 아동 선택 ═══
  const handleSelect = async (student: StoredStudent) => {
    setSelectedChild({
      id: student.id,
      name: student.name,
      birthYear: student.birthYear,
      significant: student.significant,
    });

    const agent = await getOrCreateAgent(
      student.id, student.significant ?? null, student.birthYear ?? null,
    );
    setChildAgent(agent);

    // 이력 + 학습 패턴 병렬 로드
    const [history, patterns] = await Promise.all([
      getHistoryByChild(student.id),
      getLearnedPatterns(agent.id),
    ]);
    setHistory(history);
    setLearnedPatterns(patterns);
  };

  // ═══ "AI 정리" 버튼 ═══
  const handleAnalyze = () => {
    if (addInput.trim().length < 2) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setPreview(parseChildInput(addInput));
      setIsAnalyzing(false);
    }, 300);
  };

  // ═══ 아동 등록 ═══
  const handleAdd = async () => {
    if (!preview || !preview.name || !user?.id) return;

    const birthYear = preview.age ? String(new Date().getFullYear() - preview.age) : null;

    const { data, error } = await supabase
      .from("new_image_gen_students")
      .insert({
        user_id: user.id,
        name: preview.name,
        birth_year: birthYear,
        diagnosis_code: preview.diagnosis ?? null,
        memo: preview.raw,
      })
      .select()
      .single();

    if (error || !data) {
      console.warn("아동 등록 실패", error);
      return;
    }

    const newStudent = mapRowToStudent(data);
    setStudents((prev) => [...prev, newStudent]);
    setShowAdd(false);
    setAddInput("");
    setPreview(null);

    await handleSelect(newStudent);
  };

  // ═══ 프로필 수정 ═══
  const handleEditSave = async (updated: StoredStudent) => {
    const { error } = await supabase
      .from("new_image_gen_students")
      .update({
        name: updated.name,
        birth_year: updated.birthYear ?? null,
        diagnosis_code: updated.significant ?? null,
        memo: updated.memo ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", updated.id);

    if (error) {
      console.warn("아동 수정 실패", error);
      return;
    }

    setStudents((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    setEditingStudent(null);

    if (selectedChild?.id === updated.id) {
      await handleSelect(updated);
    }
  };

  // ═══ 프로필 삭제 (소프트 삭제) ═══
  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("new_image_gen_students")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.warn("아동 삭제 실패", error);
      return;
    }

    setStudents((prev) => prev.filter((s) => s.id !== id));
    setEditingStudent(null);

    if (selectedChild?.id === id) {
      setSelectedChild(null);
      setChildAgent(null);
      setHistory([]);
      setLearnedPatterns([]);
    }
  };

  const calcAge = (birthYear?: string) => {
    if (!birthYear) return null;
    return new Date().getFullYear() - parseInt(birthYear);
  };

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-base font-bold text-gray-900">아동 선택</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex h-7 items-center gap-1 rounded-lg bg-violet-500 px-2.5 text-xs font-medium text-white hover:bg-violet-600"
        >
          + 추가
        </button>
      </div>

      {/* 아동 추가 — 자유 텍스트 → AI 정리 → 등록 */}
      {showAdd && (
        <div className="border-b border-gray-200 bg-white p-3">
          <textarea
            value={addInput}
            onChange={(e) => { setAddInput(e.target.value); setPreview(null); }}
            placeholder={"아동 정보를 자유롭게 입력하세요\n예: 수아 6세 ASD L2, 감각과민 있음"}
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-violet-300 focus:outline-none"
            autoFocus
          />

          {!preview ? (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleAnalyze}
                disabled={addInput.trim().length < 2 || isAnalyzing}
                className="flex-1 rounded-lg bg-gray-900 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-40"
              >
                {isAnalyzing ? "분석 중..." : "AI 정리"}
              </button>
              <button
                onClick={() => { setShowAdd(false); setAddInput(""); setPreview(null); }}
                className="rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
              >
                취소
              </button>
            </div>
          ) : (
            <>
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
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleAdd}
                  className="flex-1 rounded-lg bg-violet-500 py-2 text-xs font-medium text-white hover:bg-violet-600"
                >
                  등록
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  다시 정리
                </button>
                <button
                  onClick={() => { setShowAdd(false); setAddInput(""); setPreview(null); }}
                  className="rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
                >
                  취소
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 아동 목록 + 최근 대화 (하나의 스크롤 영역) */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-gray-400">불러오는 중...</p>
          </div>
        ) : students.length === 0 && !showAdd ? (
          <div className="px-3 py-8 text-center">
            <p className="text-sm text-gray-400">등록된 아동이 없어요</p>
            <p className="mt-1 text-xs text-gray-300">위 + 추가 버튼을 눌러주세요</p>
          </div>
        ) : (
          <div className="space-y-1">
            {students.map((s) => {
              const isSelected = selectedChild?.id === s.id;
              const age = calcAge(s.birthYear);
              const diag = s.significant ? (DIAG_SHORT[s.significant] ?? s.significant) : null;

              return (
                <div
                  key={s.id}
                  className={`group relative w-full rounded-xl p-3 text-left transition ${
                    isSelected
                      ? "bg-violet-50 border border-violet-200"
                      : "hover:bg-white border border-transparent"
                  }`}
                >
                  <button onClick={() => handleSelect(s)} className="w-full text-left">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                        isSelected ? "bg-violet-500 text-white" : "bg-gray-200 text-gray-600"
                      }`}>
                        {s.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900">{s.name}</div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          {age && <span>{age}세</span>}
                          {diag && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                              {diag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingStudent(s); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
                    title="수정"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.262a1.75 1.75 0 0 0 0-2.474Z" />
                      <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9A.75.75 0 0 1 14 9v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 최근 대화 — 아동 목록 바로 아래에 이어서 표시 */}
        {selectedChild && (() => {
          const childSessions = sessions.filter((s) => s.studentId === selectedChild.id);
          if (childSessions.length === 0) return null;
          return (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-xs font-semibold text-gray-400">최근 대화</span>
                <button
                  onClick={() => navigate("/image-gen")}
                  className="text-xs font-medium text-violet-500 hover:text-violet-600"
                >
                  + 새 대화
                </button>
              </div>
              <div className="space-y-0.5">
                {childSessions.slice(0, 10).map((session) => {
                  const isActive = activeSession?.id === session.id;
                  const date = new Date(session.createdAt);
                  const dateStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
                  return (
                    <div key={session.id} className="group flex items-center gap-0.5">
                      <button
                        onClick={() => navigate(`/image-gen/${session.id}`)}
                        className={`min-w-0 flex-1 rounded-lg px-2.5 py-2 text-left transition ${
                          isActive
                            ? "bg-violet-100 text-violet-700"
                            : "text-gray-600 hover:bg-white"
                        }`}
                      >
                        <span className={`block truncate text-xs ${isActive ? "font-semibold" : "font-medium"}`}>
                          {session.title ?? "새 대화"}
                        </span>
                        <span className={`text-[11px] ${isActive ? "text-violet-400" : "text-gray-400"}`}>
                          {dateStr}
                        </span>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await archiveSession(session.id);
                          setSessions(sessions.filter((s) => s.id !== session.id));
                          if (isActive) navigate("/image-gen", { replace: true });
                        }}
                        className="shrink-0 rounded p-1 text-gray-300 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                        title="삭제"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>

      {/* 수정 모달 */}
      {editingStudent && (
        <ChildEditModal
          student={editingStudent}
          onSave={handleEditSave}
          onDelete={handleDelete}
          onClose={() => setEditingStudent(null)}
        />
      )}
    </div>
  );
}
