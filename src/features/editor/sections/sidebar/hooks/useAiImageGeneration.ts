/**
 * AI 이미지 생성, 업로드, 크레딧 통합 관리하는 훅.
 * user_credits 기반 통합 크레딧 (일일 한도 제거).
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/shared/api/supabase";
import { convertToWebP } from "@/shared/utils/imageConvert";
import { useToastStore } from "@/features/editor/store/toastStore";
import { useImageFillStore } from "@/features/editor/store/imageFillStore";
import { mp } from "@/shared/utils/mixpanel";
import { getGenAI } from "@/shared/api/genai";
import {
  type ImageStyle,
  type StyleOption,
  STYLE_OPTIONS,
  buildPromptWithStyle,
} from "@/features/editor/constants/aiImageStylePrompts";
import { useWorksheetElementStore } from "@/features/editor/store/worksheetElementStore";
import { checkAiCredits, recordAiCreditUsage, fetchCreditBalance, MONTHLY_AI_CREDIT_LIMIT } from "@/features/editor/utils/aiTemplateUsage";
import { useCreditModalStore } from "@/features/editor/store/creditModalStore";

export type { ImageStyle, StyleOption };
export { STYLE_OPTIONS };

export type GeneratedImage = {
  id: string;
  url: string;
  prompt?: string;
  style?: string;
  createdAt: string;
};

export type UsageStatus = {
  used: number;
  limit: number;
  remaining: number;
  canGenerate: boolean;
};

// const RAW_GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY as
//   | string
//   | undefined;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as
  | string
  | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env
  .VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

// const hasNonIso88591CodePoint = (value: string): boolean => {
//   for (const ch of value) {
//     if (ch.codePointAt(0)! > 0xff) return true;
//   }
//   return false;
// };

// const GOOGLE_API_KEY = sanitizeEnvKey(RAW_GOOGLE_API_KEY);

// const collectNonIso88591Meta = (value: string): string => {
//   const issues: string[] = [];
//   for (let i = 0; i < value.length; i += 1) {
//     const codePoint = value.codePointAt(i);
//     if (codePoint === undefined) continue;
//     if (codePoint > 0xff) {
//       issues.push(`pos=${i + 1},U+${codePoint.toString(16).toUpperCase()}`);
//       if (issues.length >= 5) break;
//     }
//     if (codePoint > 0xffff) i += 1;
//   }
//   return issues.join(" ");
// };

const getCloudinaryUrl = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (CLOUDINARY_CLOUD_NAME) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${path}`;
  }
  return path;
};

const generateImageWithGemini = async (prompt: string): Promise<string> => {
  // ── 기존 Google AI API key 검증 ──
  // if (!GOOGLE_API_KEY) {
  //   throw new Error("Google API key is not configured");
  // }
  // if (hasNonIso88591CodePoint(GOOGLE_API_KEY)) {
  //   const issueMeta = collectNonIso88591Meta(GOOGLE_API_KEY);
  //   throw new Error(
  //     `Google API key contains unsupported characters. Re-enter VITE_GOOGLE_API_KEY using plain ASCII text. ${issueMeta}`,
  //   );
  // }
  // const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      responseModalities: ["Text", "Image"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;

  if (!parts) {
    throw new Error("No response from Gemini");
  }

  const imagePart = parts.find((part) => part.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("No image generated");
  }

  return imagePart.inlineData.data;
};

const uploadToCloudinary = async (
  base64Data: string,
  userId: string,
): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error("Cloudinary is not configured");
  }

  const formData = new FormData();
  const publicId = crypto.randomUUID();
  const folder = `muru_user_ai_gen/${userId}`;

  const { data: webpData, mimeType } = await convertToWebP(base64Data);
  formData.append("file", `data:${mimeType};base64,${webpData}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", folder);
  formData.append("public_id", publicId);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error("Failed to upload to Cloudinary");
  }

  const payload = (await response.json()) as {
    public_id: string;
    format?: string;
  };

  return payload.format
    ? `${payload.public_id}.${payload.format}`
    : payload.public_id;
};

/**
 * AI 이미지 생성 훅
 * - Gemini API 호출 + Cloudinary 업로드 로직 담당
 * - DB에 이미지 저장 및 이력 관리
 * - 일일 생성 횟수 제한 (20회/일) - 실제 생성 결과물 기준
 * - store 구독은 selector 기반
 */
// 탭 전환 시에도 프롬프트와 스타일 선택을 유지하기 위한 모듈 레벨 변수
let _persistedStyle: ImageStyle | null = null;
let _persistedPrompt = "";

