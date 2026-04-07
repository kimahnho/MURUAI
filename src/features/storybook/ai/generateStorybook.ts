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
  topic?: string,
): string => {
  const pagesBlock = proposal.pages
    .map(
      (p) =>
        `${p.pageNumber}. [장면] ${p.sceneDescription} [텍스트] ${p.textContent}`,
    )
    .join("\n");

  const topicSection = topic
    ? `\n[원본 유저 요청]\n"${topic}"\n`
    : "";

  return `당신은 아동 동화 작가입니다. 아래 기획서를 바탕으로 최종 그림책 텍스트를 완성해주세요.
${topicSection}
[기획서]
제목: ${proposal.title}
요약: ${proposal.summary}
대상: ${childInfo.name} (${childInfo.age}세, ${childInfo.gender === "male" ? "남아" : "여아"})

[페이지별 초안]
${pagesBlock}

═══ 핵심 원칙: 유저 의도 보존 ═══
- 위 "원본 유저 요청"이 이 이야기의 출발점입니다.
- 기획서의 줄거리와 주제를 변경하지 마세요.
- 특정 동화가 원본이라면 핵심 플롯을 훼손하지 마세요.
- 새 등장인물이나 서브플롯을 추가하지 마세요.
- 유저가 편집한 텍스트는 최대한 존중하되, 문법과 흐름만 다듬기.

═══ 작업 지시 ═══

1. **텍스트(text) 다듬기**
   - 자연스럽고 읽기 쉽게, **60자 이내** (공백 포함, 엄격 준수)
   - ${childInfo.age}세 어휘 수준에 맞추기

2. **장면 묘사(sceneDescription) 보강** — 5요소 필수:
   - 장소/배경 (구체적 공간 + 시간대/조명)
   - 인물 동작
   - 인물 표정 (얼굴 수준의 묘사)
   - 핵심 소품 1-2개
   - 분위기/색감 힌트
   - 같은 장소의 장면은 배경 요소(벽 색, 가구)를 일관되게
   - 캐릭터 복장은 장소가 바뀌지 않는 한 동일 유지

3. **sceneGroup 부여**
   - 같은 물리적 장소의 연속 페이지 = 같은 번호
   - 실내→실외 = 새 그룹 / 같은 방이지만 낮→밤 = 새 그룹
   - ${STORYBOOK_PAGE_COUNT}페이지에 3~5개 그룹이 적절

4. **이야기 흐름 점검**
   - 감정 곡선이 자연스럽게 이어지는지
   - 결말이 열린 채로 끝나지 않는지

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
  customPromptTemplate?: string,
  topic?: string,
): Promise<StoryBook> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }
  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: buildStorybookPrompt(proposal, childInfo, topic),
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
    const imageUrls = await generateStoryImages(pages, artStyle, layout, referenceImageBase64, onImageProgress, customPromptTemplate);
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
