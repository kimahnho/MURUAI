/**
 * AI 파이프라인 전체 과정 로그 수집기.
 * 위자드 진행 중 메모리에 스텝을 모으고, 완료/이탈 시 1행으로 DB에 저장.
 */
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";

type PipelineStep = {
  step: string;
  at: string;
  data: Record<string, unknown>;
};

type PipelineSummary = {
  totalDurationMs?: number;
  editedPages?: number[];
  regenerationCount?: number;
  [key: string]: unknown;
};

class AiPipelineLogger {
  private feature: string = "";
  private generationLogId: string | null = null;
  private steps: PipelineStep[] = [];
  private startTime: number = 0;
  private flushed = false;

  /** 새 파이프라인 세션 시작 */
  start(feature: string, generationLogId?: string) {
    this.feature = feature;
    this.generationLogId = generationLogId ?? null;
    this.steps = [];
    this.startTime = Date.now();
    this.flushed = false;
  }

  /** 스텝 기록 (메모리에 추가) */
  addStep(step: string, data: Record<string, unknown> = {}) {
    this.steps.push({
      step,
      at: new Date().toISOString(),
      data,
    });
  }

  /** generation_log_id를 나중에 설정 (생성 후 ID를 받는 경우) */
  setGenerationLogId(id: string) {
    this.generationLogId = id;
  }

  /** DB에 1행으로 저장 */
  async flush(summary?: PipelineSummary) {
    if (this.flushed || this.steps.length === 0) return;
    this.flushed = true;

    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const finalSummary: PipelineSummary = {
      totalDurationMs: Date.now() - this.startTime,
      ...summary,
    };

    try {
      const { error } = await supabase.from("ai_pipeline_logs").insert({
        user_id: userId,
        generation_log_id: this.generationLogId,
        feature: this.feature,
        steps: this.steps,
        summary: finalSummary,
      });
      if (error) console.warn("ai_pipeline_logs insert failed", error);
    } catch (e) {
      console.warn("ai_pipeline_logs error", e);
    }
  }

  /** 현재 스텝 수 */
  get stepCount() {
    return this.steps.length;
  }

  /** 진행 중인지 */
  get isActive() {
    return this.steps.length > 0 && !this.flushed;
  }
}

/** 싱글턴 — 앱 전체에서 1개 인스턴스 공유 */
export const aiPipelineLogger = new AiPipelineLogger();
