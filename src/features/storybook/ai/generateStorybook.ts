/**
 * Gemini를 사용해 선택된 기획서를 바탕으로 최종 스토리북 텍스트를 다듬는 모듈.
 */
// import { GoogleGenAI } from "@google/genai";
import { captureSentryError } from "@/shared/utils/sentryUtils";

// import { sanitizeEnvKey } from "@/shared/utils/sanitizeEnvKey";
import { getGenAI } from "@/shared/api/genai";

import type {
  ChildInfo,
  StoryProposal,
  StoryBook,
  StoryBookPage,
  ArtStyleId,
  PageLayout,
} from "../model/storybookTypes";
import { STORYBOOK_PAGE_COUNT } from "../model/storybookTypes";
import { generateStoryImages } from "./generateStoryImages";

// const GOOGLE_API_KEY = sanitizeEnvKey(
//   import.meta.env.VITE_GOOGLE_API_KEY as string | undefined,
// );

const buildStorybookPrompt = (
  proposal: StoryProposal,
  childInfo: ChildInfo,
): string => {
  const pagesBlock = proposal.pages
    .map(
      (p) =>
        `${p.pageNumber}. [장면] ${p.sceneDescription} [텍스트] ${p.textContent}`,
    )
    .join("\n");

  return `당신은 아동 동화 작가입니다. 아래 기획서를 바탕으로 최종 그림책 텍스트를 완성해주세요.

[기획서]
제목: ${proposal.title}
요약: ${proposal.summary}
대상: ${childInfo.name} (${childInfo.age}세, ${childInfo.gender === "male" ? "남아" : "여아"})

[페이지별 초안]
${pagesBlock}

[작업 지시]
1. 각 페이지의 텍스트(text)를 자연스럽고 읽기 쉽게 다듬기 (60자 이내)
2. 장면 묘사(sceneDescription)를 그림 작가가 그릴 수 있도록 구체적으로 보강 (배경, 인물 표정, 색감, 구도 포함)
3. ${STORYBOOK_PAGE_COUNT}페이지 전체의 이야기 흐름이 자연스럽게 이어지도록 조정
4. 아이 이름(${childInfo.name})을 자연스럽게 사용
5. 각 페이지가 어떤 장소/배경에서 벌어지는지 판단하여 sceneGroup 번호를 부여하세요 (1부터 시작). 같은 장소에서 연속되는 페이지는 같은 sceneGroup을 가집니다.

JSON만 출력 (설명, 마크다운 없음):
[
  { "pageNumber": 1, "sceneDescription": "...", "text": "...", "sceneGroup": 1 },
  { "pageNumber": 2, "sceneDescription": "...", "text": "...", "sceneGroup": 1 }
]`;
};

type ParsedPage = {
  pageNumber: number;
  sceneDescription: string;
  text: string;
  sceneGroup?: number;
};

const parseStorybookResponse = (raw: string): ParsedPage[] => {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const valid = parsed.filter((item): item is ParsedPage => {
    if (typeof item !== "object" || item === null) return false;
    const rec = item as Record<string, unknown>;
    return (
      typeof rec.pageNumber === "number" &&
      typeof rec.sceneDescription === "string" &&
      typeof rec.text === "string"
    );
  });

  if (valid.length === 0) throw new Error("유효한 스토리북 데이터가 없습니다.");

  return valid
    .slice(0, STORYBOOK_PAGE_COUNT)
    .map((p, i) => ({ ...p, pageNumber: i + 1 }));
};

// AI 파싱 실패 시 proposal 원본으로 StoryBook 구성
const buildFallbackPages = (proposal: StoryProposal): StoryBookPage[] =>
  proposal.pages.slice(0, STORYBOOK_PAGE_COUNT).map((p, i) => ({
    id: crypto.randomUUID(),
    pageNumber: i + 1,
    imageUrl: "",
    text: p.textContent,
    sceneDescription: p.sceneDescription,
    sceneGroup: i + 1,
  }));

export const generateStorybook = async (
  proposal: StoryProposal,
  artStyle: ArtStyleId,
  layout: PageLayout,
  fontFamily: string,
  childInfo: ChildInfo,
  referenceImageBase64?: string,
  onImageProgress?: (current: number, total: number) => void,
): Promise<StoryBook> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }
  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildStorybookPrompt(proposal, childInfo),
    config: {
      responseModalities: ["Text"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini 응답이 없습니다.");

  const textPart = parts.find((part) => part.text);
  if (!textPart?.text) throw new Error("텍스트 응답이 없습니다.");

  let pages: StoryBookPage[];
  try {
    const parsed = parseStorybookResponse(textPart.text);
    pages = parsed.map((p, i) => ({
      id: crypto.randomUUID(),
      pageNumber: p.pageNumber,
      imageUrl: "",
      text: p.text,
      sceneDescription: p.sceneDescription,
      sceneGroup: typeof p.sceneGroup === "number" ? p.sceneGroup : i + 1,
    }));
  } catch {
    // 파싱 실패 시 원본 기획서 텍스트를 그대로 사용
    pages = buildFallbackPages(proposal);
  }

  try {
    const imageUrls = await generateStoryImages(pages, artStyle, layout, referenceImageBase64, onImageProgress);
    pages = pages.map((p, i) => ({ ...p, imageUrl: imageUrls[i] ?? "" }));
  } catch (error) {
    console.error("Story image generation failed:", error);
    captureSentryError(error, "스토리북 이미지 생성");
  }

  return {
    id: crypto.randomUUID(),
    title: proposal.title,
    childInfo,
    artStyle,
    layout,
    fontFamily,
    pages,
    createdAt: new Date().toISOString(),
  };
};
