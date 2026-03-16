# 감정 추론 활동 AI 스토리라인 생성 기능 지침

## 기능 개요

사용자가 주제를 입력하면 AI가 감정 추론 활동용 스토리 텍스트 10개를 생성하고,
기존 감정 추론 3페이지(표지/목차/치료목표) + AI 텍스트가 채워진 4페이지 형식 10장 = 총 13페이지를 생성한다.

## 감정 추론 템플릿 구조

### 4페이지 구성 (templateRegistry → emotionInference)

| 페이지 | 파일 | 역할 | AI 채울 항목 |
|--------|------|------|------------|
| 1 | `emotion_inference/page_1.ts` | 표지 (감정 선택 카드 4개) | 없음 — 고정 |
| 2 | `emotion_inference/page_2.ts` | 목차 | 없음 — 고정 |
| 3 | `emotion_inference/page_3.ts` | 치료목표 + 감정 어휘 | 없음 — 고정 |
| 4 | `emotion_inference/page_4.ts` | **본문 (스토리 1장)** | 제목 + 추론 문장 + 감정 카드 3개(이미지+라벨) |

### page_4 핵심 요소 (AI가 채울 대상)

```typescript
// page_4.ts의 text 요소들 (instantiateTemplate 후 CanvasElement 배열 인덱스 기준)
// index 2: 제목 텍스트 — text: "제목을 입력하세요"
// index 7: "아이는 __________" 텍스트 — text: "아이는 __________"
```

**주의**: `instantiateTemplate()`이 실행된 후의 `CanvasElement[]` 배열에서 `text` 타입인 요소를 `text` 내용으로 식별해야 한다.
인덱스 하드코딩 대신, 요소의 `text` 속성 값으로 찾는다.

```typescript
// ✅ 올바른 방식: text 내용으로 식별
const titleElement = elements.find(
  (el) => el.type === "text" && el.text === "제목을 입력하세요"
);
const sentenceElement = elements.find(
  (el) => el.type === "text" && el.text === "아이는 __________"
);

// ❌ 금지: 인덱스 하드코딩
const titleElement = elements[2];
```

## 템플릿 인스턴스화 경로

```
src/features/editor/templates/instantiateTemplate.ts
  → instantiateTemplate(template: Template): CanvasElement[]
```

`instantiateTemplate`은 `TemplateElement[]`를 `CanvasElement[]`(id 부여)로 변환한다.
page_4를 10장 복제할 때 각 장마다 개별 호출해야 한다 (id가 장마다 고유해야 함).

```typescript
import { instantiateTemplate } from "@/features/editor/templates/instantiateTemplate";
import { emotionInferencePage4 } from "@/features/editor/templates/emotion_inference/page_4";

// 장마다 개별 instantiate — id 충돌 방지
const storyElements = instantiateTemplate(emotionInferencePage4);
```

## 페이지 생성 경로 (`pageFactory.ts`)

`addTemplatePage` 함수가 템플릿을 페이지로 변환하는 정규 경로이나,
AI 생성 기능은 **직접 Page 객체를 생성**해 `setPages`에 주입한다.

```typescript
// Page 타입 (pageTypes.ts)
type Page = {
  id: string;          // crypto.randomUUID()
  pageNumber: number;
  templateId: string | null;
  orientation: "vertical" | "horizontal";
  elements: CanvasElement[];
  background?: { type: "image"; imageUrl: string } | { type: "color"; color: string };
  rev: number;
};
```

### AI 생성 페이지 삽입 패턴

```typescript
import { instantiateTemplate } from "@/features/editor/templates/instantiateTemplate";
import { emotionInferencePage1 } from "@/features/editor/templates/emotion_inference/page_1";
import { emotionInferencePage2 } from "@/features/editor/templates/emotion_inference/page_2";
import { emotionInferencePage3 } from "@/features/editor/templates/emotion_inference/page_3";
import { emotionInferencePage4 } from "@/features/editor/templates/emotion_inference/page_4";
import { withLogoCanvasElements } from "@/features/editor/utils/logoElement";

type StoryItem = { title: string; sentence: string; emotions: [string, string, string]; sceneGroup: number };

// buildEmotionStoryPages(stories, emotionImageMap, heroImageUrls?)로 호출
// emotionImageMap: Map<string, string> — 감정 라벨 → 이미지 URL
// heroImageUrls?: string[] — AI 생성 히어로 장면 이미지 URL 10개 (선택)
// patchStoryElements에서 제목, 추론 문장, 감정 카드 이미지, 감정 라벨 텍스트, 히어로 이미지를 모두 패치
```

