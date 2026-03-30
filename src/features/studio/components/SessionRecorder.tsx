/**
 * 세션 녹화 + 평가 컴포넌트 — 세션 시작/종료 + 평가 입력.
 * TherapyPage 하단 또는 사이드바에 배치된다.
 */
import { useState, useRef, useEffect } from "react";
import { Play, Square, Clock, Star, Save, Loader2 } from "lucide-react";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useTherapyStore } from "../store/useTherapyStore";
import {
  startSession,
  finishSession,
  saveSessionMessages,
  saveEvaluation,
} from "../data/sessionService";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import useToastStore from "@/shared/store/useToastStore";
import { mp } from "@/shared/utils/mixpanel";
import type { SessionEvaluation } from "../model/therapyTypes";
import { cn } from "../lib/utils";

const SessionRecorder = () => {
  const user = useAuthStore((s) => s.user);
  const messages = useTherapyStore((s) => s.messages);
  const currentDomain = useTherapyStore((s) => s.currentDomain);
  const selectedStudent = useTherapyStore((s) => s.selectedStudent);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [evalNotes, setEvalNotes] = useState("");
  const [evalScores, setEvalScores] = useState<Record<string, number>>({
    participation: 0,
    accuracy: 0,
    independence: 0,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  // 타이머
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  // 세션 시작
  const handleStart = async () => {
    if (!user?.id || !currentDomain) return;
    try {
      const id = await startSession(user.id, currentDomain, selectedStudent?.studentId);
      sessionIdRef.current = id;
      setIsRecording(true);
      setElapsed(0);
      mp.track("치료 세션 시작", { domain: currentDomain });
    } catch (err) {
      captureSentryError(err, "SessionRecorder 세션 시작");
    }
  };

  // 세션 종료 → 평가 입력 표시
  const handleStop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setShowEvaluation(true);
  };

  // 평가 저장 + 세션 완료
  const handleSaveEvaluation = async () => {
    if (!user?.id || !sessionIdRef.current) return;
    setIsSaving(true);

    const evaluation: SessionEvaluation = {
      scores: evalScores,
      notes: evalNotes || undefined,
    };

    try {
      await finishSession(sessionIdRef.current, evaluation, elapsed);
      await saveSessionMessages(user.id, sessionIdRef.current, messages);
      await saveEvaluation(user.id, sessionIdRef.current, selectedStudent?.studentId, evaluation);

      mp.track("치료 세션 평가 저장", { duration_seconds: elapsed });
      useToastStore.getState().showToast("세션이 저장되었어요!", "success");
      setShowEvaluation(false);
      setEvalNotes("");
      setEvalScores({ participation: 0, accuracy: 0, independence: 0 });
      sessionIdRef.current = null;
    } catch (err) {
      captureSentryError(err, "SessionRecorder 평가 저장");
      useToastStore.getState().showToast("저장에 실패했어요. 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // 평가 입력 UI
  if (showEvaluation) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-black-20 bg-white p-4">
        <span className="text-14-semibold text-black-80">세션 평가</span>
        <div className="flex items-center gap-2 text-13-regular text-black-50">
          <Clock className="h-3.5 w-3.5" />
          {formatTime(elapsed)}
        </div>

        {/* 점수 입력 */}
        {Object.entries(evalScores).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-13-regular text-black-70 capitalize">
              {key === "participation" ? "참여도" : key === "accuracy" ? "정확도" : "독립수행"}
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setEvalScores((prev) => ({ ...prev, [key]: score }))}
                  className="cursor-pointer"
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition",
                      score <= value ? "fill-warning text-warning" : "text-black-25",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 메모 */}
        <textarea
          value={evalNotes}
          onChange={(e) => setEvalNotes(e.target.value)}
          placeholder="세션 메모 (선택)"
          rows={2}
          className="rounded-lg border border-black-20 bg-white px-3 py-2 text-13-regular text-black-80 placeholder:text-black-40 outline-none focus:border-primary resize-none"
        />

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSaveEvaluation}
          disabled={isSaving}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-14-semibold text-white-100 hover:bg-primary-700 transition cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          평가 저장
        </button>
      </div>
    );
  }

  // 녹화 컨트롤
  return (
    <div className="flex items-center gap-3 rounded-xl border border-black-20 bg-white px-4 py-3">
      {isRecording ? (
        <>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-error animate-pulse" />
            <span className="text-14-semibold text-black-80">{formatTime(elapsed)}</span>
          </div>
          <button
            type="button"
            onClick={handleStop}
            className="flex items-center gap-1.5 rounded-lg bg-error-50 border border-error-100 px-3 py-1.5 text-13-bold text-error-700 hover:bg-error-100 transition cursor-pointer"
          >
            <Square className="h-3.5 w-3.5" />
            종료
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleStart}
          disabled={!currentDomain}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-13-bold transition cursor-pointer",
            currentDomain
              ? "bg-success-50 border border-success text-success-700 hover:bg-success-100"
              : "bg-black-10 text-black-40 cursor-default",
          )}
        >
          <Play className="h-3.5 w-3.5" />
          세션 시작
        </button>
      )}
    </div>
  );
};

export default SessionRecorder;
