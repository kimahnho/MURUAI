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
  CastCharacter,
  CastingNote,
  PageLayout,
} from "../model/storybookTypes";
import { STORYBOOK_PAGE_COUNT } from "../model/storybookTypes";
import { generateStoryImages } from "./generateStoryImages";
import { generateSubCharacterReference } from "./generateCharacterReference";

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

  const nameInfo = childInfo.name ? `${childInfo.name} (${childInfo.age}세)` : `${childInfo.age}세 아동`;

  return `당신은 아이의 눈높이에서 이야기하는 그림책 작가입니다. 아래 기획서를 바탕으로 최종 그림책 텍스트를 완성해주세요.
아이가 직접 경험하며 느끼는 이야기로 다듬으세요. 어른의 훈계가 아닌, 아이의 작은 세계에서 일어나는 모험과 감정입니다.
${topicSection}
[기획서]
제목: ${proposal.title}
요약: ${proposal.summary}
대상: ${nameInfo}

[페이지별 초안]
${pagesBlock}

═══ 핵심 원칙 ═══
1. **textContent는 절대 변경하지 마세요.** 맞춤법 오류가 있어도 원본 그대로 복사합니다.
2. **sceneDescription은 반드시 textContent의 내용을 시각적으로 반영해야 합니다.**
   - textContent가 "바다에서 수영한다"이면 sceneDescription에 반드시 바다와 수영 장면이 있어야 합니다.
   - textContent와 sceneDescription이 모순되면 안 됩니다.
3. 기획서의 줄거리와 주제를 변경하지 마세요.
4. 새 등장인물이나 서브플롯을 추가하지 마세요.

═══ 텍스트(text) 다듬기 ═══

- ${childInfo.age}세가 자연스럽게 이해하고 즐길 수 있는 어휘와 문장으로 다듬으세요.
- 감정을 서술하지 말고 행동과 디테일로 보여주세요. ("슬펐다" → "눈물이 뚝 떨어졌다")
- 의성어/의태어와 직접 인용을 적극 활용하세요.
- 페이지 간 문장이 자연스럽게 이어지도록 전환을 신경 쓰세요.
- 등장인물마다 말투가 달라야 합니다.

═══ 장면 묘사(sceneDescription) 보강 ═══

5요소 필수:
- 장소/배경 (구체적 공간 + 시간대/조명)
- 인물 동작
- 인물 표정 (얼굴 수준)
- 핵심 소품 1-2개
- 분위기/색감
- 같은 장소의 장면은 배경 요소(벽 색, 가구)를 일관되게
- 캐릭터 복장은 장소가 바뀌지 않는 한 동일 유지

═══ sceneGroup 부여 ═══
- 같은 물리적 장소의 연속 페이지 = 같은 번호
- 실내→실외 = 새 그룹
- ${STORYBOOK_PAGE_COUNT}페이지에 3~5개 그룹

JSON만 출력:
[
  { "pageNumber": 1, "sceneDescription": "...", "text": "...", "sceneGroup": 1 },
  ...
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
  castingNote?: CastingNote | null,
  onSubCharProgress?: (current: number, total: number) => void,
): Promise<StoryBook> => {
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }
  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: buildStorybookPrompt(proposal, childInfo, topic),
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error("Gemini 응답이 없습니다.");

  const textPart = parts.find((part) => part.text);
  if (!textPart?.text) throw new Error("텍스트 응답이 없습니다.");

  let pages: StoryBookPage[];
  try {
    const parsed = parseStorybookResponse(textPart.text);
    pages = parsed.map((p, i) => {
      // 사용자가 수정한 텍스트는 그대로 유지 — AI가 보강한 sceneDescription + sceneGroup만 사용
      const originalText = proposal.pages[i]?.textContent ?? p.text;
      return {
        id: crypto.randomUUID(),
        pageNumber: p.pageNumber,
        imageUrl: "",
        text: originalText,
        sceneDescription: p.sceneDescription,
        sceneGroup: typeof p.sceneGroup === "number" ? p.sceneGroup : i + 1,
      };
    });
  } catch {
    // 파싱 실패 시 원본 기획서 텍스트를 그대로 사용
    pages = buildFallbackPages(proposal);
  }

  // 서브캐릭터 레퍼런스 자동 생성 (주인공 앵커)
  const subCharacters: CastCharacter[] = [];
  if (castingNote?.characters.length && referenceImageBase64) {
    const chars = castingNote.characters;
    for (let i = 0; i < chars.length; i++) {
      onSubCharProgress?.(i + 1, chars.length);
      try {
        const imageBase64 = await generateSubCharacterReference(
          referenceImageBase64,
          chars[i].appearance,
          chars[i].personality,
        );
        subCharacters.push({ ...chars[i], imageBase64 });
      } catch (error) {
        // 서브캐릭터 생성 실패 시 텍스트 묘사만으로 폴백
        console.warn(`서브캐릭터 '${chars[i].role}' 생성 실패`, error);
        captureSentryError(error, `스토리북 서브캐릭터 생성 (${chars[i].role})`);
        subCharacters.push({ ...chars[i] });
      }
    }
  }

  try {
    const imageUrls = await generateStoryImages(pages, artStyle, layout, referenceImageBase64, onImageProgress, customPromptTemplate, subCharacters);
    pages = pages.map((p, i) => ({ ...p, imageUrl: imageUrls[i] ?? "" }));
  } catch (error) {
    console.error("Story image generation failed:", error);
    captureSentryError(error, "스토리북 이미지 생성");
    throw error;
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
