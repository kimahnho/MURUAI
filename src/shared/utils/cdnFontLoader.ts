/**
 * CDN 폰트를 동적으로 로드하는 싱글톤 모듈.
 * FontFace API + <style> 태그 이중 주입으로 에디터 렌더링과 html-to-image PDF 출력 모두 지원.
 */
import { CDN_FONT_ENTRIES } from "./cdnFontRegistry";
import type { CdnFontEntry, CdnFontFile } from "./cdnFontRegistry";

const loadedFonts = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();

// CDN 폰트 엔트리를 family 키로 빠르게 조회하기 위한 맵
const cdnFontMap = new Map<string, CdnFontEntry>(
  CDN_FONT_ENTRIES.map((e) => [e.family, e]),
);

function injectFontFaceStyle(family: string, file: CdnFontFile): void {
  const style = document.createElement("style");
  style.dataset.cdnFont = family;
  style.textContent = `
    @font-face {
      font-family: "${family}";
      src: url("${file.url}") format("${file.format}");
      font-weight: ${file.weight};
      font-style: normal;
      font-display: swap;
    }
  `;
  document.head.appendChild(style);
}

async function loadSingleFontFace(
  family: string,
  file: CdnFontFile,
): Promise<void> {
  const key = `${family}:${file.weight}`;
  if (loadedFonts.has(key)) return;
  if (loadingPromises.has(key)) return loadingPromises.get(key)!;

  const promise = (async () => {
    const fontFace = new FontFace(family, `url(${file.url})`, {
      weight: String(file.weight),
      style: "normal",
      display: "swap",
    });
    await fontFace.load();
    document.fonts.add(fontFace);
    injectFontFaceStyle(family, file);
    loadedFonts.add(key);
  })();

  loadingPromises.set(key, promise);
  try {
    await promise;
  } finally {
    loadingPromises.delete(key);
  }
}

/** CDN 폰트를 동적으로 로드한다. weight 미지정 시 모든 weight를 로드한다. */
export async function loadCdnFont(
  family: string,
  weight?: number,
): Promise<void> {
  const entry = cdnFontMap.get(family);
  if (!entry) return;

  const filesToLoad =
    weight != null
      ? entry.files.filter((f) => f.weight === weight)
      : entry.files;

  await Promise.all(
    filesToLoad.map((file) => loadSingleFontFace(entry.family, file)),
  );
}

/** CDN 폰트 여부를 판별한다. */
export function isCdnFont(family: string): boolean {
  return cdnFontMap.has(family);
}

/** 해당 폰트(+ weight)가 이미 로드되었는지 확인한다. */
export function isFontLoaded(family: string, weight?: number): boolean {
  if (weight != null) return loadedFonts.has(`${family}:${weight}`);
  const entry = cdnFontMap.get(family);
  return (
    entry?.files.some((f) => loadedFonts.has(`${family}:${f.weight}`)) ?? false
  );
}
