# 이미지 채우기 시스템 지침

> 이미지 삽입 구독, cover box 계산, 다중 요소 타입 지원, 자동 네비게이션.

## 아키텍처

```
사이드바 패널 (감정/AAC/이미지 상징/업로드)
  → imageFillStore.requestImageFill(url, label?, size?, options?)
    → requestId 증가
      → useImageFillSubscription이 변경 감지
        → 선택된 요소에 이미지 채우기 또는 새 이미지 요소 생성
```

## 이미지 채우기 스토어 (`imageFillStore`)

```typescript
interface ImageFillStore {
  requestId: number;       // 구독 트리거 (시맨틱 의미 없음)
  imageUrl: string | null;
  label?: string;          // AAC/감정 카드 라벨 텍스트
  width?: number;          // 새 요소 생성 시 크기
  height?: number;
  forceInsert?: boolean;   // 선택 요소 없을 때 자동 삽입
  source?: string;         // "emotion" | "aac" | "library" | "upload" 등
}
```

- `requestImageFill()` 호출 시 Mixpanel `"이미지 추가"` 이벤트 자동 추적

## 삽입 크기 결정

| 소스 | 크기 | 결정 방식 |
|------|------|-----------|
| 이미지 상징 (library) | 최대 256px, 원본 비율 유지 | `new Image()` 로드 후 `naturalWidth/naturalHeight`로 비율 계산 |
| 감정 사진 (emotion) | 200×260 (photo), 200×200 (emoji) | 하드코딩 상수 |
| AAC (aac) | 200×200 | 하드코딩 상수 |

이미지 상징은 클릭 시 `new Image()`로 원본 크기를 읽어 비율을 유지한다. 로드 실패 시 256×256 fallback.

```typescript
const MAX_INSERT_SIZE = 256;
const ratio = img.naturalWidth / img.naturalHeight;
const width = ratio >= 1 ? MAX_INSERT_SIZE : Math.round(MAX_INSERT_SIZE * ratio);
const height = ratio >= 1 ? Math.round(MAX_INSERT_SIZE / ratio) : MAX_INSERT_SIZE;
```

## 구독 처리 (`useImageFillSubscription`)

### 새 이미지 요소 생성 (선택 없음 + `forceInsert`)

```typescript
if (activeSelectedIds.length === 0) {
  // 새 rect 요소 생성 (100, 100) 위치
  // source가 emotion/aac/library이면 자동 선택 안 함
}
```

### 기존 요소에 이미지 채우기

**지원 요소 타입:**
- `aacCard` (v2) — `fill` + 선택적 `label` 업데이트
- `emotionCard` (v2) — `fill` + 선택적 `label` 업데이트
- `ShapeElement` (rect/roundRect/ellipse/mosaic/circleMosaic) — `fill` + `imageBox`
- `imageSlot` (subType) — `fill` + `imageBox` + 플레이스홀더 텍스트 클리어

### Cover Box 계산 (`calculateCoverImageBox`)

```typescript
// CSS object-fit: cover 로직 — 이미지 비율 유지, 요소 완전 채움
calculateCoverImageBox(elementW, elementH, imageW?, imageH?)
→ { x, y, w, h }  // 이미지 위치/크기 (요소 내 좌표)
```

- `imageRatio > elementRatio` → 높이 기준 스케일 (좌우 잘림)
- `imageRatio ≤ elementRatio` → 너비 기준 스케일 (상하 잘림)
- 수평/수직 중앙 정렬

### 자동 네비게이션 (템플릿 카드 순서)

이미지 채우기 완료 후 다음 카드로 자동 선택 전환:

| 템플릿 타입 | 네비게이션 함수 | 정렬 기준 |
|------------|---------------|-----------|
| 감정 추론 | `getNextEmotionCardId()` | Y → X (행 우선) |
| AAC v1 | `getNextAacCardId()` | X → Y (열 우선) |
| AAC v2 | `getNextAacCardV2Id()` | X → Y (열 우선) |

- 정렬 허용 오차: `mmToPx(2)` (약 7.6px)
- 마지막 카드이면 네비게이션 안 함

### 라벨 텍스트 처리

- **직접 `labelId`**: 요소의 `labelId` 속성으로 연결된 텍스트 요소 업데이트
- **역검색**: `findLabelElementId(elements, shape, isLabelElement)` — 근접성 기반 라벨 매칭 (5mm 허용 오차)
- **플레이스홀더 클리어**: `"감정을 선택해주세요"` (감정 슬롯), imageSlot의 가이드 텍스트

## 이미지 채우기 유틸 (`imageFillUtils.ts`)

### 타입 가드

| 함수 | 판별 대상 |
|------|-----------|
| `isAacCardElement(els, el)` | 레거시 AAC (subType/labelId/라벨+테두리 규칙) |
| `isAacCardV2Element(el)` | v2 AAC (`type === "aacCard"`) |
| `isEmotionCardV2Element(el)` | v2 감정 (`type === "emotionCard"`) |
| `isEmotionInferenceCard(el)` | 감정 추론 (`subType === "emotionInference"` 또는 `#A5B4FC` 테두리) |
| `isAacLabelElement(el)` | AAC 라벨 (fontSize 14/18, center) |
| `isEmotionLabelElement(el)` | 감정 라벨 (fontSize 14/20, center, `#111827`) |

### 라벨 탐색 (`findLabelElementId`)

- 가로 겹침 + 세로 근접/내부 기준
- `tolerance = mmToPx(5)`
- 가장 가까운 라벨의 ID 반환

## 실수 방지

1. **`forceInsert` 사용 시 source 명시** — source에 따라 자동 선택 여부 결정
2. **이미지 채우기 후 `imageBox` 설정 필수** — 없으면 이미지가 요소 좌상단에 고정
3. **AAC 카드 y-offset** — AAC 카드는 라벨 영역 고려하여 `y - 5px` 보정
4. **라벨 역검색 정확도** — 요소 위치가 변경되면 라벨 매칭이 깨질 수 있음
5. **플레이스홀더 텍스트 리터럴 매칭** — 정확한 문자열로 비교하므로 변경 시 양쪽 수정 필수

## 관련 파일

| 역할 | 경로 |
|------|------|
| 이미지 채우기 스토어 | `src/features/editor/store/imageFillStore.ts` |
| 구독 훅 | `src/features/editor/hooks/useImageFillSubscription.ts` |
| 유틸리티 | `src/features/editor/utils/imageFillUtils.ts` |
| Cover Box 계산 | `src/features/editor/utils/imageFillUtils.ts` → `calculateCoverImageBox` |
| 이미지 라이브러리 UI | `src/features/editor/sections/sidebar/content/ImageLibraryContent.tsx` |
| 감정 콘텐츠 UI | `src/features/editor/sections/sidebar/content/EmotionContent.tsx` |
| AAC 콘텐츠 UI | `src/features/editor/sections/sidebar/content/AACContent.tsx` |
