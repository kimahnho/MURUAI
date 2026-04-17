/**
 * 개별 스토리북 페이지 1장만 재생성하는 AI 함수.
 * - 주인공 레퍼런스 + sceneGroup 앵커를 재활용해 기존 스타일/장소 일관성을 유지
 * - 사용자가 장면 설명(한국어)을 수정한 경우 새로 번역
 * - 결과는 Cloudinary 업로드된 URL로 반환
 */
import { getGenAI } from "@/shared/api/genai";
import { supabase } from "@/shared/api/supabase";
import { convertToWebP } from "@/shared/utils/imageConvert";
import { ART_STYLE_PRESETS } from "../data/artStylePresets";
import type { ArtStyleId, ManualSubCharacter, PageLayout } from "../model/storybookTypes";
import {
  generateSingleImage,
  getAspectRatioForLayout,
  getCloudinaryUrl,
  translateScenesToEnglish,
  uploadToCloudinary,
} from "./generateStoryImages";

interface RegenerateInput {
  /** 사용자가 수정한(또는 그대로인) 장면 설명 (한국어 또는 영어) */
  sceneDescription: string;
  /** 페이지 본문 — 프롬프트 컨텍스트에 포함 */
  text: string;
  /** 원본 sceneGroup 번호 */
  sceneGroup: number;
  /** sceneGroup의 첫 페이지에서 생성된 앵커 이미지(WebP base64) — 없으면 캐릭터 레퍼런스만 사용 */
  groupAnchorBase64: string | null;
  /** 주인공 레퍼런스 (base64 — WebP 압축 전 원본 허용) */
  characterRefBase64: string;
  /** 원본 생성 시와 동일한 스타일 */
  artStyleId: ArtStyleId;
  customPromptTemplate?: string;
  layout: PageLayout;
  /** 서브 캐릭터 (선택) */
  subCharacters?: ManualSubCharacter[];
  /** sceneDescription이 한국어면 true — Gemini 번역 후 사용 */
  translateKorean?: boolean;
}

/**
 * 단일 페이지 이미지를 재생성해 Cloudinary URL을 반환한다.
 */
export const regenerateStoryImage = async (input: RegenerateInput): Promise<string> => {
  const preset = ART_STYLE_PRESETS.find((p) => p.id === input.artStyleId);
  const stylePostfix = input.customPromptTemplate ?? preset?.promptTemplate ?? "";
  if (!preset && !input.customPromptTemplate) {
    throw new Error(`Unknown art style: ${input.artStyleId}`);
  }

  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) throw new Error("로그인이 필요합니다.");

  const ai = getGenAI();

  // 장면 설명 영문화
  let englishScene = input.sceneDescription;
  if (input.translateKorean) {
    try {
      const [translated] = await translateScenesToEnglish(ai, [input.sceneDescription]);
      if (translated) englishScene = translated;
    } catch {
      // 번역 실패 시 입력 그대로 사용
    }
  }

  const aspectRatio = getAspectRatioForLayout(input.layout);

  // 주인공 레퍼런스 WebP 압축
  const { data: compressedMainRef } = await convertToWebP(input.characterRefBase64);

  // 서브 캐릭터 ref 압축 (선택)
  const subRefs: Array<{ role: string; data: string }> = [];
  if (input.subCharacters) {
    for (const sc of input.subCharacters) {
      if (sc.imageBase64) {
        const { data } = await convertToWebP(sc.imageBase64);
        subRefs.push({ role: sc.name, data });
      }
    }
  }

  // 후속 페이지는 sceneGroup 앵커가 있으면 "배경 연속" 지시 포함
  const hasAnchor = !!input.groupAnchorBase64;
  const changeContext = hasAnchor
    ? `\n\nIMPORTANT CONTINUITY: The reference scene image shows the SAME LOCATION from an earlier moment. Apply any changes described in the current scene (weather, time of day, lighting, new objects) while keeping the same physical space and layout.`
    : "";

  const imagePrompt = `Story text: "${input.text}"\n\nScene: ${englishScene}, ${stylePostfix}${changeContext}`;

  const base64 = await generateSingleImage(
    ai,
    imagePrompt,
    aspectRatio,
    compressedMainRef,
    subRefs.length > 0 ? subRefs : undefined,
    input.groupAnchorBase64 ?? undefined,
  );

  const imagePath = await uploadToCloudinary(base64, userId);
  return getCloudinaryUrl(imagePath);
};
