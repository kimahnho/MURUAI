# 선/화살표 요소 지침

> LineElement, ArrowElement 렌더링, 엔드포인트 드래그, 스트로크 스타일.

## 요소 타입

```typescript
interface LineElement {
  type: "line";
  start: Point;    // { x: number; y: number }
  end: Point;
  stroke: { color: string; width: number; style: "solid" | "dashed" | "dotted" };
  marker?: { start?: boolean; end?: boolean };
  transform?: Transform;
}

interface ArrowElement {
  type: "arrow";
  start: Point;
  end: Point;
  stroke: { color: string; width: number; style: "solid" | "dashed" | "dotted" };
  marker?: { start?: boolean; end?: boolean };  // 화살촉 위치
  transform?: Transform;
}
```

## 렌더링

- `Line.tsx` / `Arrow.tsx` — SVG 기반 렌더링
- 엔드포인트 핸들: 시작점/끝점 드래그 가능
- `TransformToolbar`: 회전/반전 버튼

## 인터랙션 (`useLineInteraction`)

- **엔드포인트 드래그**: 시작점 또는 끝점만 이동
- **전체 드래그**: 양쪽 포인트 동시 이동
- **스냅**: 엔드포인트 드래그 시 이동 중인 포인트만 스냅, 전체 드래그 시 중심점 스냅

### 이동 포인트 판별

```typescript
const isMovingStart = isMovingLineStart(nextLine, currentLine);
// → 시작점 변화량 > 끝점 변화량이면 시작점 이동 중
```

## 속성 편집

- `LinePropsContent.tsx` / `ArrowPropsContent.tsx`
- 편집 가능: 스트로크 색상/두께/스타일, 마커 위치
- 사이드바 메뉴: `"line-props"`, `"arrow-props"`

### 파생값

- **각도**: `Math.atan2(dy, dx) * 180/π` (0-360° 범위)
- **길이**: 두 점 사이 유클리드 거리

## 실수 방지

1. **Line과 Arrow의 marker 차이** — Arrow는 기본 `end: true`, Line은 모두 `false`
2. **스냅 분기 주의** — resize(엔드포인트)와 drag(전체)를 같은 브랜치에서 호출하지 않음

## 관련 파일

| 역할 | 경로 |
|------|------|
| 선 렌더러 | `src/features/editor/sections/canvas/elements/line/Line.tsx` |
| 선 툴바 | `src/features/editor/sections/canvas/elements/line/LineToolBar.tsx` |
| 화살표 렌더러 | `src/features/editor/sections/canvas/elements/arrow/Arrow.tsx` |
| 화살표 툴바 | `src/features/editor/sections/canvas/elements/arrow/ArrowToolBar.tsx` |
| 인터랙션 훅 | `src/features/editor/sections/canvas/elements/line/useLineInteraction.ts` |
| 속성 패널 (선) | `src/features/editor/sections/sidebar/content/LinePropsContent.tsx` |
| 속성 패널 (화살표) | `src/features/editor/sections/sidebar/content/ArrowPropsContent.tsx` |
