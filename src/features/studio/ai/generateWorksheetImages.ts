/**
 * 학습지 이미지 생성 — Gemini 2.5 Flash Image로 A4 학습지 이미지 5장 생성.
 *
 * v2: 임상 지식 기반 이미지 프롬프트
 * - Gemini가 생성한 imagePrompt 우선 사용 (임상 맥락 포함)
 * - 진단 적응형 아트 스타일 선택
 * - 치료 도메인별 레이아웃 가이드
 */
import type { WorksheetSuggestion, TherapyDomain, DiagnosisProfile } from "../model/therapyTypes";
import { THERAPY_DOMAIN_LABELS } from "../model/therapyTypes";
import { getGenAI } from "@/shared/api/genai";
import { convertToWebP } from "@/shared/utils/imageConvert";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLAUDINARY_CLOUD_NAME as string | undefined;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLAUDINARY_UPLOAD_PRESET as string | undefined;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;
const IMAGE_MODEL = "gemini-2.5-flash-image";

// ── 진단 적응형 아트 스타일 ──

const ART_STYLES = {
  flat: `Clean, flat Korean children's educational illustration style.
Thick black outlines (2-3px). Solid bright colors with minimal shading.
Rounded, friendly shapes. Pure white background extending to ALL edges.
No text, labels, numbers in the image. No borders or frames.`,

  lowStimulation: `Low-stimulation style for sensory-sensitive children.
Pastel tones only. Thin gentle outlines. Pure white background ONLY.
No patterns, no textures, no gradients. Minimal visual elements.
Very soft colors. Maximum visual clarity with minimum stimulation.`,

  photorealistic: `Photorealistic style with real-looking objects.
Clear, high-quality photos of everyday objects on pure white background.
No cartoon elements. Sharp, recognizable objects that match real life.
Important for children with intellectual disabilities who need concrete visual references.`,

  ageAppropriate: `Clean, modern illustration suitable for older children.
NOT childish or babyish. Simple but mature-looking graphics.
Neutral colors, clean lines. Respectful of the child's chronological age
while keeping content at functional age level.`,
} as const;

type ArtStyleKey = keyof typeof ART_STYLES;

/** 진단 기반 아트 스타일 선택 */
function selectArtStyle(diagnosis?: DiagnosisProfile): { style: string; key: ArtStyleKey } {
  if (!diagnosis?.primary) return { style: ART_STYLES.flat, key: "flat" };

  const primary = diagnosis.primary;
  const adaptations = diagnosis.adaptations ?? [];

  // 감각과민 → 저자극
  if (adaptations.some((a) => a.includes("감각") || a.includes("저자극"))) {
    return { style: ART_STYLES.lowStimulation, key: "lowStimulation" };
  }

  // 지적장애 중등도+ → 실물 사진
  if (adaptations.includes("실물 사진 스타일") || adaptations.includes("실물 사진")) {
    return { style: ART_STYLES.photorealistic, key: "photorealistic" };
  }

  // ASD L2/L3 → 저자극 (배경 제거, 시각 구조화)
  if (primary === "ASD_L2" || primary === "ASD_L3") {
    return { style: ART_STYLES.lowStimulation, key: "lowStimulation" };
  }

  // 기본
  return { style: ART_STYLES.flat, key: "flat" };
}

// ── 치료 도메인별 이미지 설계 가이드 (임상 지식) ──