export const useAiImageGeneration = () => {
  const [selectedStyle, setSelectedStyleState] = useState<ImageStyle | null>(_persistedStyle);
  const [prompt, setPromptState] = useState(_persistedPrompt);

  const setSelectedStyle = (style: ImageStyle) => { _persistedStyle = style; setSelectedStyleState(style); };
  const setPrompt = (value: string) => { _persistedPrompt = value; setPromptState(value); };
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [usageStatus, setUsageStatus] = useState<UsageStatus>({
    used: 0,
    limit: MONTHLY_AI_CREDIT_LIMIT,
    remaining: MONTHLY_AI_CREDIT_LIMIT,
    canGenerate: true,
  });

  // 색칠공부 AI 생성 요청 감지 → lineart 스타일 자동 선택 + 프롬프트 힌트
  const coloringAiRequestId = useWorksheetElementStore((s) => s.coloringAiRequestId);
  useEffect(() => {
    if (coloringAiRequestId > 0) {
      setSelectedStyle("lineart");
      setPrompt("");
    }
  }, [coloringAiRequestId]);

  // 선택자 단위 구독으로 불필요한 리렌더를 줄인다.
  const showToast = useToastStore((s) => s.showToast);
  const requestImageFill = useImageFillStore((s) => s.requestImageFill);

  // user_credits 기반 통합 크레딧 잔량 조회
  const fetchUsageStatus = useCallback(async () => {
    try {
      const remaining = await fetchCreditBalance();
      const used = MONTHLY_AI_CREDIT_LIMIT - remaining;
      setUsageStatus({
        used,
        limit: MONTHLY_AI_CREDIT_LIMIT,
        remaining,
        canGenerate: remaining > 0,
      });
    } catch (error) {
      console.error("Failed to fetch credit balance:", error);
    }
  }, []);

  // 생성 이력을 최신순으로 불러온다.
  const fetchGeneratedImages = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase.rpc("get_ai_generated_images", {
        p_limit: 50,
        p_offset: 0,
      });
      if (error) throw error;
      if (data) {
        const images: GeneratedImage[] = data.map(
          (item: {
            id: string;
            image_url: string;
            prompt: string;
            style: string;
            created_at: string;
          }) => ({
            id: item.id,
            url: item.image_url,
            prompt: item.prompt,
            style: item.style,
            createdAt: item.created_at,
          }),
        );
        setGeneratedImages(images);
      }
    } catch (error) {
      console.error("Failed to fetch generated images:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 마운트 시 사용량/이력을 먼저 동기화해 버튼 활성 상태를 안정화한다.
  useEffect(() => {
    fetchUsageStatus();
    fetchGeneratedImages();
  }, [fetchUsageStatus, fetchGeneratedImages]);

  const buildFinalPrompt = () => buildPromptWithStyle(selectedStyle!, prompt);

  const canGenerate =
    prompt.trim().length > 0 && selectedStyle !== null && !isGenerating && usageStatus.canGenerate;

  const generate = async () => {
    if (!prompt.trim() || !selectedStyle || isGenerating) return;

    // 중복 클릭으로 중복 생성 요청이 발생하지 않게 즉시 잠근다.
    setIsGenerating(true);

    try {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) {
        showToast("로그인이 필요해요.");
        setIsGenerating(false);
        return;
      }

      // if (!GOOGLE_API_KEY) {
      //   showToast("API 설정이 필요해요.");
      //   setIsGenerating(false);
      //   return;
      // }

      // 통합 크레딧 체크
      const creditCheck = await checkAiCredits(1);
      if (!creditCheck.canProceed) {
        useCreditModalStore.getState().open("이미지 생성에 크레딧이 필요합니다.");
        await fetchUsageStatus();
        setIsGenerating(false);
        return;
      }
      const finalPrompt = buildFinalPrompt();
      const userPrompt = prompt.trim();

      const base64Image = await generateImageWithGemini(finalPrompt);
      const imagePath = await uploadToCloudinary(base64Image, user.id);
      const imageUrl = getCloudinaryUrl(imagePath);

      // 이미지 저장 (이력 기록용, daily_limit은 무시값 전달)
      const { data: savedId, error: saveError } = await supabase.rpc(
        "save_ai_generated_image",
        {
          p_image_url: imageUrl,
          p_prompt: userPrompt,
          p_style: selectedStyle,
          daily_limit: 99999,
        },
      );

      if (saveError) {
        console.error("Failed to save image to DB:", saveError);
      }

      // 통합 크레딧 차감 (비차단)
      void recordAiCreditUsage("image_gen", 1);

      const newImage: GeneratedImage = {
        id: savedId || crypto.randomUUID(),
        url: imageUrl,
        prompt: userPrompt,
        style: selectedStyle,
        createdAt: new Date().toISOString(),
      };
      setGeneratedImages((prev) => [newImage, ...prev]);

      // 로컬 크레딧 상태 즉시 반영
      setUsageStatus((prev) => {
        const newRemaining = Math.max(0, prev.remaining - 1);
        return {
          ...prev,
          used: prev.used + 1,
          remaining: newRemaining,
          canGenerate: newRemaining > 0,
        };
      });

      // 선택 상태와 무관하게 새 이미지 요소를 삽입해 생성 결과를 바로 확인시킨다.
      requestImageFill(
        imageUrl,
        undefined,
        { width: 300, height: 300 },
        { forceInsert: true, source: "ai" },
      );

      mp.track("AI 이미지 생성", { style: selectedStyle, prompt_length: userPrompt.length });
      showToast("이미지가 생성되었어요!");
    } catch (error) {
      console.error("Image generation failed:", error);
      showToast(
        error instanceof Error ? error.message : "이미지 생성에 실패했어요.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const addImageToCanvas = (imageUrl: string) => {
    requestImageFill(
      imageUrl,
      undefined,
      { width: 300, height: 300 },
      { forceInsert: true, source: "ai" },
    );
  };

  return {
    selectedStyle,
    prompt,
    isGenerating,
    isLoadingHistory,
    generatedImages,
    canGenerate,
    usageStatus,
    setSelectedStyle,
    setPrompt,
    generate,
    addImageToCanvas,
    refreshHistory: fetchGeneratedImages,
  };
};
