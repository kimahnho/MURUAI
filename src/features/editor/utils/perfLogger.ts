const isPerfLogEnabled =
  import.meta.env.DEV || import.meta.env.VITE_EDITOR_PERF_LOG === "true";

const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

export const measurePerf = async <T>(
  label: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T> => {
  const start = now();
  try {
    return await fn();
  } finally {
    if (isPerfLogEnabled) {
      const durationMs = Math.round((now() - start) * 10) / 10;
      console.log(`[editor-perf] ${label}`, {
        durationMs,
        ...(meta ?? {}),
      });
    }
  }
};

export const logPerf = (label: string, meta?: Record<string, unknown>) => {
  if (!isPerfLogEnabled) return;
  console.log(`[editor-perf] ${label}`, meta ?? {});
};
