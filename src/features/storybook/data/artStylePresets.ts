/**
 * 스토리북 그림체 5종 프리셋 — 라벨, 설명, 미리보기 이미지, 이미지 생성 프롬프트 템플릿.
 */
import type { ArtStylePreset } from "../model/storybookTypes";

export const ART_STYLE_PRESETS: ArtStylePreset[] = [
  {
    id: "watercolor-fairytale",
    label: "수채화풍 동화",
    description: "연한 스케치와 파스텔 수채화가 어우러진 따뜻한 동화책 스타일",
    previewImage: "/images/storybook/art-styles/watercolor-fairytale.webp",
    promptTemplate:
      "Soft watercolor children's book illustration, light pencil sketch outlines with gentle pastel washes, warm muted tones, simple and clean composition, cozy picture book feel",
  },
  {
    id: "pixar-style",
    label: "픽사 스타일",
    description:
      "크고 활발한 표정의 눈, 부드러운 빛 반사, 3D 애니메이션 스타일",
    previewImage: "/images/storybook/art-styles/pixar-style.webp",
    promptTemplate:
      "3D animated children's movie style, soft rounded character design, warm gentle lighting, expressive big eyes, smooth simple textures, friendly and approachable look",
  },
  {
    id: "cozy-sketch",
    label: "포근한 스케치",
    description:
      "물 번짐 효과와 잉크 펜 질감이 어우러진 따뜻하고 감성적인 수채화",
    previewImage: "/images/storybook/art-styles/cozy-sketch.webp",
    promptTemplate:
      "Warm watercolor illustration with soft ink pen outlines, gentle color bleeding, pastel tones on textured paper, cozy and tender children's book atmosphere",
  },
  {
    id: "crayon-sketch",
    label: "크레용 스케치",
    description:
      "어린이가 크레용과 색연필로 그린 듯한 소박하고 따뜻한 그림",
    previewImage: "/images/storybook/art-styles/crayon-sketch.webp",
    promptTemplate:
      "Children's crayon and colored pencil drawing, soft rounded shapes, limited warm color palette, thick simple outlines, gentle hand-drawn feel on paper, innocent and tender aesthetic",
  },
  {
    id: "minimal-illustration",
    label: "미니멀 일러스트",
    description:
      "깔끔한 선, 차분한 색상, 여백의 미를 살린 심플한 디자인",
    previewImage: "/images/storybook/art-styles/minimal-illustration.webp",
    promptTemplate:
      "Simple minimalist children's book illustration, clean outlines, limited soft color palette, gentle expressive faces, calm and quiet atmosphere with open space",
  },
];
