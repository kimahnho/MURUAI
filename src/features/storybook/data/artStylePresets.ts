/**
 * 스토리북 그림체 5종 프리셋 — 라벨, 설명, 미리보기 이미지, 이미지 생성 프롬프트 템플릿.
 */
import type { ArtStylePreset } from "../model/storybookTypes";

export const ART_STYLE_PRESETS: ArtStylePreset[] = [
  {
    id: "watercolor-fairytale",
    label: "수채화풍 동화",
    description: "연한 스케치와 파스텔 수채화가 어우러진 따뜻한 동화책 스타일",
    previewImage: "/images/storybook/art-styles/watercolor-fairytale.png",
    promptTemplate:
      "Soft watercolor illustration style, hand-drawn pencil sketches, light pastel color palette, muted tones, storybook aesthetic, gentle wash, minimalist background, warm and cozy atmosphere, delicate lines, clean and simple composition",
  },
  {
    id: "pixar-style",
    label: "픽사 스타일",
    description:
      "크고 활발한 표정의 눈, 부드러운 빛 반사, 고품질 3D 렌더링 애니메이션",
    previewImage: "/images/storybook/art-styles/pixar-style.png",
    promptTemplate:
      "High-end 3D stylized animation style, Pixar-inspired characters, soft subsurface scattering lighting, vibrant and saturated color palette, expressive large eyes, detailed hair and fabric textures, volumetric lighting, cinematic wide shot, professional 3D render feel",
    modelParams: "--niji 6 --style expressive",
  },
  {
    id: "cozy-sketch",
    label: "포근한 스케치",
    description:
      "물 번짐 효과와 잉크 펜 질감이 어우러진 환상적이고 감성적인 수채화",
    previewImage: "/images/storybook/art-styles/cozy-sketch.png",
    promptTemplate:
      "Whimsical modern watercolor illustration, soft wet-on-wet color bleeding, delicate ink pen outlines, translucent layered washes, high-quality cold-press watercolor paper texture, ethereal lighting, pastel tones, cozy and warm atmosphere, professional storybook quality",
    modelParams: "--ar 16:9",
  },
  {
    id: "crayon-sketch",
    label: "크레용 스케치",
    description:
      "어린이가 크레용과 색연필로 그린 듯한 소박하고 장난기 넘치는 텍스처",
    previewImage: "/images/storybook/art-styles/crayon-sketch.png",
    promptTemplate:
      "Naive art style children's illustration, authentic wax crayon and colored pencil texture, charmingly irregular lines, vibrant but raw color application, flat perspective, whimsical characters with simple anatomy, hand-drawn paper feel, playful and energetic aesthetic",
    modelParams: "--v 6.0 --stylize 250",
  },
  {
    id: "minimal-illustration",
    label: "미니멀 일러스트",
    description:
      "깔끔한 선, 제한된 차분한 색상, 여백의 미를 살린 스칸디나비안 디자인",
    previewImage: "/images/storybook/art-styles/minimal-illustration.png",
    promptTemplate:
      "Minimalist children's book illustration, Scandinavian design aesthetic, ultra-clean lines, limited palette of soft sage, muted sand, and warm terracotta, expressive minimalist faces, focus on character emotion, strategic use of wide negative space, serene and calm atmosphere, professional vector-style finish",
    modelParams: "--ar 4:3 --v 6.0",
  },
];
