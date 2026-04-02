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
 * - 문자열인 경우 사용자 프롬프트 뒤에 스타일 지시로 추가됨
 */
export const STYLE_PROMPTS: Record<ImageStyle, string | null> = {
  photo: `[Defaults — apply only if not specified by the user]
Photorealistic, raw photo, 8K, best quality, sharp focus.
Soft diffused light, even illumination, overcast sky feel, shadowless.
Matte skin, natural grain, no glossy sheen.
85mm portrait lens, f/2.8, medium shot, eye-level perspective.
Shallow depth of field, soft bokeh, decluttered modern Korean space.
Pastel color palette, neutral muted tones, low saturation.
Calm, gentle, serene atmosphere. Clean composition, rule of thirds, maximum 5 main objects.
[If person is mentioned] Korean, East Asian, natural black hair, brown eyes, calm gentle expression, realistic proportions, always wearing full appropriate clothing, neat casual outfit.
[If no person is mentioned] Do NOT add any person or human figure.
[MUST] No text, no watermark, no complex patterns.`,
  illustration: `[Defaults — apply only if not specified by the user]
Cute children's character illustration, clean digital style, NOT a photograph.
Kid-friendly cartoon, simple rounded shapes, flat cel-shading, soft smooth coloring.
No visible brushstrokes, no paint texture. Pastel warm tones, low saturation.
Clean outlines, simple shapes, no busy textures, no fine realistic detail.
Absolutely NOT photorealistic. No camera effects. No film grain. No photo lighting.
Style like Korean children's educational textbook illustrations.
[If person is mentioned] Cute Korean child, East Asian, round face, black hair, brown eyes, calm gentle smile, simple dot or line eyes, slightly stylized but realistic proportions, always wearing full appropriate clothing.
[If no person is mentioned] Do NOT add any person or human figure.
[If no place is mentioned] Pure flat white background, no background elements.
[If place is mentioned] Simplified cute illustrated Korean setting, simple shapes, minimal detail.
[MUST] No text, no letters, no numbers, no labels, no watermark. Only include what is described.`,
  lineart: `[Defaults — apply only if not specified by the user]
Black and white coloring book page, clean line art only.
Single isolated subject on empty white background.
Pure black outlines on pure white, no color, no shading, no gray, no gradient, no hatching, no texture.
Uniform bold smooth lines, vector style, printable coloring sheet.
NOT a photograph, NOT a color illustration, NOT a painting.
Minimal detail — outline only, no internal detail like wrinkles, hair strands, or shoelaces.
[If person is mentioned] Korean child or person, realistic proportions, simplified icon-like, simple clear eyes nose mouth with minimal strokes, always wearing full appropriate clothing.
[If no person is mentioned] Do NOT add any person or human figure.
[MUST] Only draw what is described, nothing else. No background, no floor line, no border. No text, no letters, no numbers, no labels, no watermark. Isolated on white, nothing else in the scene.`,
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
    return `${trimmedPrompt}\n\n${stylePrompt}`;
  }
  return trimmedPrompt;
};
