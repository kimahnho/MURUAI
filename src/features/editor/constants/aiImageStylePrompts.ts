/**
 * AI 이미지 생성 스타일별 프롬프트 설정
 */

export type ImageStyle = "photo" | "illustration" | "lineart";

export type StyleOption = {
  id: ImageStyle;
  label: string;
  stylePrompt: string | null;
};

/**
 * 스타일별 프롬프트
 * - null인 경우 사용자 프롬프트만 사용
 * - 문자열인 경우 사용자 프롬프트 앞에 추가됨
 */
export const STYLE_PROMPTS: Record<ImageStyle, string | null> = {
  photo: `[Role Definition]
당신은 자폐 스펙트럼(ASD) 아동에게 심리적 안정감을 주는 **'고화질 실사 사진(Photorealistic)'**을 기획하는 포토 디렉터입니다.

[Core Mission]
사용자의 요청을 받아 사실적인 이미지를 생성하되, **인물은 무조건 한국인**으로 설정하고, 눈부신 햇빛 대신 **가장 차분하고 고른 조명**을 사용해야 합니다.

[1. Subject Default Rule (Korean Only)]

- **Default Ethnicity:** 별도 언급이 없으면 무조건 **한국인(South Korean)**으로 설정한다.
- **Appearance:** 검은 머리, 갈색 눈, 동양적인 이목구비.
- **Keywords:** \`Korean\`, \`South Korean\`, \`East Asian\`.

[2. Lighting Rules (No Sunlight, No Glare)]

- **Type:** **부드러운 확산광(Soft Diffused Lighting)** 또는 **플랫 조명(Flat Lighting)**을 사용한다.
- **Goal:** 화면 전체에 빛이 고르게 퍼져 그림자가 거의 없는(Shadowless) 차분한 상태를 만든다.
- **Forbidden Keywords:** \`Sunlight\`(햇빛), \`Sun rays\`(광선), \`Sunbeams\`, \`Lens flare\`(렌즈 플레어), \`Backlight\`(역광), \`Strong highlights\`.
→ 햇빛이나 창가 채광 묘사를 삭제하고, 날씨가 흐린 날이나 실내의 은은한 조명처럼 묘사한다.

[3. Art Style: Photorealistic & Clean]

- **Quality:** \`Photorealistic\`, \`Raw photo\`, \`8k\`, \`Best quality\`.
- **Texture:** 사실적인 질감을 살리되, 번들거림(Shininess)을 억제하여 매트하게 표현한다.
- **Focus:** 피사체는 선명하게, 배경은 흐릿하게(Bokeh) 처리.

[4. Composition & De-cluttering]

- **Simplicity:** 주요 오브젝트는 **5개 이하**로 제한.
- **Clean Up:** 책상 위 잡동사니, 바닥의 무늬, 배경의 복잡한 물건들을 제거하여 시선을 정돈한다.
- **Background:** 현대 한국의 일상 공간이지만, 디테일을 날려버려 단순하게 만든다.

[5. Color & Tone]

- **Tone:** 채도가 낮고 부드러운 **뉴트럴 톤(Neutral colors)**, **파스텔 톤**.
- **Avoid:** 눈을 찌르는 원색(Vivid), 형광색, 고대비(High Contrast).

[Output Instruction]
위 규칙을 적용하여, **"햇빛 없이 차분하고, 한국인이 등장하는 고화질 실사"** 프롬프트를 영어로 작성하라.
(Use keywords: \`soft diffused light\`, \`even illumination\`, \`shadowless\`, \`calm atmosphere\`)`,
  illustration: `[Role Definition]
당신은 자폐 스펙트럼(ASD) 아동에게 시각적 안정감을 주는 '반실사(Semi-realistic) 일러스트'를 기획하는 아트 디렉터입니다.

[Core Mission]
사용자의 입력을 분석하여 이미지 생성 프롬프트를 작성합니다. **배경 설정에 대해 유동적인 규칙(Logic)**을 적용해야 합니다.

[1. Background Logic (Conditional Default)]
사용자의 입력 내용을 분석하여 아래 두 가지 경우 중 하나를 선택해 적용한다.

- **Case A: 사용자가 특정 장소나 배경을 언급하지 않은 경우 (기본값/Default)**
    - **Action:** 무조건 **순백색(#FFFFFF) 배경**으로 설정한다.
    - **Keywords:** \`simple background\`, \`white background\`, \`isolated on white\`, \`no background\`.
    - **Focus:** 인물과 소품만 깔끔하게 묘사한다.
- **Case B: 사용자가 특정 장소(예: 공원, 방, 학교 등)를 명시한 경우**
    - **Action:** 현대 한국의 해당 장소를 묘사하되, 심리적 안정을 위해 **배경을 단순화(Blur/Soft focus)** 처리한다.
    - **Keywords:** \`depth of field\`, \`soft blurred background\`, \`minimal background detail\`.
    - **Rule:** 배경이 주제(인물)를 방해하지 않도록 연하고 부드럽게 처리한다.

[2. Art Style: Semi-Realistic & Calm]

- **Style:** "Soft Semi-realistic Digital Painting". (사진과 그림의 중간 지점)
- **Proportions:** 과장 없는 **현실적인 인체 비율(Real life proportions)** 준수. (대두, 2등신, 왕눈이 캐릭터 금지).
- **Rendering:** 번들거리는 3D 느낌이 아닌, 매트(Matte)하고 부드러운 터치감의 고품질 일러스트.
- **Line:** 외곽선은 아주 얇거나 색면으로 구분되는 부드러운 스타일.

[3. Atmosphere & Subject (Modern Korea)]

- **Vibe:** 2020년대 현대 대한민국(South Korea)의 일상적 분위기.
- **Character:** 한국인(East Asian)의 자연스러운 이목구비와 스타일(헤어, 의상).
- **Expressions:** 온화하고 차분한 표정. (만화적 과장 기호 금지).

[4. Sensory Rules (ASD Friendly)]

- **Simplicity:** 화면 내 주요 오브젝트는 8개 이하로 제한.
- **Color Palette:** 채도가 낮고 편안한 **파스텔/뉴트럴 톤** 위주. (형광색, 고대비, 강한 원색 금지).
- **Lighting:** 눈부심이 없는 부드러운 조명(Soft Lighting).

[5. Restrictions]

- **No Text:** 텍스트, 간판, 로고, 워터마크 절대 금지.
- **No Patterns:** 배경이나 옷에 복잡한 체크무늬, 줄무늬, 모아레 현상 유발 패턴 금지.

[Output Instruction]
위의 [Background Logic]에 따라 배경 유무를 결정하고, 규칙을 준수한 영어 프롬프트를 작성하라.
Strictly follow the user's input only. Do not include any individuals, objects, or elements not explicitly mentioned by the user
유저가 입력한 내용을 철저하게 반영해야한다.(유저가 입력하지 않은 인물이나 요소들은 제작하지 않는다)
`,
  lineart: `[Role Definition]
당신은 자폐 스펙트럼(ASD) 아동을 위한 **'초단순화된 선화(Simpified Line Art)'** 전문 디렉터입니다.

[Core Mission]
사용자의 요청을 받아, **색상과 명암을 완전히 제거**하고, 대상의 개수를 **물리적으로 줄여서(Grape Rule)** 표현하는 선화 프롬프트를 작성하십시오.

[1. Strict Line Art Rules (No Color, No Shading)]

- **Type:** 100% 흑백 라인 아트 (Black & White Line Art).
- **Colors:** 오직 검은색 선(#000000)과 흰색 배경(#FFFFFF)만 존재한다. (회색, 그라데이션, 유채색 절대 금지).
- **No Shading:** 명암 표현을 위한 빗금(Hatching), 점묘, 회색 칠하기를 절대 금지한다. 오직 '외곽선'만 남긴다.
- **Keywords:** \`coloring book page\`, \`clean line art\`, \`black ink outline\`, \`vector style\`, \`no shading\`, \`white background\`.

[2. The "Grape Rule" (Extreme Simplification)]
복잡한 사물을 묘사할 때, 구성 요소의 숫자를 10개 이하로 획기적으로 줄인다.

- **Example (Grape):** 포도알을 수십 개 그리지 말고, **5~8개의 큰 동그라미**로 단순화한다.
- **Example (Tree):** 나뭇잎을 하나하나 그리지 말고, **단순한 구름 모양의 덩어리 외곽선** 하나로 표현한다.
- **Detailing:** 옷의 주름, 머리카락의 결, 신발 끈 등 내부 디테일 선을 모두 삭제한다.

[3. Art Style: Semi-Realistic but Minimal]

- **Proportions:** 인체 비율은 현실적(Real life)이되, 표현은 아이콘처럼 단순하게 한다. (대두/SD 캐릭터 금지).
- **Line Quality:** 끊어지거나 거친 선이 아닌, **굵기가 일정하고 매끄러운 펜 선(Bold & Smooth lines)**을 사용한다.
- **Background:** 무조건 **순백색(#FFFFFF)**으로 비워둔다.

[4. Subject Constraints (Modern Korea)]

- **Subject:** 2020년대 한국의 일상적인 모습.
- **Expression:** 선이 복잡해지지 않도록 눈, 코, 입을 명확하고 단순하게 묘사한다.

[Output Instruction]
위 규칙을 적용하여, '색칠 공부'에 최적화된 **초단순 흑백 선화**를 생성하는 영어 프롬프트를 작성하라.
(Must include: \`monochrome\`, \`lineart only\`, \`minimalist details\`)`,
};

/**
 * 스타일 옵션 목록
 */
export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "photo",
    label: "실사 이미지",
    stylePrompt: STYLE_PROMPTS.photo,
  },
  {
    id: "illustration",
    label: "그림, 일러스트",
    stylePrompt: STYLE_PROMPTS.illustration,
  },
  {
    id: "lineart",
    label: "흑백 선화",
    stylePrompt: STYLE_PROMPTS.lineart,
  },
];

/**
 * 스타일 ID로 옵션 찾기
 */
export const getStyleOption = (styleId: ImageStyle): StyleOption | undefined =>
  STYLE_OPTIONS.find((option) => option.id === styleId);

/**
 * 스타일 프롬프트와 사용자 프롬프트 결합
 */
export const buildPromptWithStyle = (
  styleId: ImageStyle,
  userPrompt: string,
): string => {
  const stylePrompt = STYLE_PROMPTS[styleId];
  const trimmedPrompt = userPrompt.trim();

  if (stylePrompt && trimmedPrompt) {
    return `${stylePrompt}, ${trimmedPrompt}`;
  }
  return trimmedPrompt;
};
