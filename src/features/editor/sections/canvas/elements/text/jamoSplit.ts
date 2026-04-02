/**
 * 한글 자모 분해 유틸리티.
 *
 * 두 가지 모드:
 *
 * 1. Conjoining Jamo (합자 모드)
 *    - "고"를 U+1100 + U+1169로 분해 → 브라우저가 합자하여 원본과 동일하게 보임
 *    - 각 자모가 별도 <span>이므로 개별 색상 적용 가능
 *    - 모든 한글 폰트에서 동작
 *
 * 2. Split Jamo (분리 모드)
 *    - "고"를 ㄱ + ㅗ 로 풀어서 각각 위치 배치
 *    - 자모가 시각적으로 분리되어 보임 (조음 학습지용)
 *    - 목표 음소를 직관적으로 인식 가능
 *    - 폰트에 따라 미세 조정 필요
 *
 * 용도: 조음음운 치료 학습지에서 목표 음소 강조.
 */

// ─── 자모 테이블 ───

const CHOSEONG_BASE = 0x1100;
const JUNGSEONG_BASE = 0x1161;
const JONGSEONG_BASE = 0x11A8;

const CHO = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];
const JUNG = [
  "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ",
  "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ",
];
const JONG = [
  "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
  "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

// ─── 타입 ───

export type JamoRole = "initial" | "medial" | "final";
export type VowelType = "vertical" | "horizontal" | "complex";

export interface JamoPart {
  /** Conjoining Jamo 문자 (U+1100~U+11FF) */
  conjoining: string;
  /** 호환 자모 (ㄱ, ㅏ 등) */
  compat: string;
  role: JamoRole;
}

export interface DecomposedSyllable {
  original: string;
  isHangul: boolean;
  parts: JamoPart[];
  vowelType?: VowelType;
}

// ─── 분해 ───

function getVowelType(medialIdx: number): VowelType {
  if (new Set([0, 1, 2, 3, 4, 5, 6, 7, 20]).has(medialIdx)) return "vertical";
  if (new Set([8, 11, 12, 17, 18]).has(medialIdx)) return "horizontal";
  return "complex";
}

export function decomposeSyllable(char: string): DecomposedSyllable {
  const code = char.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) {
    return { original: char, isHangul: false, parts: [] };
  }

  const offset = code - 0xAC00;
  const choIdx = Math.floor(offset / (21 * 28));
  const jungIdx = Math.floor((offset % (21 * 28)) / 28);
  const jongIdx = offset % 28;

  const parts: JamoPart[] = [
    { conjoining: String.fromCharCode(CHOSEONG_BASE + choIdx), compat: CHO[choIdx], role: "initial" },
    { conjoining: String.fromCharCode(JUNGSEONG_BASE + jungIdx), compat: JUNG[jungIdx], role: "medial" },
  ];
  if (jongIdx > 0) {
    parts.push({ conjoining: String.fromCharCode(JONGSEONG_BASE + jongIdx - 1), compat: JONG[jongIdx], role: "final" });
  }

  return { original: char, isHangul: true, parts, vowelType: getVowelType(jungIdx) };
}

export function decomposeText(text: string): DecomposedSyllable[] {
  return Array.from(text).map(decomposeSyllable);
}

// ═══════════════════════════════════════════════════════
//  MODE 1: Conjoining Jamo (합자 — 원본과 동일하게 보임)
// ═══════════════════════════════════════════════════════

/**
 * 합자 모드: 텍스트를 Conjoining Jamo HTML로 변환.
 * 브라우저가 합자 처리하여 원본과 동일하게 보이되, 자모별 색상 적용 가능.
 */
export function highlightJamoConjoining(
  text: string,
  highlights: Record<string, string>,
): string {
  return decomposeText(text).map((syl) => {
    if (!syl.isHangul) {
      const c = highlights[syl.original];
      return c ? `<span style="color:${c}">${syl.original}</span>` : syl.original;
    }
    return syl.parts.map((p) => {
      const c = highlights[p.compat];
      return c ? `<span style="color:${c}">${p.conjoining}</span>` : `<span>${p.conjoining}</span>`;
    }).join("");
  }).join("");
}

// ═══════════════════════════════════════════════════════
//  MODE 2: Split Jamo (분리 — 자모가 풀어져서 보임)
// ═══════════════════════════════════════════════════════

/** 분리 모드 위치 파라미터 (Apple SD Gothic Neo 기준, scale 포함) */
interface JamoPosition {
  x: number;   // em 비율 (0~1)
  y: number;
  fs: number;  // font-size 비율
  sx: number;  // scaleX
  sy: number;  // scaleY
}

