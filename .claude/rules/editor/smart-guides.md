# 스마트 가이드 (정렬 스냅) 지침

> 요소 이동/리사이즈 시 다른 요소 및 페이지 경계에 자동 정렬.

## 알고리즘

### 9포인트 정렬

활성 요소의 3포인트 × 대상 요소의 3포인트:
```
X축: [left, center, right] × 대상 [left, center, right]
Y축: [top, center, bottom] × 대상 [top, center, bottom]
```

### 스냅 판정

1. 활성 요소 포인트 수집
2. 캔버스 경계 + 다른 요소에서 대상 포인트 수집
3. X축/Y축 독립적으로 최소 거리 매칭
4. 거리 ≤ `snapThreshold` (3px) → 스냅 적용 + 가이드 라인 생성

## 상수

| 상수 | 값 | 용도 |
|------|-----|------|
| `threshold` | 6px | 가이드 표시 범위 |
| `snapThreshold` | 3px | 실제 위치 보정 범위 |

## 가이드 라인 타입

```typescript
type AlignmentGuide = {
  id: string;
  orientation: "vertical" | "horizontal";
  reason: "center" | "edge" | "spacing";
  position: number;     // 가이드 좌표 (px)
  start: number;        // 교차축 시작
  end: number;          // 교차축 끝
  spacing?: {           // spacing 전용 메타데이터
    gapStart: number;   // 간격 시작 (주축)
    gapEnd: number;     // 간격 끝 (주축)
    crossCenter: number; // 교차축 중심 (라벨 위치)
  };
};
```

- 중복 제거: `key = "{orientation}-{reason}-{position}"` 기반

## 동기 접근 패턴

```typescript
// 드래그 중 최신 스냅 오프셋을 동기적으로 읽기 (re-render 없이)
snapOffsetRef.current = { x, y };
```

- `snapOffsetRef`는 `useState`가 아닌 `useRef`로 관리
- 드래그 핸들러에서 직접 접근 (비동기 state 업데이트 대기 없음)

## 간격 스냅 (spacing)

드래그 중 인접 요소 쌍의 간격(gap)이 동일한 위치에 스냅한다.

### 알고리즘 (`computeSpacingSnap`)

1. `otherRects`를 주축 기준 정렬
2. 인접 쌍 gap 테이블 구축 (교차축 겹침 + 양수 gap만, `MIN_GAP_PX = 2`)
3. 드래그 요소의 좌/우(또는 상/하) 이웃 탐색
4. 현재 gap과 기존 gap 테이블 매칭 → 스냅 오프셋 계산
5. 매칭된 모든 동일 gap에 spacing 가이드 생성 (최대 `MAX_SPACING_GUIDES = 5`)

### 우선순위

- edge/center 스냅이 먼저 → 매칭되면 해당 축에서 spacing 스킵
- spacing은 **드래그 전용** (resize 시 비활성)

### 시각 표시 (`SmartGuideOverlay`)

- 간격 선 (1px 빨간색) + 양쪽 T자 마커 (5px)
- 선 위에 갭 px 숫자 라벨 (빨간 배경 흰 글씨, 10px)

## 렌더링 (`SmartGuideOverlay`)

- `overflow-hidden` 래퍼(`absolute inset-0`)로 감싸 페이지 바깥 가이드 클리핑
- Z-Index: 20 (`canvas-architecture.md` 레이어 구조 참조)
- `reason === "spacing"` → `SpacingGuide` 컴포넌트로 렌더링 (간격 선 + T자 마커 + 숫자 라벨)

## 연동 훅

| 훅 | 스냅 적용 대상 |
|----|---------------|
| `useDesignPaperInteraction` | 도형/이미지 이동/리사이즈 |
| `useDesignPaperKeyboard` | 화살표 키 이동 (100ms 후 클리어) |
| `useSnapTransformRect` | 변환(회전/반전) 시 정렬 |

**주의**: `useCanvasStageSelection`(드래그 선택)에서는 스냅 미적용.

## 관련 파일

| 역할 | 경로 |
|------|------|
| 스마트 가이드 모델 | `src/features/editor/model/useSmartGuides.ts` |
| 스냅 가이드 훅 | `src/features/editor/sections/canvas/hooks/useSnapGuides.ts` |
| 스냅 변환 | `src/features/editor/sections/canvas/hooks/useSnapTransformRect.ts` |
| 가이드 오버레이 | `src/features/editor/sections/canvas/SmartGuideOverlay.tsx` |
