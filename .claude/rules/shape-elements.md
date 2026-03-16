# 도형 요소 지침

> rect, roundRect, ellipse, mosaic, circleMosaic 렌더링, 인터랙션, 속성 편집.

## 요소 타입

`ShapeElement` (discriminated union in `canvasTypes.ts`):
- `type`: `"rect" | "roundRect" | "ellipse" | "mosaic" | "circleMosaic"`
- 공통 속성: `fill`, `border`, `borderRadius`, `imageBox`, `imageScale`, `imageOffset`, `transform`, `text`, `textStyle`, `subType`, `labelId`

## RoundBox 컴포넌트 (공통 렌더러)

모든 도형 타입이 `RoundBox.tsx`를 통해 렌더링됨 (AacCardBox, EmotionCardBox도 래핑).

### 상태 이중 관리 패턴

```typescript
// Props 우선, 없으면 로컬 fallback
const [localIsImageEditing, setLocalIsImageEditing] = useState(false);
const isImageEditing = isImageEditingProp ?? localIsImageEditing;
```

### Ref 동기화

`rectRef`, `imageScaleRef`, `imageOffsetRef`, `imageBoxRef`를 `useEffect`로 props와 동기화 — 인터랙션 훅에서 ref로 직접 접근.

### 이미지 채우기 감지

```typescript
const isImageFill = fill.startsWith("url(") || fill.startsWith("data:");
```

### Border Overlay 패턴

외부 div에 CSS `border`를 직접 적용하지 않음 — 별도 overlay div로 렌더링:

```typescript
{border?.enabled && !isImageEditing && (
  <div style={{
    position: "absolute", inset: 0,
    border: `${border.width}px ${borderStyle} ${border.color}`,
    borderRadius, pointerEvents: "none", boxSizing: "border-box", zIndex: 1,
  }} />
)}
```

### Transform

```typescript
const elementTransformStyle = [
  transform?.rotation ? `rotate(${transform.rotation}deg)` : "",
  transform?.flipX ? "scaleX(-1)" : "",
  transform?.flipY ? "scaleY(-1)" : "",
].filter(Boolean).join(" ");
```

## 인터랙션 (`useRoundBoxInteraction`)

### 액션 타입

`drag | resize | imageScale | imageMove | imageBoxResize | imageBoxMove`

### 리사이즈

- **Shift+코너**: 가로세로 비율 유지 (`aspectRatio = width/height`)
- **측면만**: 독립 너비/높이 조절
- **최소 제약**: `minWidth`/`minHeight` (기본 80px) 위반 시 위치 보정

### 이미지 스케일

- 범위: 0.5–3.0 (`imageScale` 클램핑)
- 이미지 편집 모드(`isImageEditing`)에서 드래그/리사이즈

### Shift+클릭 선택

다중 선택 상태에서 움직임 없이 클릭 → 단일 선택으로 전환

## 속성 편집 (`ShapePropsContent`)

사이드바 패널에서 편집 가능한 속성:
- 채우기 색상 / 이미지
- 테두리 (색상, 두께, 스타일: solid/dashed/dotted/double)
- 둥글기 (borderRadius)
- 레이어 순서 (위/아래)

## Mosaic 변형

- `MosaicBox`: 격자 모자이크 패턴 렌더링
- `CircleMosaicBox`: 원형 모자이크 패턴 렌더링
- 둘 다 `RoundBox` 기반이지만 fill 렌더링 로직이 다름

## 실수 방지

1. **Border를 외부 div에 직접 적용 금지** — overlay div 패턴 사용 (상세: `canvas-architecture.md`)
2. **이미지 채우기 요소에서 "이미지 업로드" 섹션 숨김** — `ShapePropsContent`에서 `isImageFill` 체크
3. **감정 슬롯(`subType: "emotionSlot"/"emotionInference"`)은 도형 패널에서 제외** — 전용 패널 없음

## 관련 파일

| 역할 | 경로 |
|------|------|
| 공통 렌더러 | `src/features/editor/sections/canvas/elements/round_box/RoundBox.tsx` |
| 리사이즈 핸들 | `src/features/editor/sections/canvas/elements/round_box/ResizeHandles.tsx` |
| 인터랙션 훅 | `src/features/editor/sections/canvas/elements/round_box/useRoundBoxInteraction.ts` |
| 모자이크 | `src/features/editor/sections/canvas/elements/round_box/MosaicBox.tsx` |
| 원형 모자이크 | `src/features/editor/sections/canvas/elements/round_box/CircleMosaicBox.tsx` |
| 속성 패널 | `src/features/editor/sections/sidebar/content/ShapePropsContent.tsx` |
| 요소 팩토리 | `src/features/editor/utils/pageFactory.ts` |