interface SyllableLayout {
  i: JamoPosition;  // 초성
  m: JamoPosition;  // 중성
  f?: JamoPosition; // 종성 (선택)
}

const SPLIT_LAYOUTS: Record<VowelType, { noFinal: SyllableLayout; withFinal: SyllableLayout }> = {
  vertical: {
    noFinal: {
      i: { x: -.02, y: .06, fs: .65, sx: .72, sy: .82 },
      m: { x: .38, y: -.02, fs: .78, sx: .72, sy: .92 },
    },
    withFinal: {
      i: { x: 0, y: -.04, fs: .52, sx: .72, sy: .68 },
      m: { x: .36, y: -.08, fs: .62, sx: .68, sy: .72 },
      f: { x: .06, y: .48, fs: .52, sx: .80, sy: .60 },
    },
  },
  horizontal: {
    noFinal: {
      i: { x: .08, y: -.08, fs: .60, sx: .80, sy: .68 },
      m: { x: .02, y: .38, fs: .58, sx: .88, sy: .62 },
    },
    withFinal: {
      i: { x: .10, y: -.10, fs: .50, sx: .78, sy: .58 },
      m: { x: .04, y: .26, fs: .48, sx: .86, sy: .52 },
      f: { x: .08, y: .56, fs: .46, sx: .80, sy: .52 },
    },
  },
  complex: {
    noFinal: {
      i: { x: -.02, y: -.04, fs: .52, sx: .72, sy: .68 },
      m: { x: .20, y: 0, fs: .68, sx: .78, sy: .88 },
    },
    withFinal: {
      i: { x: 0, y: -.08, fs: .44, sx: .70, sy: .58 },
      m: { x: .18, y: -.04, fs: .58, sx: .74, sy: .72 },
      f: { x: .06, y: .52, fs: .44, sx: .80, sy: .54 },
    },
  },
};

/**
 * 분리 모드: 단일 음절을 자모 분해 HTML로 변환.
 * 각 자모가 절대 위치로 배치되고, 목표 자모에 색상 적용.
 *
 * @param sizePx - 음절 크기 (px)
 */
export function renderSplitSyllable(
  char: string,
  highlights: Record<string, string> = {},
  sizePx = 64,
): string {
  const syl = decomposeSyllable(char);

  if (!syl.isHangul) {
    const color = highlights[char] ?? "#222";
    return `<span style="display:inline-block;width:${sizePx}px;height:${sizePx}px;font-size:${sizePx}px;line-height:1;text-align:center;color:${color}">${char}</span>`;
  }

  const vt = syl.vowelType ?? "vertical";
  const hasFinal = syl.parts.length > 2;
  const layout = SPLIT_LAYOUTS[vt][hasFinal ? "withFinal" : "noFinal"];

  const posMap: JamoPosition[] = [layout.i, layout.m];
  if (hasFinal && layout.f) posMap.push(layout.f);

  const spans = syl.parts.map((p, i) => {
    const pos = posMap[i];
    const color = highlights[p.compat] ?? "#222";
    return `<span style="
      position:absolute;
      left:${pos.x * sizePx}px;
      top:${pos.y * sizePx}px;
      font-size:${pos.fs * sizePx}px;
      transform:scale(${pos.sx},${pos.sy});
      transform-origin:left top;
      color:${color};
      font-weight:700;
      line-height:1;
    ">${p.compat}</span>`;
  }).join("");

  return `<span style="
    display:inline-block;
    position:relative;
    width:${sizePx * 0.76}px;
    height:${sizePx * 0.98}px;
  ">${spans}</span>`;
}

/**
 * 분리 모드: 단어 전체를 자모 분해 HTML로 변환.
 */
export function renderSplitWord(
  word: string,
  highlights: Record<string, string> = {},
  sizePx = 64,
): string {
  return Array.from(word).map((c) => renderSplitSyllable(c, highlights, sizePx)).join("");
}

// ─── 복원 ───

/** Conjoining Jamo HTML → 완성형 텍스트 복원 */
export function restoreFromConjoining(html: string): string {
  const text = html.replace(/<[^>]*>/g, "");
  return text.replace(
    /[\u1100-\u1112][\u1161-\u1175][\u11A8-\u11C2]?/g,
    (match) => {
      const cho = match.charCodeAt(0) - CHOSEONG_BASE;
      const jung = match.charCodeAt(1) - JUNGSEONG_BASE;
      const jong = match.length > 2 ? match.charCodeAt(2) - JONGSEONG_BASE + 1 : 0;
      return String.fromCharCode(0xAC00 + cho * 21 * 28 + jung * 28 + jong);
    },
  );
}
