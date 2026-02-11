import * as Sentry from "@sentry/react";

declare const __SENTRY_RELEASE__: string | null | undefined;

export const initSentry = () => {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  const release =
    typeof __SENTRY_RELEASE__ === "string" && __SENTRY_RELEASE__.length > 0
      ? __SENTRY_RELEASE__
      : undefined;
  const isProd = import.meta.env.MODE === "production";
  const traceTargets: Array<string | RegExp> = [
    "https://muru.ai",
    "https://www.muru.ai",
    /localhost/,
  ];
  if (typeof window !== "undefined" && window.location?.origin) {
    traceTargets.unshift(window.location.origin);
  }
  const tracesSampleRate = isProd ? 0.15 : 1.0;
  const replaysSessionSampleRate = isProd ? 0.03 : 1.0;
  const replaysOnErrorSampleRate = isProd ? 0.3 : 1.0;

  Sentry.init({
    dsn: SENTRY_DSN,
    release,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.extraErrorDataIntegration(),
      Sentry.reportingObserverIntegration(),
      Sentry.replayIntegration(),
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],

    enableLogs: !isProd,

    tracesSampleRate,
    tracePropagationTargets: traceTargets,
    replaysSessionSampleRate,
    replaysOnErrorSampleRate,
  });
};
