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

const buildCharacterPrompt = (
  childInfo: ChildInfo,
  stylePrompt: string,
  customPrompt?: string,
): string => {
  const age = childInfo.age;
  const genderStr = childInfo.gender === "male" ? "boy" : childInfo.gender === "female" ? "girl" : "child";
  const isCustomStyle = customPrompt && !stylePrompt;

  if (isCustomStyle) {
    return `${customPrompt}

If the user did not describe a specific character, draw an 8-year-old child.

Rules:
- Single character, facing the viewer, friendly smile
- Pure white (#FFFFFF) background
- Empty hands — no objects, no props, no accessories unless the user described them
- No extra decorations, patterns, or elements unless the user described them`;
  }

  // 유저가 캐릭터를 직접 묘사한 경우: 유저 입력이 곧 캐릭터
  if (customPrompt) {
    return `${customPrompt}

Art style: ${stylePrompt}

Full body, front-facing, white background. One character only.`;
  }

  return `Create a single full-body character design of a ${age}-year-old Korean ${genderStr}.

Art style: ${stylePrompt}

The character should:
- Face the viewer in a friendly, neutral standing pose
- Show the full body from head to feet
- Have a warm, gentle smile

Background: pure white (#FFFFFF), no scenery.
This is a character reference sheet — one character only, no text or labels.`;
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

  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();
  // custom이면 유저 입력이 곧 그림체 — 프리셋 프롬프트 사용 안 함
  const stylePrompt = preset?.promptTemplate ?? "";
  const prompt = buildCharacterPrompt(childInfo, stylePrompt, customPrompt);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
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

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

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
