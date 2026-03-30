import { lazy, Suspense } from "react";
import type { OutletContext } from "@/features/editor/shared/MainSection";
import { useOutletContext } from "react-router-dom";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useTherapyStore } from "@/features/studio/store/useTherapyStore";
import { finishSession, saveSessionMessages, saveEvaluation } from "@/features/studio/data/sessionService";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";
import useToastStore from "@/shared/store/useToastStore";
import RecordingOverlay from "@/features/studio/components/RecordingOverlay";
import "@/features/editor/styles/editor-fonts.css";

const MainSection = lazy(
  () => import("@/features/editor/shared/MainSection"),
);
const SideBar = lazy(() => import("@/features/editor/sections/sidebar/SideBar"));

const DesignPage = () => {
  const { loadedDocumentId } = useOutletContext<OutletContext>();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);

  // studio 녹화 상태 (tester만)
  const showEvaluation = useTherapyStore((s) => s.showEvaluation);
  const recSessionId = useTherapyStore((s) => s.recSessionId);
  const recStartTime = useTherapyStore((s) => s.recStartTime);
  const messages = useTherapyStore((s) => s.messages);
  const selectedStudent = useTherapyStore((s) => s.selectedStudent);
  const dismissEvaluation = useTherapyStore((s) => s.dismissEvaluation);

  const isTester = role === "tester" || role === "admin";

  const handleSaveEvaluation = async (scores: Record<string, number>, notes: string) => {
    if (!user?.id || !recSessionId) return;
    const elapsed = Math.round((Date.now() - recStartTime) / 1000);
    const evaluation = { scores, notes: notes || undefined };
    try {
      await finishSession(recSessionId, evaluation, elapsed);
      await saveSessionMessages(user.id, recSessionId, messages);
      await saveEvaluation(user.id, recSessionId, selectedStudent?.studentId, evaluation);
      mp.track("치료 세션 평가 저장", { duration_seconds: elapsed });
      useToastStore.getState().showToast("세션이 저장되었어요!", "success");
    } catch (err) {
      captureSentryError(err, "DesignPage 평가 저장");
      useToastStore.getState().showToast("저장에 실패했어요.");
    }
    dismissEvaluation();
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Suspense fallback={<div className="w-20 shrink-0" />}>
        <SideBar />
      </Suspense>
      <Suspense fallback={<div className="flex-1" />}>
        <MainSection key={loadedDocumentId ?? "new"} />
      </Suspense>

      {/* tester 녹화 종료 후 평가 패널 — 캔버스 우측 하단 */}
      {isTester && showEvaluation && (
        <RecordingOverlay
          isRecording={false}
          onStop={() => {}}
          onSaveEvaluation={handleSaveEvaluation}
          onDismissEval={dismissEvaluation}
          showEvaluation={showEvaluation}
        />
      )}
    </div>
  );
};

export default DesignPage;