## AI 호출 방식

### 엔드포인트

Gemini API(`gemini-2.5-flash`)를 `@google/genai` SDK로 직접 호출.
구현 위치: `src/features/editor/ai/generateEmotionStory.ts`

### 호출 시그니처

```typescript
generateEmotionStory(topic: string, availableLabels: string[]): Promise<StoryItem[]>
```

- `availableLabels`: DB(`emotion_photo`)에서 조회한 감정 라벨 목록. AI가 이 목록에서만 감정을 선택하도록 프롬프트에 주입.
- 호출 체인: `fetchEmotionImageMap(style)` → `availableLabels = [...map.keys()]` → `generateEmotionStory(topic, availableLabels)`

### 프롬프트 설계

```typescript
const buildPrompt = (topic: string, availableLabels: string[]) => `
당신은 언어치료 전문가입니다.

[사용 가능한 감정 라벨 — 반드시 이 목록에서만 선택]
${availableLabels.join(", ")}

[참고 예시]
${buildFewShotBlock(MOCK_FEW_SHOT_EXAMPLES)}

주제 "${topic}"에 맞는 감정 추론 활동용 짧은 이야기 10개:
- title: 이야기 제목 (10자 이내)
- sentence: "친구는 [이유/감정 상황]" 형식 (30자 이내, "친구는 "으로 시작)
- emotions: 감정 선택지 3개 배열 (위 감정 라벨 목록에서만 선택)

JSON만 출력:
[{ "title": "...", "sentence": "친구는 ...", "emotions": ["...", "...", "..."], "sceneGroup": 1 }, ...]
`;
```

### 응답 파싱

```typescript
const parseStoryResponse = (raw: string): StoryItem[] => {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  const valid = parsed.filter((item): item is StoryItem => {
    // title, sentence: string 검증
    // emotions: 문자열 3개 이상 배열 검증
  });
  return valid.slice(0, 10).map((item) => ({
    ...item,
    emotions: [item.emotions[0], item.emotions[1], item.emotions[2]],
  }));
};
```

## 구현 시 주의사항

### 1. 페이지 삽입 위치
`setPages`를 직접 호출해 현재 페이지 목록 끝에 추가하거나, 현재 선택 페이지 직후에 삽입한다.
`useTemplateStore.requestTemplate()`을 우회하고 `setPages`를 직접 사용한다.

### 2. 히스토리 기록
페이지 삽입 후 `recordHistory("AI 스토리라인 생성")`을 호출해 undo 스냅샷을 남긴다.

### 3. AI 로딩 상태
생성 중 UI:
- `EmotionInferenceChoiceModal`의 확인 버튼을 `isGenerating` 상태로 비활성화
- 버튼 텍스트: "생성하기" → "이미지 생성 중 (3/10)" (`generatingProgress` prop)
- 생성 중 모달 바깥 클릭 시 `handleClose` 가드: `if (isGenerating) return;` — 주제/스타일 상태 보존

### 4. 에러 처리
- AI 호출 실패 시 `showToast("스토리 생성에 실패했어요. 다시 시도해 주세요.")`
- 파싱 실패 시 동일 처리, console.error로 원본 응답 기록

### 5. `withLogoCanvasElements` 필수
모든 페이지 생성 시 `withLogoCanvasElements()`로 감싸야 로고 요소가 포함된다.
(`pageFactory.ts`의 모든 페이지 생성 경로 동일 적용)