const DOMAIN_IMAGE_GUIDES: Record<TherapyDomain, string> = {
  language: `[언어치료 이미지 원칙]
- 이미지의 목적: 아동이 목표 음소/단어를 "말하기 위해" 사물을 보는 것
- 조음치료: 목표 음소가 포함된 단어의 사물 그림 (예: ㅅ → 사과, 소, 수박, 사자)
- 어휘치료: 범주별 실물 사물 그림 (동물, 과일, 탈것 등)
- 각 사물은 명확하게 구분 가능해야 함 (크기 충분, 배경 없음)
- 짝맞추기: 왼쪽 사물 그림 — 오른쪽 대응 항목, 점선 연결 가이드
- 같은것찾기: 기준 이미지 + 후보 이미지 배열, 정답은 완전 동일`,

  emotion: `[감정치료 이미지 원칙]
- 이미지의 목적: 아동이 감정을 "인식/판별"하기 위해 표정/상황을 보는 것
- 표정: 과장된 얼굴 표정 (눈, 입 모양이 감정을 명확히 전달)
- 상황: 감정을 유발하는 일상 장면 (생일파티→행복, 장난감 빼앗김→슬픔)
- 선택지: 감정 얼굴 카드 3-4개 (명확하게 다른 감정)
- ASD 아동: 선택지 간 차이를 극대화 (행복 vs 슬픔, 화남 vs 놀람)`,

  cognition: `[인지치료 이미지 원칙]
- 이미지의 목적: 아동이 "비교/분류/패턴 파악"을 하기 위한 자극 배열
- 같은것찾기: 기준 이미지와 후보 간 유사도 조절 (난이도)
- 분류: 명확한 범주 경계 (동물 vs 탈것 = 쉬움, 포유류 vs 파충류 = 어려움)
- 순서맞추기: 시간 순서가 명확한 장면 (씨앗→싹→나무)
- 매칭: 관련성이 직관적인 쌍 (우산-비, 칫솔-치약)`,

  motor: `[소근육치료 이미지 원칙]
- 이미지의 목적: 아동이 "손을 움직이기 위한" 시각 가이드
- 선긋기: 시작점과 끝점이 명확한 점선/가이드라인
- 따라쓰기: 큰 글자 외곽선 (아동이 따라 그음)
- 색칠: 굵은 테두리의 사물 윤곽 (내부 비워둠)
- 가위질: 자르기 가이드 선 (직선→곡선→복잡한 형태)
- 미로: 넓은 통로, 명확한 시작/끝점`,

  social: `[사회성치료 이미지 원칙]
- 이미지의 목적: 아동이 "적절한 행동을 판단"하기 위한 사회적 상황
- 또래 상호작용 장면 (인사, 차례 지키기, 나누기, 요청하기)
- O/X 비교: 적절한 행동 vs 부적절한 행동 나란히 배치
- 순서: 사회적 스크립트 시각화 (인사→대화→놀이→작별)
- 상황 판단: 장면 + "어떻게 해야 할까?" 선택지`,

  play: `[놀이치료 이미지 원칙]
- 이미지의 목적: 아동이 "놀이 방법을 이해"하기 위한 놀이 장면
- 감각놀이: 다양한 질감/도구 배열 (모래, 물, 점토)
- 상징놀이: 사물의 실제 용도 vs 놀이 용도 비교
- 규칙놀이: 단계별 놀이 방법 시각화
- 구성놀이: 완성품 + 과정 단계`,
};

// ── 이미지 프롬프트 구성 (임상 지식 기반) ──

const CLINICAL_IMAGE_SYSTEM_PROMPT = `당신은 발달장애 아동 치료 학습지 이미지를 설계하는 전문가입니다.

핵심 원칙:
1. 이미지는 "예쁜 그림"이 아니라 "치료 도구"입니다. 아동이 목표 행동을 수행하기 위한 시각적 자극입니다.
2. 치료 목표를 먼저 이해하고, 그 목표 달성에 필요한 시각 자극을 설계하세요.
3. 기능연령에 맞는 복잡도를 적용하세요.

안전 규칙:
- 폭력/공포/성적 콘텐츠 절대 금지
- 이미지 안에 텍스트를 직접 넣지 않음 (코드에서 오버레이)
- A4 흑백 인쇄에서도 구분 가능해야 함`;

/**
 * 단일 학습지 이미지 프롬프트 생성.
 * Gemini가 임상 맥락으로 생성한 imagePrompt가 있으면 우선 사용.
 * 없으면 fallback으로 generic 프롬프트 생성.
 */
