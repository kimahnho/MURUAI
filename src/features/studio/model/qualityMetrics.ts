/**
 * 품질 메트릭 기록 — 파이프라인 이벤트를 로깅한다.
 */

export function recordMetric(event: string, data?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.debug(`[studio:metric] ${event}`, data);
  }
}
