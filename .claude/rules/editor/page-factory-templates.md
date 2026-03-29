# 페이지 팩토리 & 템플릿 지침

> 페이지 생성, 템플릿 인스턴스화, 로고 주입, 요소 팩토리.

## 페이지 팩토리 (`pageFactory.ts`)

### 주요 함수

| 함수 | 용도 |
|------|------|
| `buildInitialPages(doc, fallbackOrientation)` | 빈 문서 시 1페이지 생성 |
| `applyTemplateToCurrentPage(config)` | 현재 페이지를 템플릿으로 교체 |
| `addTemplatePage(config)` | 새 템플릿 페이지 추가 (`afterPageId`로 삽입 위치 지정) |
| `addAacBoardPage(config)` | Legacy AAC 보드 (v1, tempId 매핑) |
| `addAacBoardPageV2(config)` | Modern AAC 보드 (v2, `type: "aacCard"`) |
| `addStoryBoardPage(config)` | 스토리보드 요소 |
| `addShapeElement(pageId, type, setPages, getOrientation)` | 단일 도형 추가 |
| `addAacCardElement(pageId, setPages, getOrientation)` | 단일 AAC 카드 추가 |

### 필수 패턴

```typescript
// 1. 모든 페이지 생성 시 로고 요소 주입
elements: withLogoCanvasElements(rawElements)

// 2. ID 생성은 crypto.randomUUID()
const newPageId = crypto.randomUUID();

// 3. 페이지 수정 후 리비전 범프
bumpPageRevision(page)

// 4. 다중 페이지 삽입 후 페이지 번호 재인덱싱
pages.forEach((p, i) => { p.pageNumber = i + 1; });
```

### 기본 요소 크기

| 요소 | 크기 | 채우기 |
|------|------|--------|
| Shape | `mmToPx(78)` (≈295px) | `#b7c3ff` |
| AacCard | `mmToPx(40)` (≈151px) | 흰색, 테두리 `#E5E7EB` |
| AacCard 라벨 | — | `"단어"`, fontSize 18 |

### AAC v1 vs v2

- **v1**: `tempId` → `idMap`으로 `labelId` 참조 매핑 (레거시)
- **v2**: `type: "aacCard"` 복합 요소, `tempId` 불필요

## 템플릿 레지스트리 (`templateRegistry.ts`)

### 구조

```typescript
TEMPLATE_REGISTRY = {
  [templateId]: {
    id: string;
    label: string;
    template?: Template;          // 단일 페이지
    pages?: Template[];           // 다중 페이지 (emotionInference만)
    orientation: "vertical-only" | "horizontal-only" | "free";
  }
}
```

### 템플릿 카테고리 (36개)

| 카테고리 | 템플릿 |
|----------|--------|
| 감정 | emotionInference (4페이지), emotionWorksheet, normal_1/2, emotionDiary |
| 어휘 | vocabularyLearningCard, wordPair |
| 쓰기 | fiveSpaceWritingNote, tenSpaceWritingNote, lineNote×3, dictationPractice, yellowDiaryLines |
| AAC/시각 | findItem, visualSchedule, labelSheet3x8, pictureSchedule |
| 선긋기 | wavyLineTracing, variousLineTracing, crossLineTracing, easyCrossLineTracing, straightLineTracing |
| 기차 | trainTemplate (2페이지, horizontal-only), trainTemplate2 (2페이지, horizontal-only) |
| 색칠공부 | coloringPage1~5 (배경 이미지 기반, vertical-only) |
| 점선 따라그리기 | dotTracingPage1~5 (배경 이미지 기반, vertical-only) |

### Orientation 제약

- `"vertical-only"`: 세로 강제
- `"horizontal-only"`: 가로 강제 (기차 템플릿)
- 다중 페이지는 `pages[]` 배열 사용 (emotionInference, trainTemplate, trainTemplate2)

### 전체적용 전용 템플릿

기차 템플릿처럼 항상 전체 페이지를 적용하는 템플릿은 `useTemplateContentState.ts`에서 `MultiPageTemplateDialog`를 스킵하고 바로 `requestTemplate()`을 호출한다.