export function buildWorksheetImagePrompt(
  sheet: WorksheetSuggestion,
  domain: TherapyDomain,
  diagnosis?: DiagnosisProfile,
): string {
  const { style: artStyle } = selectArtStyle(diagnosis);
  const domainGuide = DOMAIN_IMAGE_GUIDES[domain];
  const domainLabel = THERAPY_DOMAIN_LABELS[domain];

  // Gemini가 생성한 임상 imagePrompt가 있으면 그걸 기반으로 보강
  if (sheet.imagePrompt) {
    return `Generate a COMPLETE A4 educational worksheet page image. Portrait (3:4).
Pure white background extending to ALL edges. Print-ready. No borders or frames.

[임상 이미지 설계]
${sheet.imagePrompt}

[아트 스타일]
${artStyle}

${domainGuide}

PAGE LAYOUT:
=== TOP (15%) === Empty white space for title overlay.
=== MAIN (55-70%) === Content as described above. Objects large enough for young children.
=== BOTTOM (15-30%) === Response area: dotted lines or circles for answers.

CRITICAL: No text in image. No Korean/English characters. Only illustrations.
No border/frame. White background to all edges.`;
  }

  // Fallback: generic 프롬프트 (imagePrompt 없는 경우)
  return `Generate a COMPLETE A4 educational worksheet page image. Portrait (3:4).
Pure white background extending to ALL edges. Print-ready. No borders or frames.

Domain: ${domainLabel} (${domain})
Title: "${sheet.title}"
Activity: ${sheet.description}
Difficulty: ${sheet.difficulty}
Items: ${sheet.itemCount}

[아트 스타일]
${artStyle}

${domainGuide}

PAGE LAYOUT:
=== TOP (15%) === Empty white space for title overlay.
=== MAIN (55-70%) ===
- Use ${sheet.itemCount} items for ${sheet.difficulty} difficulty.
- All illustrations simple, clear, child-friendly.
- Objects large enough for young children to identify.
=== BOTTOM (15-30%) === Response area: dotted lines or circles for answers.

CRITICAL: No text in image. No Korean/English characters. Only illustrations.
No border/frame. White background to all edges.`;
}

// ── 단일 학습지 이미지 생성 ──

async function generateSingleImage(
  sheet: WorksheetSuggestion,
  domain: TherapyDomain,
  diagnosis?: DiagnosisProfile,
): Promise<string> {
  const ai = getGenAI();
  const prompt = buildWorksheetImagePrompt(sheet, domain, diagnosis);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: CLINICAL_IMAGE_SYSTEM_PROMPT,
          responseModalities: ["Text", "Image"],
          imageConfig: { aspectRatio: "3:4" },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const inline = (part as { inlineData?: { data: string; mimeType: string } }).inlineData;
        if (inline?.data) {
          return inline.data;
        }
      }
      throw new Error("이미지가 생성되지 않았습니다.");
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw new Error("Unreachable");
}

// ── Cloudinary 업로드 ──

async function uploadToCloudinary(base64Data: string, userId: string): Promise<string> {
  const { data: webpData, mimeType } = await convertToWebP(base64Data);

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    return `data:${mimeType};base64,${webpData}`;
  }

  const formData = new FormData();
  formData.append("file", `data:${mimeType};base64,${webpData}`);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `muru_therapy_worksheet/${userId}`);
  formData.append("public_id", crypto.randomUUID());

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) throw new Error("Cloudinary 업로드 실패");

  const payload = (await response.json()) as { public_id: string; format?: string };
  const ext = payload.format ?? "png";
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${payload.public_id}.${ext}`;
}

// ── 메인: 5장 학습지 이미지 생성 ──

export async function generateWorksheetImages(
  sheets: WorksheetSuggestion[],
  domain: TherapyDomain,
  userId: string,
  onProgress?: (current: number, total: number) => void,
  diagnosis?: DiagnosisProfile,
): Promise<string[]> {
  const total = sheets.length;
  const base64Images: string[] = [];

  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);
    const base64 = await generateSingleImage(sheets[i], domain, diagnosis);
    base64Images.push(base64);
  }

  const urls = await Promise.all(
    base64Images.map((b64) => uploadToCloudinary(b64, userId)),
  );

  return urls;
}
