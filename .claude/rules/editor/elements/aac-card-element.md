# AAC 카드 요소 지침

> AacCardElement 복합 요소 렌더링, 라벨 편집, 이미지 채우기, 보드 생성.

## 요소 구조

`AacCardElement` (`type: "aacCard"`) — 이미지 영역 + 라벨 텍스트를 하나의 요소로 구성.

```typescript
interface AacCardElement {
  type: "aacCard";
  fill: string;              // 이미지 URL 또는 색상
  backgroundColor: string;   // 이미지 뒤 배경색
  imageBox?: ImageBox;
  label: { text: string; position: "top" | "bottom" | "none"; style: AacCardLabelStyle };
  border: { enabled: boolean; color: string; width: number; style: string };
  radius: number;
  transform?: Transform;
}
```

## 렌더링 (`AacCardBox.tsx`)

- `RoundBox` 래핑 — 이미지 채우기/리사이즈/회전 기능 상속
- 라벨: `children`으로 RoundBox에 전달

### 라벨 높이

```typescript
const labelHeight = clamp(rect.height * 0.22, MIN_LABEL_HEIGHT(20), MAX_LABEL_HEIGHT(45));
```

### 라벨 위치에 따른 이미지 박스 오프셋

```typescript
const offset = label.position === "bottom" ? -(labelHeight / 2) : labelHeight / 2;
adjustedImageBox = { ...imageBox, y: imageBox.y + offset };
```

### 라벨 편집

- 더블클릭 → `contentEditable` 모드 + 텍스트 전체 선택
- Enter: 커밋
- Escape: 복원
- Blur: 자동 커밋
- `nowrap` + `text-overflow: ellipsis`

## AAC 보드 생성 (`pageFactory.ts`)

### v2 (현재)

`addAacBoardPageV2(config)` — 그리드 배치 + `type: "aacCard"` 자동 생성

### v1 (레거시)

`addAacBoardPage(config)` — `tempId` → `idMap` 매핑 기반 (레거시, 삭제하지 않음)

## 속성 편집 (`AacCardPropsContent`)

- 사이드바 `"aacCard-props"` 메뉴
- 이미지 있으면 "박스" 탭, 없으면 "AAC" 탭 자동 전환
- 편집 가능: 라벨 위치/스타일, 테두리, 배경색, 둥글기, 레이어

## 이미지 채우기

- `useImageFillSubscription`에서 `isAacCardV2Element()` 판별
- 이미지 삽입 시 `calculateCoverImageBox()` + y-offset `-5px` (라벨 공간)
- 이미지 삽입 후 자동 네비게이션: `getNextAacCardV2Id()` (X→Y 열 우선)

## 실수 방지

1. **감정 슬롯(`subType: "emotionSlot"/"emotionInference"`)은 AAC 패널에서 제외**
2. **v1 레거시 코드 삭제 금지** — 기존 문서와의 하위 호환
3. **라벨 높이 계산은 동적** — 요소 크기에 비례 (고정값 아님)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 렌더러 | `src/features/editor/sections/canvas/elements/aac_card/AacCardBox.tsx` |
| 속성 패널 | `src/features/editor/sections/sidebar/content/AacCardPropsContent.tsx` |
| AAC 콘텐츠 | `src/features/editor/sections/sidebar/content/AACContent.tsx` |
| 보드 스토어 | `src/features/editor/store/aacBoardStore.ts` |
| 페이지 팩토리 | `src/features/editor/utils/pageFactory.ts` |
| 이미지 채우기 | `src/features/editor/hooks/useImageFillSubscription.ts` |
