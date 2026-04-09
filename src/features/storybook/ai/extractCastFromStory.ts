/**
 * 스토리 기획서에서 서브캐릭터를 자동 추출하는 캐스팅 분석 모듈.
 * 주인공 외 반복 등장하는 캐릭터를 파악하고 외형/성격/등장 페이지를 매핑한다.
 */
import { getGenAI } from "@/shared/api/genai";
import { captureSentryError } from "@/shared/utils/sentryUtils";

import type { CastingNote, CastCharacter, StoryPageOutline } from "../model/storybookTypes";

const MAX_SUB_CHARACTERS = 2;

const buildCastingPrompt = (
  pages: StoryPageOutline[],
  protagonistName: string,
): string => {
  const scenesBlock = pages
    .map((p) => `${p.pageNumber}. ${p.sceneDescription}`)
    .join("\n");

  return `You are a casting director for a children's picture book.

Read the 10-page story below and identify recurring characters OTHER THAN the protagonist (${protagonistName}).

[Story Scenes]
${scenesBlock}

Rules:
- Exclude the protagonist (${protagonistName}).
- Only include characters who appear on 2 or more pages, or who are essential to the plot.
- Ignore background extras (passersby, shopkeepers seen once, etc.).
- Return at most ${MAX_SUB_CHARACTERS} characters, prioritized by frequency and story importance.
- For each character, describe their appearance as if briefing an illustrator — be specific about hair, build, clothing, and distinguishing features. Make the description vivid and consistent with the story's tone.
- personality should capture how the character acts and feels in one short phrase.

JSON only (no explanation):
{
  "characters": [
    {
      "role": "friend",
      "appearance": "A girl with curly auburn hair and freckles, wearing a yellow dress and red sneakers",
      "personality": "cheerful and adventurous",
      "pages": [1, 3, 5, 7, 9]
    }
  ]
}

If no recurring sub-characters exist, return: { "characters": [] }`;
};

const parseCastingResponse = (raw: string): CastCharacter[] => {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as { characters?: unknown[] };
  if (!Array.isArray(parsed.characters)) return [];

  return parsed.characters
    .filter((item): item is CastCharacter => {
      if (typeof item !== "object" || item === null) return false;
      const rec = item as Record<string, unknown>;
      return (
        typeof rec.role === "string" &&
        typeof rec.appearance === "string" &&
        typeof rec.personality === "string" &&
        Array.isArray(rec.pages)
      );
    })
    .slice(0, MAX_SUB_CHARACTERS)
    .map((c) => ({
      role: c.role,
      appearance: c.appearance,
      personality: c.personality,
      pages: c.pages.filter((p): p is number => typeof p === "number"),
    }));
};

/**
 * 스토리 기획서를 분석하여 서브캐릭터 캐스팅 노트를 생성한다.
 * 실패해도 에러를 던지지 않고 빈 캐스팅 노트를 반환한다 (비차단).
 */
export const extractCastFromStory = async (
  pages: StoryPageOutline[],
  protagonistName: string,
): Promise<CastingNote> => {
  try {
    const ai = getGenAI();
    const prompt = buildCastingPrompt(pages, protagonistName);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: prompt,
      config: { responseModalities: ["Text"] },
    });

    const text = response.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    if (!text) return { characters: [] };

    const characters = parseCastingResponse(text);
    return { characters };
  } catch (error) {
    console.warn("캐스팅 분석 실패 — 서브캐릭터 없이 진행", error);
    captureSentryError(error, "스토리북 캐스팅 분석");
    return { characters: [] };
  }
};
