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
| 4 | `emotion_inference/page_4.ts` | **본문 (스토리 1장)** | 제목 + "아이는 __________" 텍스트 |

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

type StoryItem = { title: string; sentence: string };

const buildAiStoryPages = (stories: StoryItem[]): Page[] => {
  // 고정 3페이지
  const fixedPages: Page[] = [
    emotionInferencePage1,
    emotionInferencePage2,
    emotionInferencePage3,
  ].map((template) => ({
    id: crypto.randomUUID(),
    pageNumber: 0,
    templateId: "emotionInference",
    orientation: "vertical" as const,
    elements: withLogoCanvasElements(instantiateTemplate(template)),
    rev: 0,
  }));

  // AI 스토리 10장
  const storyPages: Page[] = stories.map(({ title, sentence }) => {
    const elements = withLogoCanvasElements(
      instantiateTemplate(emotionInferencePage4)
    );
    // 제목과 "아이는 ___" 텍스트를 AI 생성 내용으로 교체한다.
    const patched = elements.map((el) => {
      if (el.type === "text" && el.text === "제목을 입력하세요") {
        return { ...el, text: title };
      }
      if (el.type === "text" && el.text === "아이는 __________") {
        return { ...el, text: sentence };
      }
      return el;
    });
    return {
      id: crypto.randomUUID(),
      pageNumber: 0,
      templateId: "emotionInference",
      orientation: "vertical" as const,
      elements: patched,
      rev: 0,
    };
  });

  const allPages = [...fixedPages, ...storyPages];
  return allPages.map((page, index) => ({ ...page, pageNumber: index + 1 }));
};
```

## AI 호출 방식

### 엔드포인트

Gemini API를 프록시하는 Supabase Edge Function 또는 직접 호출.
현재 프로젝트에 AI 이미지 생성 경로(`ai_generated_images`)가 있으나 텍스트 생성 경로는 미구현 상태.

**권장 구현 위치**: `src/features/editor/ai/generateEmotionStory.ts` (신규)

### 프롬프트 설계

```typescript
const buildPrompt = (topic: string) => `
당신은 언어치료 전문가입니다.
주제: "${topic}"

감정 추론 활동을 위한 짧은 이야기 10개를 JSON 배열로 생성해주세요.
각 이야기는 아래 형식을 따릅니다:
- title: 이야기 제목 (10자 이내)
- sentence: "아이는 [상황 설명]" 형식의 문장 (30자 이내, "아이는 "으로 시작)

JSON만 출력하세요 (설명 없음):
[
  { "title": "...", "sentence": "아이는 ..." },
  ...
]
`;
```

### 응답 파싱

```typescript
type StoryItem = { title: string; sentence: string };

const parseStoryResponse = (raw: string): StoryItem[] => {
  // JSON 블록 추출 (markdown 코드펜스 대응)
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("JSON 파싱 실패");
  const parsed = JSON.parse(jsonMatch[0]) as unknown[];
  return parsed
    .filter(
      (item): item is StoryItem =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "sentence" in item
    )
    .slice(0, 10);
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
- `EmotionInferenceChoiceModal`의 확인 버튼을 `isLoading` 상태로 비활성화
- 버튼 텍스트: "생성하기" → "생성 중..."

### 4. 에러 처리
- AI 호출 실패 시 `showToast("스토리 생성에 실패했어요. 다시 시도해 주세요.")`
- 파싱 실패 시 동일 처리, console.error로 원본 응답 기록

### 5. `withLogoCanvasElements` 필수
모든 페이지 생성 시 `withLogoCanvasElements()`로 감싸야 로고 요소가 포함된다.
(`pageFactory.ts`의 모든 페이지 생성 경로 동일 적용)

## 관련 파일 경로

| 역할 | 경로 |
|------|------|
| 템플릿 4페이지 | `src/features/editor/templates/emotion_inference/page_{1-4}.ts` |
| 템플릿 레지스트리 | `src/features/editor/templates/templateRegistry.ts` |
| 인스턴스화 | `src/features/editor/templates/instantiateTemplate.ts` |
| 페이지 팩토리 | `src/features/editor/utils/pageFactory.ts` |
| 로고 요소 | `src/features/editor/utils/logoElement.ts` |
| 선택 모달 (신규) | `src/features/editor/sections/sidebar/content/EmotionInferenceChoiceModal.tsx` |
| AI 생성 함수 (신규) | `src/features/editor/ai/generateEmotionStory.ts` |
| Page 타입 | `src/features/editor/model/pageTypes.ts` |
| CanvasElement 타입 | `src/features/editor/model/canvasTypes.ts` |

## 구현 순서 (권장)

1. `generateEmotionStory.ts` — AI 호출 + 파싱 함수
2. `buildAiStoryPages()` — Page 배열 빌더 (위 패턴 참고)
3. `EmotionInferenceChoiceModal` → `onSelectAi` 콜백에서 위 두 함수 호출 + `setPages` 주입
4. `recordHistory` 연결 — DesignPage 또는 MainSection에서 ref로 전달
