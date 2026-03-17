---
paths:
  - "src/features/editor/store/elementPanelStore.ts"
  - "src/features/editor/shared/MainSection.tsx"
  - "src/features/editor/shared/ColorPickerPopover.tsx"
  - "src/features/editor/shared/InlineFontPicker.tsx"
  - "src/features/editor/sections/sidebar/content/*PropsContent.tsx"
  - "src/features/editor/utils/layerUtils.ts"
---

# Editor — 사이드바 속성 패널 지침

> 에디터 핵심 아키텍처 및 파일 구조: `.claude/rules/editor.md`

## 요소 속성 사이드바 패널 (elementPanelStore 패턴)

요소 선택 시 사이드바에 속성 편집 패널이 자동으로 열린다. Table은 기존 `tableStore` 패턴을 유지하고, 나머지 요소는 `elementPanelStore`를 사용한다.

### 관련 파일
- 스토어: `src/features/editor/store/elementPanelStore.ts`
- 동기화: `src/features/editor/shared/MainSection.tsx` (useMemo + useEffect)
- 패널 UI: `src/features/editor/sections/sidebar/content/*PropsContent.tsx`
- 레이어 유틸: `src/features/editor/utils/layerUtils.ts`

### elementPanelStore 동기화 패턴

```typescript
// MainSection.tsx 훅 본체
// 선택 요소 타입에 따라 PanelData를 계산하고 사이드바를 자동 열기한다.
const elementPanelData: PanelData = useMemo(() => {
  if (shapeToolbarData) return { type: "shape", ... };
  if (lineToolbarData) return { type: lineToolbarData.element.type, ... };
  if (aacToolbarData) return { type: "aac", ... };
  if (selectedIds.length === 1 && el?.type === "text") return { type: "text", ... };
  if (isMultiColorSelection) return { type: "multi" };
  return null;
}, [...]);

useEffect(() => {
  if (elementPanelData) {
    setSideBarMenu(`${elementPanelData.type}-props`);
    setPanelData(elementPanelData, updateFn, updateLinesFn);
  } else {
    setPanelData(null, null, null);
  }
}, [elementPanelData, ...]);
```

### 핵심 규칙
- 속성 패널 메뉴 키는 `"<type>-props"` 형식 (예: `"shape-props"`, `"text-props"`)
- `MENU_ITEMS`에 등록하지 않음 — 좌측 아이콘 메뉴에 표시되지 않고 선택 시에만 자동 열림
- 각 PropsContent는 `useEffect`에서 panelData가 null이면 `setSideBarMenu("template")`로 템플릿 패널 전환
- 텍스트 편집 콜백은 `useTextBoxEditingHandlers`에서 `setTextEditingCallbacks`로 등록/해제
- 다중 선택 콜백은 MainSection에서 `setMultiCallbacks`로 동기화
- 레이어 이동은 `layerUtils.moveLayerByDirection` + `LayerPanel` 컴포넌트로 공유

### 사이드바 동작 규칙
- **사이드바는 항상 열려 있음** — 닫히지 않고 항상 하나의 패널이 표시됨
- 초기 상태: `"template"` (스토어 기본값)
- `toggleMenu`는 같은 메뉴를 다시 눌러도 닫지 않음 (기존 상태 유지)
- 요소 선택 해제 시 `"template"` 패널로 복귀 (`setSideBarMenu(null)` 사용 금지)
- `setSideBarMenu(null)` — 사이드바를 닫는 용도로 사용하지 않음

### 텍스트 패널 포커스 보존
- 텍스트 속성 패널 루트 div에 `data-text-props-panel` 속성 필수
- `isElementInToolbar()` 함수가 `[data-text-props-panel]`을 인식해 편집 세션 종료를 방지
- 모든 포맷팅 버튼에 `onMouseDown={(e) => e.preventDefault()}` 추가해 contentEditable 포커스 유지

### 같은 색상/글꼴 일괄 변경 패턴

색상과 글꼴 모두 동일한 패턴으로 "현재 페이지의 다른 요소에서 같은 값을 가진 요소를 일괄 변경"하는 기능을 제공한다.

**스토어 (elementPanelStore)**:
- `changeAllMatchingColors` / `hasMatchingColors` — 색상 일괄 변경
- `changeAllMatchingFonts` / `hasMatchingFonts` — 글꼴 일괄 변경

