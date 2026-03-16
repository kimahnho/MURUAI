# 캔버스 인터랙션 지침

> 포인터 핸들링, 줌/팬, 키보드 단축키, 선택 상태, 스냅 가이드.

## 훅 의존 체인

```
useCanvasZoom → useCanvasStageSelection → useDesignPaperInteraction → useDesignPaperKeyboard → useSelectionState
```

- `useSnapGuides`는 `useDesignPaperInteraction`과 `useDesignPaperKeyboard`에서 사용 — Stage Selection에서는 스냅 미적용

## 포인터 세션 (`usePointerDragSession`)

3단계 드래그 감지:
1. **임계값 미달** (< 3px): 클릭 후보 — `onStart`/`onMove` 미호출
2. **임계값 초과** (≥ 3px): `onStart` 1회 → `onMove` 반복
3. **정리**: `pointerup | pointercancel | blur | visibilitychange(hidden)` — 5개 이벤트 리스너 해제

**주의**: 탭 전환(`visibilitychange`) 시 세션이 즉시 종료됨 — 드래그 중 탭 전환 = 세션 포기

## 줌 (`useCanvasZoom`)

```typescript
const A4_WIDTH = 210 * 3.7795;  // ≈ 793.7px
const A4_HEIGHT = 297 * 3.7795; // ≈ 1122.5px
const PADDING = 50;
```

- DPR 스케일링: `canvas.width = width * dpr` + `canvas.style.width` 분리 필수
- 줌 변경 시 뷰포트 중심 유지: `centerX * zoomRatio - clientWidth / 2`

## 스테이지 선택 (`useCanvasStageSelection`)

- **드래그 선택 임계값**: 3px (포인터 세션과 동일)
- **Shift+드래그**: 기존 선택에 추가 (additive)
- **선택 제외 대상**: `el.locked` 또는 `el.selectable === false`
- **포털 가드**: `[data-text-props-panel]`, `[data-context-menu-portal]` 클릭 시 선택 시작 안 함
- **RAF 쓰로틀**: 매 `pointermove`마다 아닌, `requestAnimationFrame`으로 프리뷰 업데이트

## 핵심 인터랙션 (`useDesignPaperInteraction`, 682줄)

### Rect 변경 (드래그/리사이즈 중)

```typescript
handleRectChange(elementId, nextRect)
```

- 활성 인터랙션 타입(`drag`/`resize`)에 따라 분기
- **그룹 선택 리사이즈**: `groupResizeRef` 스냅샷 기반
- **labelId 동기화**: `labelId`가 있는 도형 이동 시 라벨 텍스트도 함께 이동
- **이미지 채우기 스케일링**: `isImageFillElement()` → `computeScaledImageBox()`
- **감정 슬롯**: 드래그 **중**에만 `applyEmotionSlotRectUpdate()` 호출, 종료 시 호출 금지

### 드래그 상태 변경 (시작/종료)

```typescript
handleDragStateChange(elementId, isDragging, finalRect, context)
```

- **시작** (`isDragging=true`): `activeInteractionRef` 설정 + 그룹 스냅샷 생성
- **종료** (`isDragging=false`): 최종 패치 적용 → 그룹 스냅샷 정리 → `activeInteractionRef = null` → 스마트 가이드 클리어
- **TextBox 특수**: 너비 핸들 리사이즈 시작 시 `widthMode: "fixed"` 설정, 폰트 크기 패치는 종료 시 적용

### 라인/화살표 변경

- **리사이즈** (엔드포인트 드래그): 이동 중인 엔드포인트만 스냅
- **드래그** (전체 이동): 라인 중심점 스냅
- `isMovingLineStart()`: 어떤 엔드포인트가 이동 중인지 판별

## 스냅 가이드 (`useSnapGuides`)

9포인트 정렬 알고리즘:
```
X: [left, center, right] × 대상 요소 [left, center, right]
Y: [top, center, bottom] × 대상 요소 [top, center, bottom]
```

- **임계값**: 5px
- X축/Y축 독립 스냅 (X만 스냅, Y만 스냅 가능)
- 매 드래그 프레임마다 재계산 (`computeSnapGuides()`)

## 키보드 (`useDesignPaperKeyboard`)

| 우선순위 | 키 | 동작 |
|----------|-----|------|
| 1 | IME Process | 텍스트 편집 열기 |
| 2 | 인쇄 가능 문자 | 텍스트 요소 선택 시 문자로 초기화 |
| 3 | Ctrl+B | 볼드 토글 (텍스트만) |
| 4 | 화살표 키 | 선택 요소 1px 이동 + 스냅 가이드 (100ms 후 클리어) |
| 5 | Delete | 요소 또는 테이블 셀 삭제 |
| 6 | Escape | 선택 해제 + 편집 종료 |
| 7 | Tab/Shift+Tab | 다음/이전 요소 순환 (Y→X 정렬) |
| 8 | Ctrl+C/X/V | 클립보드 |

- `isEditableTarget(event.target)`: `<input>`, `<textarea>` 포커스 시 단축키 무시

## 선택 상태 (`useSelectionState`)

다중 선택 시 파생값 계산:
- **색상**: 첫 번째 잠금 해제 요소의 색상
- **폰트**: 첫 번째 잠금 해제 요소의 fontFamily/Weight/Size
- **테두리**: 모든 선택이 같은 도형 타입일 때만
- **정렬 배분**: `selectedElements.length >= 3`일 때 활성화

## 실수 방지

1. **activeInteractionRef 미정리**: `handleDragStateChange` 종료 시 반드시 `null`로 설정
2. **라인 중복 스냅**: resize와 drag 분기를 같은 브랜치에서 호출하지 않음
3. **그룹 드래그 시 라벨 미이동**: 단일 요소 드래그에서만 `labelId` 동기화 — 그룹에서는 별도 처리
4. **RAF 프리뷰 미취소**: cleanup에서 `cancelAnimationFrame` 호출 필수
5. **포털 클릭 오탐**: `shouldStartSelection`에 포털 마커 가드 필수

## 관련 파일

| 역할 | 경로 |
|------|------|
| 핵심 인터랙션 | `src/features/editor/sections/canvas/hooks/useDesignPaperInteraction.ts` |
| 포인터 세션 | `src/features/editor/sections/canvas/hooks/usePointerDragSession.ts` |
| 키보드 | `src/features/editor/sections/canvas/hooks/useDesignPaperKeyboard.ts` |
| 줌 | `src/features/editor/sections/canvas/hooks/useCanvasZoom.ts` |
| 휠 줌 | `src/features/editor/sections/canvas/hooks/useCanvasWheelZoom.ts` |
| 스테이지 선택 | `src/features/editor/sections/canvas/hooks/useCanvasStageSelection.ts` |
| 선택 상태 | `src/features/editor/sections/canvas/hooks/useSelectionState.ts` |
| 스냅 가이드 | `src/features/editor/sections/canvas/hooks/useSnapGuides.ts` |
| 스냅 변환 | `src/features/editor/sections/canvas/hooks/useSnapTransformRect.ts` |
| 그룹 드래그 | `src/features/editor/sections/canvas/hooks/useGroupOverlayDrag.ts` |
| 그룹 리사이즈 | `src/features/editor/utils/groupResize.ts` |
| 텍스트 리사이즈 | `src/features/editor/sections/canvas/utils/textResizePatch.ts` |
