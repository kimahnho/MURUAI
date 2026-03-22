/**
 * 선택한 그림체 스타일로 캐릭터 레퍼런스 이미지를 AI 생성하는 모듈.
 * 생성된 이미지는 base64로 반환되어 이후 스토리 이미지 생성 시 레퍼런스로 재활용된다.
 */
// import { GoogleGenAI } from "@google/genai";

// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";

import type { ArtStyleId, ChildInfo } from "../model/storybookTypes";
import { ART_STYLE_PRESETS } from "../data/artStylePresets";

// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const buildCharacterPrompt = (
  childInfo: ChildInfo,
  stylePrompt: string,
): string => {
  const gender = childInfo.gender === "male" ? "boy" : "girl";
  const age = childInfo.age;

  return `Create a single full-body character design of a ${age}-year-old Korean ${gender}.

${stylePrompt}

The character should:
- Face the viewer in a friendly, neutral standing pose
- Wear casual everyday Korean children's clothing
- Have a warm, gentle smile
- Be centered on a clean white background
- Show the full body from head to feet

This is a character reference sheet — only one character, no background scene, no text or labels.`;
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
  if (!preset) {
    throw new Error(`Unknown art style: ${artStyleId}`);
  }

  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();
  const basePrompt = buildCharacterPrompt(childInfo, preset.promptTemplate);
  const prompt = customPrompt
    ? `${basePrompt}\n\nAdditional character details requested by the user:\n${customPrompt}`
    : basePrompt;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
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