### 6. 배너 페이지 필터링
`EmotionSceneBanner`는 `selectedPageId`를 받아 현재 선택된 페이지가 `storyPageIds`에 포함될 때만 표시. 다른 페이지로 이동하면 배너가 숨겨진다.

## 감정 이미지 자동 채우기

### 호출 체인 (AiTemplateContent.tsx)

```
onSelectAi(topic, imageStyle)
  → fetchEmotionImageMap(imageStyle)                        // DB에서 감정 라벨 → 이미지 URL 맵
  → availableLabels = [...map.keys()]                       // AI에 전달할 감정 목록 추출
  → generateEmotionStory(topic, labels)                     // AI가 emotions 포함 StoryItem[] 반환
  → generateEmotionSceneImages(stories, imageStyle, onProgress)  // AI 히어로 장면 이미지 10장 생성
  → buildEmotionStoryPages(stories, map, heroImageUrls)     // 이미지 자동 채우기 포함 13페이지 빌드
  → requestInsertPages(pages)
```

### 이미지 스타일 선택

```typescript
type EmotionImageStyle = "photo-boy" | "photo-girl";
```

- `EmotionInferenceChoiceModal`의 AI 주제 입력 화면에 라디오 버튼 2개
- `fetchEmotionImageMap(style)`: `emotion_photo` 테이블에서 `category = "boy" | "girl"` 필터

### patchStoryElements 패치 대상

1. **제목**: `text === "제목을 입력하세요"` → `story.title`
2. **추론 문장**: `text === "아이는 __________"` → `story.sentence` (widthMode: "fixed", w/x 명시 복원)
3. **감정 카드 3개**: `subType === "emotionInference"` 셰이프를 x좌표 순 정렬 → `emotions[0,1,2]` 매칭 → `fill: url(imageUrl)` + `imageBox`
4. **감정 라벨 3개**: 카드의 `labelId`로 연결된 텍스트 요소 → `"(감정)"` → 감정 이름

### 히어로 이미지 패치 대상

`buildEmotionStoryPages`에 `heroImageUrls`를 전달하면 page_4의 회색 히어로 박스에 장면 이미지를 채운다.

```typescript
// 히어로 박스 식별: fill="#D1D5DB" + subType 없음인 roundRect
if (heroImageUrl && el.type === "roundRect" && el.fill === "#D1D5DB" && !el.subType) {
  const imageBox = calculateCoverImageBox(el.w, el.h, 1024, 576);
  return { ...el, fill: `url(${heroImageUrl})`, imageBox, isStandaloneImage: true };
}
```

## 히어로 장면 이미지 생성

### 파이프라인 (`generateEmotionSceneImages.ts`)

```typescript
generateEmotionSceneImages(stories, imageStyle, onProgress?): Promise<string[]>
```

- **모델**: `gemini-2.5-flash-image`, `aspectRatio: "16:9"`
- **sceneGroup 기반 그룹별 순차 생성**: 같은 `sceneGroup`의 연속 장면은 첫 장면 이미지를 레퍼런스로 재활용하여 캐릭터/배경 일관성을 유지
  - 그룹 첫 장: 캐릭터 레퍼런스(boy/girl) + 프롬프트
  - 그룹 후속: 첫 장면 생성 이미지를 레퍼런스 + 일관성 유지 프롬프트
- **2단계 파이프라인**: Phase 1에서 그룹별 순차 base64 수집 (모두 성공해야 진행) → Phase 2에서 일괄 Cloudinary 업로드
- **캐릭터 참조 이미지**: `imageStyle`에 따라 `characterBoy` / `characterGirl` 로드 → Gemini에 인라인 이미지로 전달
- **한→영 번역**: `translateScenesToEnglish()` — 10개 장면을 1회 Gemini 호출로 일괄 번역 (실패 시 한국어 fallback)
- **재시도**: `MAX_RETRIES = 5`, `RETRY_DELAY_MS = 3000`
- **Cloudinary 폴더**: `muru_emotion_scene/{userId}`

### 다중 생성 세트 관리 (`emotionSceneStore.ts`)

감정추론 활동을 여러 번 실행해도 각 세트가 독립적으로 추적된다.

