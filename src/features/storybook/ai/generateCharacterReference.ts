/**
 * 선택한 그림체 스타일로 캐릭터 레퍼런스 이미지를 AI 생성하는 모듈.
 * 생성된 이미지는 base64로 반환되어 이후 스토리 이미지 생성 시 레퍼런스로 재활용된다.
 */
// import { GoogleGenAI } from "@google/genai";

// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";

import type { ArtStyleId, ChildInfo } from "../model/storybookTypes";
import { convertToWebP } from "@/shared/utils/imageConvert";
import { ART_STYLE_PRESETS } from "../data/artStylePresets";

// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/** 프리셋 미리보기 이미지를 fetch → base64로 변환 */
const loadPreviewImageAsBase64 = async (previewPath: string): Promise<string | null> => {
  try {
    const res = await fetch(previewPath);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // "data:image/webp;base64,..." → base64 부분만 추출
        resolve(result.split(",")[1] ?? null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const buildCharacterPrompt = (
  childInfo: ChildInfo,
  stylePrompt: string,
  customPrompt?: string,
): string => {
  const age = childInfo.age;
  const genderStr = childInfo.gender === "male" ? "boy" : childInfo.gender === "female" ? "girl" : "child";

  // 커스텀 그림체 (프리셋 없음, 유저 입력만)
  if (customPrompt && !stylePrompt) {
    return `Draw a ${age}-year-old Korean ${genderStr} for a children's picture book.

${customPrompt}

The child wears a plain single-color t-shirt and simple pants. Round face, big gentle eyes, soft smile.
Whole body visible from head to toes, standing naturally, looking at the viewer.
Solid white background. One character only.`;
  }

  // 유저가 캐릭터를 직접 묘사 + 프리셋 그림체
  if (customPrompt) {
    return `Draw a character for a children's picture book.

${customPrompt}

Art style: ${stylePrompt}
Whole body visible from head to toes, looking at the viewer.
Solid white background. One character only.`;
  }

  // 기본: 프리셋 그림체로 아동 캐릭터 생성
  return `Draw a ${age}-year-old Korean ${genderStr} for a children's picture book.

The child has a round, soft face with big expressive eyes and a gentle smile.
Simple hairstyle, natural black hair.
Wearing a plain single-color t-shirt and simple pants — no patterns, no logos, no accessories.
The body proportions are slightly chubby and cute, like a real young child.
Arms relaxed at the sides, standing naturally, looking straight at the viewer.

Art style: ${stylePrompt}
Solid white background. One character only.`;
};

/**
 * 그림체 + 아동 정보를 기반으로 캐릭터 레퍼런스 이미지를 생성한다.
 * @returns base64 인코딩된 이미지 데이터
 */
export const generateCharacterReference = async (
  artStyleId: ArtStyleId,
  childInfo: ChildInfo,
  customPrompt?: string,
): Promise<string> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }

  const preset = ART_STYLE_PRESETS.find((p) => p.id === artStyleId);
  if (!preset && !customPrompt) {
    throw new Error(`Unknown art style: ${artStyleId}`);
  }

  const ai = getGenAI();
  const stylePrompt = preset?.promptTemplate ?? "";
  const prompt = buildCharacterPrompt(childInfo, stylePrompt, customPrompt);

  // 프리셋 미리보기 이미지를 레퍼런스로 첨부 — 그림체 일관성 향상
  const refBase64 = preset?.previewImage
    ? await loadPreviewImageAsBase64(preset.previewImage)
    : null;

  const contents: unknown = refBase64
    ? [
        { inlineData: { mimeType: "image/webp" as const, data: refBase64 } },
        { text: `The image above is the target art style reference. Draw a NEW character in this EXACT art style.\n\n${prompt}` },
      ]
    : prompt;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents,
      config: {
        responseModalities: ["Text", "Image"],
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((part) => part.inlineData);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
  }

  throw new Error("캐릭터 이미지 생성에 실패했습니다.");
};

/**
 * 주인공 레퍼런스를 앵커로 동일 그림체의 서브캐릭터 이미지를 생성한다.
 * @param mainCharacterBase64 주인공 레퍼런스 이미지 (base64)
 * @param appearance 서브캐릭터 외형 묘사
 * @param personality 서브캐릭터 성격 한 줄
 * @returns base64 인코딩된 서브캐릭터 이미지
 */
export const generateSubCharacterReference = async (
  mainCharacterBase64: string,
  appearance: string,
  personality: string,
): Promise<string> => {
  const ai = getGenAI();
  // 레퍼런스 이미지를 WebP로 변환하여 API 전송 크기 줄이기 (413 방지)
  const { data: compressedRef } = await convertToWebP(mainCharacterBase64);

  const prompt = `Draw a NEW character in the EXACT SAME art style as the reference image above.

This is a DIFFERENT character from the one in the reference. Do NOT copy the reference character.

Character description:
- Appearance: ${appearance}
- Personality: ${personality}

Rules:
- Match the exact same art style, line weight, color palette, and rendering technique as the reference image.
- Single character, full body from head to feet, facing the viewer.
- Friendly, natural pose that reflects the character's personality.
- Pure white (#FFFFFF) background, no scenery, no text, no labels.
- Do NOT draw the character from the reference image. Draw only the NEW character described above.`;

  // 서브캐릭터는 최대 2회 시도 (타임아웃 방지, 실패 시 텍스트 묘사로 폴백)
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));

    const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      { inlineData: { mimeType: "image/webp" as const, data: compressedRef } },
      { text: prompt },
    ],
    config: {
      responseModalities: ["Text", "Image"],
      imageConfig: { aspectRatio: "1:1" },
    },
  });

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((part) => part.inlineData);
    if (imagePart?.inlineData?.data) return imagePart.inlineData.data;
  }

  throw new Error("서브캐릭터 이미지 생성에 실패했습니다.");
};
