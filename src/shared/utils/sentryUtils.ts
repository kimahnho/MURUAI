/**
 * Supabase 에러 객체를 Error 인스턴스로 변환하여 Sentry에 전달하는 유틸.
 * Supabase `.error`는 일반 객체({ code, details, hint, message })라
 * Sentry.captureException에 직접 넘기면 스택 트레이스가 생성되지 않는다.
 */
import * as Sentry from "@sentry/react";

export const captureSentryError = (
  err: unknown,
  context?: string,
): void => {
  if (err instanceof Error) {
    Sentry.captureException(err);
    return;
  }
  const message =
    typeof err === "object" && err !== null && "message" in err
      ? String((err as { message: unknown }).message)
      : "Unknown error";
  const error = new Error(context ? `[${context}] ${message}` : message);
  Sentry.captureException(error);
};
