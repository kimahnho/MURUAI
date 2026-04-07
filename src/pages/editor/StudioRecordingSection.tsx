/**
 * Studio 녹화 평가 오버레이 — tester/admin 전용.
 * DesignPage에서 lazy import하여 일반 사용자에게는 로딩하지 않는다.
 */
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useTherapyStore } from "@/features/studio/store/useTherapyStore";
import { finishSession, saveSessionMessages, saveEvaluation } from "@/features/studio/data/sessionService";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";
import useToastStore from "@/shared/store/useToastStore";
import RecordingOverlay from "@/features/studio/components/RecordingOverlay";

const StudioRecordingSection = () => {
  const user = useAuthStore((s) => s.user);

  const showEvaluation = useTherapyStore((s) => s.showEvaluation);
  const recSessionId = useTherapyStore((s) => s.recSessionId);
  const recStartTime = useTherapyStore((s) => s.recStartTime);
  const messages = useTherapyStore((s) => s.messages);
  const selectedStudent = useTherapyStore((s) => s.selectedStudent);
  const dismissEvaluation = useTherapyStore((s) => s.dismissEvaluation);

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

  if (!showEvaluation) return null;

  return (
    <RecordingOverlay
      isRecording={false}
      onStop={() => {}}
      onSaveEvaluation={handleSaveEvaluation}
      onDismissEval={dismissEvaluation}
      showEvaluation={showEvaluation}
    />
  );
};

export default StudioRecordingSection;