### 배경 이미지 시스템

| 소스 | 템플릿 | 저장 위치 |
|------|--------|-----------|
| 로컬 정적 import | 9개 (쓰기노트, 줄노트, 일기 등) | `templates/template_pdf/{name}/preview.png` |
| Cloudinary 원격 URL | 기차 템플릿 1/2 | `muru-templates/admin/{template-name}/` |

- `getTemplateBackground(templateId, pageIndex?)` — 페이지별 다른 배경 지원
- Cloudinary URL은 `pageFactory.ts` 상단 상수로 정의
- `template_images` Supabase 테이블에 경로 저장 (RLS 전체 read, `user_id`/`user_role` 추적)

### 페이지 삭제 시 배경 리셋

`handleDeletePage`(마지막 페이지)와 `handleClearPage` 모두에서 `background: { type: "none" }` 필수:
```typescript
bumpPageRevision({
  ...page,
  templateId: null,
  background: { type: "none" as const },
  elements: withLogoCanvasElements([]),
});
```

## 템플릿 인스턴스화 (`instantiateTemplate`)

```typescript
instantiateTemplate(template: Template): CanvasElement[]
```

### 2-pass ID 매핑

1. **1st pass**: 모든 `tempId` → 새 UUID로 `idMap` 구성
2. **2nd pass**: 각 요소에 UUID 할당 + `labelId`를 `idMap`으로 해석 + `fitTemplateTextElement()` 적용

**주의**: 매 호출마다 새 UUID 생성 → 같은 템플릿을 여러 번 인스턴스화해도 ID 충돌 없음

## 로고 요소

```typescript
// 템플릿 레벨 (인스턴스화 전)
withLogoTemplateElements(templateElements)

// 캔버스 레벨 (인스턴스화 후)
withLogoCanvasElements(canvasElements)
```

두 함수는 다름 — 전자는 `TemplateElement[]`, 후자는 `CanvasElement[]`용

- 로고 이미지: `public/main_logo.png` 고정 경로 — 빌드 해시 없음
- `migrateLogoFill(pages)`: 문서 로드 시 기존 해시 URL을 고정 URL로 교체 (`useDocumentLoader`에서 호출)
- **`src/shared/assets/logo/` import를 canvas_data에 저장하면 안 됨** — 빌드마다 URL이 변경됨

## 실수 방지

1. **`withLogoCanvasElements()` 누락 금지** — 모든 페이지 생성 경로에서 필수
2. **`bumpPageRevision()` 누락 금지** — 히스토리 시그니처 캐시 무효화 필요
3. **다중 페이지 삽입 후 페이지 번호 재인덱싱 필수**
4. **`stripStyleTags(el.richText, "fontFamily")`** — `buildInitialPages`에서 인라인 폰트 제거
5. **v1 AAC `tempId` → UUID 매핑 유지** — 레거시 코드이므로 삭제하지 않음

## 관련 파일

| 역할 | 경로 |
|------|------|
| 페이지 팩토리 | `src/features/editor/utils/pageFactory.ts` |
| 템플릿 레지스트리 | `src/features/editor/templates/templateRegistry.ts` |
| 인스턴스화 | `src/features/editor/templates/instantiateTemplate.ts` |
| 템플릿 스토어 | `src/features/editor/store/templateStore.ts` |
| 템플릿 적용 훅 | `src/features/editor/hooks/useTemplateApplyActions.ts` |
| 템플릿 상태 훅 | `src/features/editor/sections/sidebar/hooks/useTemplateContentState.ts` |
| 기차 템플릿 1 | `src/features/editor/templates/train_template/page_{1,2}.ts` |
| 기차 템플릿 2 | `src/features/editor/templates/train_template_2/page_{1,2}.ts` |
| 로고 요소 유틸 | `src/features/editor/utils/logoElement.ts` |
| 페이지 리비전 | `src/features/editor/utils/pageRevision.ts` |