```typescript
// 배열로 다중 세트 관리 — 단일 값이 아님
pendingGenerations: PendingGeneration[];
addPendingGeneration: (data: PendingGeneration) => void;
removePendingGeneration: (storyPageIds: string[]) => void;
setBannerPhase: (storyPageIds: string[], phase: BannerPhase) => void;
```

- **세트 식별**: `storyPageIds[0]`(첫 번째 pageId)로 세트를 구분
- **dismiss/confirm**: 해당 세트만 제거 (`removePendingGeneration`)
- **페이지 삭제 동기화**: 배너 렌더 시 실제 존재하는 pageId만 필터링, 모두 삭제되면 세트 자동 제거

### 생성 메타데이터

생성 완료 시 `PageGenerationMeta[]`를 스토어에 저장 — 추후 페이지별 재생성(C.2) 구현 시 활용.

```typescript
interface PageGenerationMeta {
  pageIndex: number;
  originalPrompt: string;
  sceneGroup: number;
  isGroupFirst: boolean;
  groupFirstImageBase64: string | null;
  generatedImageUrl: string;
}
```

### Progress 콜백

```typescript
// AiTemplateContent.tsx에서 전달
const heroImageUrls = await generateEmotionSceneImages(
  stories, imageStyle,
  (current, total) => { setGeneratingProgress({ current, total }); },
);
// EmotionInferenceChoiceModal에 generatingProgress prop으로 전달
// 버튼 텍스트: "이미지 생성 중 (3/10)"
```

### 타입 안전성 주의

`CanvasElement`는 discriminated union이므로 감정 카드 필터링 시 반드시 타입 가드 사용:

```typescript
const emotionCards = elements.filter(
  (el): el is ShapeElement =>
    (el.type === "rect" || el.type === "roundRect" || el.type === "ellipse" || el.type === "mosaic" || el.type === "circleMosaic") &&
    el.subType === "emotionInference",
).sort((a, b) => a.x - b.x);
```

## 관련 파일 경로

| 역할 | 경로 |
|------|------|
| 템플릿 4페이지 | `src/features/editor/templates/emotion_inference/page_{1-4}.ts` |
| 템플릿 레지스트리 | `src/features/editor/templates/templateRegistry.ts` |
| 인스턴스화 | `src/features/editor/templates/instantiateTemplate.ts` |
| 페이지 팩토리 | `src/features/editor/utils/pageFactory.ts` |
| 로고 요소 | `src/features/editor/utils/logoElement.ts` |
| 선택 모달 | `src/features/editor/sections/sidebar/content/EmotionInferenceChoiceModal.tsx` (`skipChoice` prop으로 선택 화면 스킵 가능) |
| AI 스토리 생성 | `src/features/editor/ai/generateEmotionStory.ts` |
| AI 히어로 이미지 생성 | `src/features/editor/ai/generateEmotionSceneImages.ts` |
| 생성 메타데이터 스토어 | `src/features/editor/store/emotionSceneStore.ts` |
| 히어로 이미지 배너 | `src/features/editor/sections/canvas/EmotionSceneBanner.tsx` |
| 히어로 이미지 모달 | `src/features/editor/sections/canvas/EmotionSceneImageModal.tsx` |
| 페이지 빌더 | `src/features/editor/utils/buildEmotionStoryPages.ts` |
| 감정 이미지 조회 | `src/features/editor/utils/fetchEmotionImageMap.ts` |
| 이미지 채우기 유틸 | `src/features/editor/utils/imageFillUtils.ts` |
| 진입점 1 (템플릿 탭) | `src/features/editor/sections/sidebar/content/TemplateContent.tsx` |
| 진입점 2 (AI 탭) | `src/features/editor/sections/sidebar/content/AiTemplateContent.tsx` (`skipChoice` — 바로 주제 입력) |
| Page 타입 | `src/features/editor/model/pageTypes.ts` |
| CanvasElement 타입 | `src/features/editor/model/canvasTypes.ts` |
| 캐릭터 참조 이미지 | `src/shared/assets/characters/{boy.png, girl.png}` |
