# 요소 패널 스토어 지침

> 선택 요소에 따른 동적 사이드바 패널 전환, PanelData discriminated union, 편집 콜백.

## 아키텍처

```
요소 선택 변경 → MainSection에서 PanelData 계산 → elementPanelStore.setPanelData()
→ 사이드바 메뉴 자동 전환 → 해당 PropsContent 컴포넌트 렌더링
```

## PanelData 타입 (discriminated union)

| type | 대상 | 속성 패널 |
|------|------|-----------|
| `"shape"` | rect/roundRect/ellipse/mosaic/circleMosaic | `ShapePropsContent` |
| `"line"` | line | `LinePropsContent` |
| `"arrow"` | arrow | `ArrowPropsContent` |
| `"text"` | text | `TextPropsContent` |
| `"aac"` | AAC 보드 요소 | `AacPropsContent` |
| `"aacCardV2"` | aacCard | `AacCardPropsContent` |
| `"emotionCard"` | emotionCard | `EmotionCardPropsContent` |
| `"multi"` | 다중 선택 | `MultiPropsContent` |

## 메뉴 키 패턴

`"<type>-props"` (예: `"shape-props"`, `"text-props"`)
- `MENU_ITEMS`에 없음 — 요소 선택 시에만 자동 표시
- 선택 해제 → 이전 메뉴로 복원

## 콜백 인프라

### TextEditingCallbacks (텍스트 편집 중)

`useTextBoxEditingHandlers`에서 등록, blur 시 해제:
- `onBold`, `onItalic`, `onUnderline`, `onColor`, `onFontFamily`, `onFontSize`, `onFontWeight`
- `onAlignX`, `onAlignY`, `onLineHeight`
- 총 20+ 콜백

### MultiCallbacks (다중 선택)

`MainSection`에서 `setMultiCallbacks`로 동기화:
- `onColorChange`, `onFontFamilyChange`, `onBorderChange`
- `distributeHorizontal`, `distributeVertical`
- `changeAllMatchingColors`, `changeAllMatchingFonts`
- 총 15+ 콜백

### 공통 콜백

- `updateElement(id, patch)`: 요소 속성 패치
- `updateLines()`: 라인/화살표 업데이트
- `moveLayer(direction)`: 레이어 순서 변경

## `setPanelData` 호출 패턴

```typescript
// MainSection에서 원자적으로 패널 + 콜백 설정
setPanelData(panelData, updateElement, updateLines);
```

- 요소 선택이 바뀔 때마다 `useMemo`로 새 PanelData 계산
- `useEffect`로 사이드바 메뉴 동기화

## 실수 방지

1. **텍스트 편집 콜백 등록/해제 타이밍** — 편집 시작 시 등록, blur 시 해제 필수
2. **다중 선택 콜백 동기화** — MainSection에서만 설정, 패널 컴포넌트에서 직접 설정 금지
3. **`type` 필드로 분기** — `panelData.type === "shape"` 등으로 타입 가드 사용

## 관련 파일

| 역할 | 경로 |
|------|------|
| 패널 스토어 | `src/features/editor/store/elementPanelStore.ts` |
| 패널 동기화 | `src/features/editor/shared/MainSection.tsx` |
| 도형 패널 | `src/features/editor/sections/sidebar/content/ShapePropsContent.tsx` |
| 텍스트 패널 | `src/features/editor/sections/sidebar/content/TextPropsContent.tsx` |
| 선 패널 | `src/features/editor/sections/sidebar/content/LinePropsContent.tsx` |
| 화살표 패널 | `src/features/editor/sections/sidebar/content/ArrowPropsContent.tsx` |
| AAC 카드 패널 | `src/features/editor/sections/sidebar/content/AacCardPropsContent.tsx` |
| 감정 카드 패널 | `src/features/editor/sections/sidebar/content/EmotionCardPropsContent.tsx` |
| 다중 선택 패널 | `src/features/editor/sections/sidebar/content/MultiPropsContent.tsx` |
| 레이어 패널 | `src/features/editor/sections/sidebar/content/LayerPanel.tsx` |
