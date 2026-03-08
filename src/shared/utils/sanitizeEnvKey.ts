/**
 * 환경 변수 값에서 복사/붙여넣기 아티팩트(BOM, 인용부호 등)를 제거하는 유틸리티.
 */
export const sanitizeEnvKey = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const normalized = value
    .normalize("NFKC")
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
    .trim();
  const sanitized = normalized.replace(/^["'""'']+|["'""'']+$/g, "").trim();
  return sanitized.length > 0 ? sanitized : undefined;
};