**MainSection.tsx 등록 패턴**:
- `changeAll*` — `updateElementsByPageId`로 현재 페이지의 모든 요소를 순회하며 매칭되는 값을 교체. `useEffect`로 등록, cleanup으로 해제
- `hasMatching*` — `pagesRef`/`selectedIdsRef`를 사용해 선택된 요소를 제외하고 매칭 요소 존재 여부 확인

**색상 일괄 변경 UI**:
- `ColorPickerPopover`에 `onChangeAll`/`hasMatchingColors` props로 전달
- 색상 변경 시 팝오버 내부에 일괄 변경 버튼이 표시됨

**글꼴 일괄 변경 UI**:
- `InlineFontPicker` 컴포넌트가 내부에서 `elementPanelStore`의 `changeAllMatchingFonts`/`hasMatchingFonts`를 구독
- 폰트 리스트 하단에 고정 배너로 `원래폰트 → 새폰트 + "같은 글꼴 변경"` 버튼 표시
- 폰트가 변경되고 + 다른 요소에 같은 원래 폰트가 있을 때만 표시

**글꼴 일괄 변경 시 richText 처리**:
- `stripStyleTags(richText, "fontFamily")`로 인라인 fontFamily 태그를 제거해 이중 적용 방지

## InlineFontPicker (인라인 폰트 선택기) 구현 지침

### 관련 파일
- 컴포넌트: `src/features/editor/shared/InlineFontPicker.tsx`
- 사용처: `TextPropsContent.tsx` (편집/비편집 모두), `MultiPropsContent.tsx`

### 동작 방식
- **사이드바 전환 없이** 현재 속성 패널 내에서 폰트 리스트가 드롭다운으로 펼쳐짐
- 글꼴 버튼 클릭 → ChevronUp/Down 토글로 리스트 열기/닫기
- 폰트 선택 시 `fontStore.applyFont` 호출 → `useFontSubscription`이 요소에 반영
- fontWeight는 `fontStore.panelFontWeight`에서 직접 읽음 (props로 전달하지 않음)

### Props
- `fontFamily: string` — 현재 선택된 폰트 패밀리
- `preventFocus?: boolean` — contentEditable 편집 중 포커스 보존이 필요하면 true (모든 버튼에 `onMouseDown={preventDefault}` 적용)

### 같은 글꼴 일괄 변경 배너
- 컴포넌트 마운트 시점의 `fontFamily`를 `originalFont`로 저장
- 폰트가 변경되고 + `hasMatchingFonts(originalFont)`가 true이면 리스트 하단에 고정 배너 표시
- 배너 UI: `원래폰트명 → ArrowRight → 새폰트명 + "같은 글꼴 변경" 버튼`

### 기존 FontContent.tsx와의 관계
- `FontContent.tsx`는 사이드바 "글꼴" 메뉴에서 전체 화면으로 표시되는 독립 패널 (기존 유지)
- `InlineFontPicker`는 속성 패널(TextPropsContent/MultiPropsContent) 내부에 인라인으로 삽입되는 컴팩트 버전
- 두 컴포넌트 모두 `fontStore.applyFont`를 통해 동일한 폰트 적용 경로를 사용

## ColorPickerPopover (색상 선택 팝오버) 구현 지침

### 관련 파일
- 컴포넌트: `src/features/editor/shared/ColorPickerPopover.tsx`
- 최근 색상 스토어: `src/features/editor/store/recentColorStore.ts`

### 팝오버 구조
1. **최근 사용한 색상** — 전역 공유, 최근 5개
2. **기본 색상** — 12색 표준 팔레트
3. **ASD 팔레트** — 감각 과부하 방지용 저자극 12색 + 논문 인용 툴팁
4. **커스텀 색상 입력** — color picker + hex 입력
5. **같은 색상 변경** — originalColor → currentColor 미리보기 + 일괄 변경 버튼

### ASD 툴팁 위치 계산
- `fixed` 포지셔닝으로 팝오버 잘림 방지
- `TOOLTIP_DESIRED_WIDTH(480)` 기준, 뷰포트에 맞게 동적 계산
- 아래 공간 부족 시 위로 자동 전환
