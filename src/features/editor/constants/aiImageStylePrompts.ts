/**
 * AI 이미지 생성 스타일별 프롬프트 설정
 */

export type ImageStyle = "photo" | "illustration" | "lineart";

export type StyleOption = {
  id: ImageStyle;
  label: string;
  stylePrompt: string | null;
};

/**
 * 스타일별 프롬프트
 * - null인 경우 사용자 프롬프트만 사용
 * - 문자열인 경우 사용자 프롬프트 앞에 추가됨
 */
export const STYLE_PROMPTS: Record<ImageStyle, string | null> = {
  photo: `[Photo Style Prompt]
사용자의 요청을 아래 Default 규칙과 결합하여 영어 프롬프트를 작성하라.
유저가 직접 다른 값을 지정하지 않은 항목은 반드시 Default를 적용한다.

[Subject Rule — 최우선]
유저가 인물(사람, 아이, 선생님 등)을 명시하지 않은 경우, 인물을 절대 생성하지 않는다.
인물 관련 Default(인종, 표정, 비율)는 유저가 인물을 언급한 경우에만 적용한다.

[Default Values — 인물 언급 시에만]
- Subject: Korean person, East Asian, natural black hair, brown eyes
- Expression: calm, gentle, serene
- Proportions: realistic human proportions
- Clothing: always wearing full appropriate clothing (top and bottom), neat casual outfit. If user mentions only partial clothing (e.g. "red pants"), auto-complete the rest (e.g. add a simple white t-shirt). Exception: swimming, beach, bathing scenes only if user explicitly describes such context.

[Default Values — 항상 적용]
- Lighting: soft diffused light, even illumination, overcast sky feel, shadowless
- Quality: photorealistic, raw photo, 8K, best quality, sharp focus
- Texture: matte skin, natural grain, no glossy sheen
- Camera: 85mm portrait lens, f/2.8, medium shot, eye-level perspective
- Background: shallow depth of field, soft bokeh, decluttered modern Korean space
- Color: pastel color palette, neutral muted tones, low saturation
- Mood: calm, gentle, serene atmosphere
- Composition: clean composition, rule of thirds, maximum 5 main objects
- Restrictions: no text, no watermark, no complex patterns

[Override Rule]
유저가 명시적으로 다른 값을 입력한 경우(예: "햇빛 아래", "밝은 색상"),
해당 항목만 유저 값으로 교체하고 나머지는 Default를 유지한다.

[Output]
위 규칙을 적용한 영어 이미지 생성 프롬프트를 작성하라.
유저가 입력하지 않은 인물이나 요소는 추가하지 않는다.`,
  illustration: `[Style — 최우선]
cute children's character illustration, clean digital style, NOT a photograph,
kid-friendly cartoon, simple rounded shapes, flat cel-shading,
soft smooth coloring, no visible brushstrokes, no paint texture,
pastel warm tones, low saturation,
clean outlines, simple shapes, no busy textures, no fine realistic detail.
Absolutely NOT photorealistic. No camera effects. No film grain. No photo lighting.
Do NOT copy Disney, Pixar, Ghibli, or Sanrio style.
Style like Korean children's educational textbook illustrations.

[인물 규칙]
유저가 인물을 명시하지 않으면 인물을 생성하지 않는다.
인물 등장 시 아래 Default를 적용한다:
- cute Korean child character, East Asian, round face, black hair, brown eyes
- calm gentle smile, simple dot or line eyes
- slightly stylized but realistic proportions (no chibi, no big-head)
- 상/하의 모두 착용 (일부만 언급 시 나머지 보완. 수영/바닷가 예외)

[배경 규칙]
- 장소 미언급: pure flat white background (#FFFFFF), no background elements
- 장소 언급: simplified cute illustrated Korean setting, simple shapes, minimal detail

[금지 및 제한]
- 텍스트, 글자, 숫자, 라벨, 워터마크 절대 없음
- 유저가 언급하지 않은 인물, 소품, 장식, 스티커, 테두리 추가 금지
- 유저가 말한 요소만 포함한다

[Override]
유저가 명시적으로 다른 값을 지정하면 해당 항목만 교체.

[Output]
프롬프트 맨 앞에 "cute children's character illustration, clean digital style, NOT a photograph" 포함.
유저 입력을 영어로 변환하여 위 키워드와 결합한 프롬프트를 작성하라.`,
  lineart: `[Style — 최우선]
black and white coloring book page, clean line art only,
single isolated subject on empty white background,
pure black outlines (#000000) on pure white (#FFFFFF),
no color, no shading, no gray, no gradient, no hatching, no texture,
uniform bold smooth lines, vector style, printable coloring sheet,
NOT a photograph, NOT a color illustration, NOT a painting.

[격리 규칙 — 가장 중요]
유저가 입력한 대상만 그린다. 그 외 아무것도 넣지 않는다.
예시:
- "사과" → 사과 1개만. 접시, 테이블, 그림자, 나뭇잎 없음.
- "강아지" → 강아지 1마리만. 바닥, 풀, 뼈다귀, 밥그릇 없음.
- "아이가 양치질" → 아이 + 칫솔만. 세면대, 거울, 수건 없음.
배경은 100% 빈 흰색. 바닥선 없음. 테두리 없음.
텍스트, 글자, 숫자, 라벨, 워터마크 절대 없음.

[인물 규칙]
유저가 인물을 명시하지 않으면 인물을 생성하지 않는다.
인물 등장 시:
- Korean child or person, realistic proportions, simplified icon-like
- simple clear eyes, nose, mouth with minimal strokes
- 상/하의 모두 착용 (일부만 언급 시 나머지 보완. 수영/바닷가 예외)

[단순화 규칙]
- 대상 자체도 최대한 단순하게 — 선의 수를 최소화
- 내부 디테일 삭제 (옷 주름, 머리카락 결, 신발 끈)
- 외곽선 위주로만 표현, 불필요한 내부 선 제거

[Output]
프롬프트 맨 앞에 "black and white coloring book page, single isolated subject, clean line art only, no color, NOT a photograph" 포함.
유저 입력을 영어로 변환하여 위 키워드와 결합. 반드시 "isolated on white, nothing else in the scene" 포함.`,
};

/**
 * 스타일 옵션 목록
 */
export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "photo",
    label: "실사 이미지",
    stylePrompt: STYLE_PROMPTS.photo,
  },
  {
    id: "illustration",
    label: "그림, 일러스트",
    stylePrompt: STYLE_PROMPTS.illustration,
  },
  {
    id: "lineart",
    label: "흑백 선화",
    stylePrompt: STYLE_PROMPTS.lineart,
  },
];

/**
 * 스타일 ID로 옵션 찾기
 */
export const getStyleOption = (styleId: ImageStyle): StyleOption | undefined =>
  STYLE_OPTIONS.find((option) => option.id === styleId);

/**
 * 스타일 프롬프트와 사용자 프롬프트 결합
 */
export const buildPromptWithStyle = (
  styleId: ImageStyle,
  userPrompt: string,
): string => {
  const stylePrompt = STYLE_PROMPTS[styleId];
  const trimmedPrompt = userPrompt.trim();

  if (stylePrompt && trimmedPrompt) {
    return `${stylePrompt}, ${trimmedPrompt}`;
  }
  return trimmedPrompt;
};
