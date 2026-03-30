/**
 * 녹화 상태 오버레이 — 상단 중앙 배너 + 우측 하단 평가 패널.
 * framer-motion으로 등장/퇴장 애니메이션 처리.
 */
import { useState, useEffect, useRef } from "react";
import { Square, Star, Save, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

interface RecordingOverlayProps {
  isRecording: boolean;
  onStop: () => void;
  onSaveEvaluation: (scores: Record<string, number>, notes: string) => Promise<void>;
  onDismissEval: () => void;
  showEvaluation: boolean;
}

const RecordingOverlay = ({
  isRecording,
  onStop,
  onSaveEvaluation,
  onDismissEval,
  showEvaluation,
}: RecordingOverlayProps) => {
  const [elapsed, setElapsed] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [evalNotes, setEvalNotes] = useState("");
  const [evalScores, setEvalScores] = useState<Record<string, number>>({
    participation: 0,
    accuracy: 0,
    independence: 0,
  });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRecording) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    await onSaveEvaluation(evalScores, evalNotes);
    setIsSaving(false);
    setEvalNotes("");
    setEvalScores({ participation: 0, accuracy: 0, independence: 0 });
  };

  const SCORE_LABELS: Record<string, string> = {
    participation: "참여도",
    accuracy: "정확도",
    independence: "독립수행",
  };

  return (
    <>
      {/* 상단 중앙 녹화 배너 */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            key="rec-banner"
            initial={{ opacity: 0, scale: 0.8, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2.5 rounded-full bg-black-90 pl-3.5 pr-2 py-1.5 shadow-lg">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.2, ease: "easeInOut" }}
                className="h-2 w-2 rounded-full bg-error"
              />
              <span className="text-13-bold text-white-100 tabular-nums">
                {formatTime(elapsed)}
              </span>
              <button
                type="button"
                onClick={onStop}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-12-semibold text-white-100 hover:opacity-90 transition cursor-pointer"
                style={{ backgroundColor: "#ef4444" }}
              >
                <Square className="h-3 w-3" />
                종료
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 우측 하단 평가 패널 */}
      <AnimatePresence>
        {showEvaluation && (
          <motion.div
            key="eval-panel"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="flex flex-col gap-3 w-72 rounded-2xl border border-black-20 bg-white p-4 shadow-xl">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <span className="text-14-semibold text-black-80">세션 평가</span>
                <button
                  type="button"
                  onClick={onDismissEval}
                  className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-black-10 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 text-black-50" />
                </button>
              </div>

              {/* 별점 */}
              {Object.entries(evalScores).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-13-regular text-black-70">
                    {SCORE_LABELS[key] ?? key}
                  </span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setEvalScores((prev) => ({ ...prev, [key]: score }))}
                        className="cursor-pointer"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 transition",
                            score <= value ? "fill-warning text-warning" : "text-black-40",
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
                placeholder="한줄 메모 (선택)"
                rows={1}
                className="rounded-lg border border-black-20 px-2.5 py-1.5 text-13-regular text-black-80 placeholder:text-black-40 outline-none focus:border-primary resize-none"
              />

              {/* 저장 */}
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-13-bold text-white-100 hover:bg-primary-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                저장
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default RecordingOverlay;
