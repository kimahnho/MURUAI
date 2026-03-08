/**
 * 에디터 폰트 옵션 목록과 폰트 메타데이터 유틸을 제공하는 모듈.
 */
export type FontWeightOption = {
  label: string;
  value: number;
};

export type FontOption = {
  id: string;
  label: string;
  family: string;
  weights: FontWeightOption[];
};

// 숫자 weight를 사용자 표시용 한국어 라벨로 매핑한다.
const weightLabelMap: Record<number, string> = {
  400: "보통",
  700: "굵은",
  800: "매우 굵은",
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "pretendard",
    label: "Pretendard",
    family: "Pretendard",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
      { label: weightLabelMap[800], value: 800 },
    ],
  },
  {
    id: "koddi",
    label: "KoddiUDOnGothic",
    family: "KoddiUDOnGothic",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
      { label: weightLabelMap[800], value: 800 },
    ],
  },
  {
    id: "jayusigan",
    label: "학교안심 자유시간",
    family: "Hakgyoansim Jayusigan",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "poster",
    label: "학교안심 포스터",
    family: "Hakgyoansim Poster",
    weights: [{ label: weightLabelMap[700], value: 700 }],
  },
  {
    id: "paperlogy",
    label: "페이퍼로지",
    family: "Paperlogy",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
      { label: weightLabelMap[800], value: 800 },
    ],
  },
  {
    id: "kcc-hanbit",
    label: "KCC 한빛체",
    family: "KCC Hanbit",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "ocarina",
    label: "학교안심 오카리나",
    family: "Hakgyoansim Ocarina",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "nanum-square-neo",
    label: "나눔스퀘어 네오",
    family: "NanumSquareNeo",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
      { label: weightLabelMap[800], value: 800 },
    ],
  },
  {
    id: "nanum-barun-pen",
    label: "나눔바른 펜",
    family: "NanumBarunPen",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
    ],
  },
  {
    id: "eohangkkumigi",
    label: "학교안심 어항꾸미기",
    family: "Hakgyoansim Eohangkkumigi",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "saekyeonpil",
    label: "학교안심 색연필",
    family: "Hakgyoansim Saekyeonpil",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "susukkang",
    label: "학교안심 수수깡",
    family: "Hakgyoansim Susukkang",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "siganpyo",
    label: "학교안심 시간표",
    family: "Hakgyoansim Siganpyo",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "boardmarker",
    label: "학교안심 보드마카",
    family: "Hakgyoansim Boardmarker",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "allimjang",
    label: "학교안심 알림장",
    family: "Hakgyoansim Allimjang",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
    ],
  },
  {
    id: "tteokbokki",
    label: "학교안심 떡볶이",
    family: "Hakgyoansim Tteokbokki",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "dunggeunmiso",
    label: "학교안심 둥근미소",
    family: "Hakgyoansim Dunggeunmiso",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
    ],
  },
  {
    id: "keriskedu",
    label: "케리스 케듀체",
    family: "Keriskedu",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
    ],
  },
  {
    id: "bandal",
    label: "학교안심 반달체",
    family: "Hakgyoansim Bandal",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "badasseugi",
    label: "학교안심 받아쓰기",
    family: "Hakgyoansim Badasseugi",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
    ],
  },
  {
    id: "nalgae",
    label: "학교안심 날개",
    family: "Hakgyoansim Nalgae",
    weights: [{ label: weightLabelMap[400], value: 400 }],
  },
  {
    id: "kerisbaeum",
    label: "케리스 배움체",
    family: "Kerisbaeum",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
      { label: weightLabelMap[800], value: 800 },
    ],
  },
  {
    id: "goorm_sans",
    label: "구름 산스",
    family: "GoormSans",
    weights: [
      { label: weightLabelMap[400], value: 400 },
      { label: weightLabelMap[700], value: 700 },
    ],
  },
];

export const getFontLabel = (family: string) => {
  // 등록된 폰트가 아니면 원본 family를 반환해 커스텀 폰트도 안전하게 표시한다.
  const match = FONT_OPTIONS.find((font) => font.family === family);
  return match?.label ?? family;
};

// computed fontFamily 값(따옴표·쉼표 포함 가능)을 FONT_OPTIONS.family 키로 변환한다.
export const matchFontFamily = (computed: string): string => {
  const normalized = computed.replace(/["']/g, "").split(",")[0].trim();
  const match = FONT_OPTIONS.find(
    (font) => font.family.toLowerCase() === normalized.toLowerCase(),
  );
  return match?.family ?? normalized;
};

export const normalizeFontWeight = (
  value: number | "normal" | "bold" | undefined,
) => {
  // CSS 문자열/숫자 표현을 숫자 weight로 정규화해 비교 로직을 단순화한다.
  if (typeof value === "number") return value;
  if (value === "bold") return 700;
  return 400;
};
