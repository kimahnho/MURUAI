---
paths:
  - "src/features/editor/sections/canvas/elements/text/**"
  - "src/features/editor/sections/canvas/utils/textToolbarConfig.ts"
  - "src/features/editor/sections/canvas/utils/textResizePatch.ts"
  - "src/features/editor/sections/canvas/hooks/useDesignPaperElementRenderer.tsx"
  - "src/features/editor/sections/sidebar/content/TextPropsContent.tsx"
  - "src/features/editor/shared/MainSection.tsx"
---

# TextBox (텍스트 박스 요소) 지침

> 캔버스 위 텍스트 요소의 편집/렌더링/스타일 처리 규칙.

## 핵심 파일 위치

```
src/features/editor/sections/canvas/elements/text/
  TextBox.tsx                        # 텍스트 박스 컴포넌트 (렌더링 + 편집)
  textBoxTypes.ts                    # TextBoxProps, TextBoxToolbar 타입
  textBoxMeasure.ts                  # 텍스트 측정 유틸
  textContentUtils.ts                # HTML 정규화, stripStyleTags
  textSelection.ts                   # 단어 선택 유틸
  hooks/
    useTextBoxAutoResize.ts          # 텍스트 크기에 따른 박스 자동 리사이즈
    useTextBoxEditingHandlers.ts     # 텍스트 입력/포맷/키보드 편집 이벤트 + 사이드바 콜백 등록
    useTextBoxInteraction.ts         # 드래그/리사이즈/클릭 인터랙션
    useTextBoxSelectionEffect.ts     # 편집 진입 시 캐럿/선택 복원

src/features/editor/sections/canvas/utils/
  textToolbarConfig.ts               # 요소 레벨 툴바 설정 빌더 (buildTextToolbarConfig)
  textResizePatch.ts                 # 드래그 리사이즈 결과를 TextElement patch로 변환

src/features/editor/sections/canvas/hooks/
  useDesignPaperElementRenderer.tsx   # 텍스트 요소 렌더링 분기 (renderTextElement)

src/features/editor/sections/sidebar/content/
  TextPropsContent.tsx               # 사이드바 텍스트 속성 패널 (편집/비편집 모드 분기)

src/features/editor/store/
  elementPanelStore.ts               # TextEditingCallbacks 타입 + setTextEditingCallbacks
```

## 텍스트 스타일 2계층 구조

### 1. 요소 레벨 (element.style)
- `TextElement.style.fontSize` — 기본 폰트 크기
- 요소 전체에 적용되는 기본 스타일
- 편집 모드가 아닐 때 툴바에서 변경하면 이 값이 바뀜

### 2. 인라인 레벨 (richText 내 HTML 태그)
- `<span style="font-size: 24px">텍스트</span>` 형태
- 편집 모드에서 일부 텍스트를 선택한 뒤 스타일을 변경하면 인라인 태그로 적용
- 요소 레벨 스타일보다 우선

## 편집 모드 텍스트 크기 동작 규칙

### 선택 텍스트 크기 표시
- 편집 모드에서 텍스트를 선택하면, **선택 영역 내 텍스트의 실제 fontSize**를 툴바에 표시
- 선택 영역 내 fontSize가 모두 동일하면 해당 숫자를 표시
- 선택 영역 내 fontSize가 서로 다르면 `--`로 표시
- 선택이 없거나(커서만 있는 상태) 편집 모드가 아니면 `element.style.fontSize` 표시

### 선택 텍스트 크기 변경
- 편집 모드에서 텍스트를 선택한 뒤 크기를 변경하면, **선택된 텍스트에만** 인라인 스타일 적용
- `document.execCommand` 대신 `<span style="font-size: Npx">` 래핑 방식 사용
- 변경 후 `onTextChange`로 plainText + richText(innerHTML) 동기화

## 사이드바 텍스트 속성 패널

텍스트 편집 UI는 사이드바 패널(`TextPropsContent.tsx`)에서 제공된다. 기존 Portal 기반 `TextToolBar`는 삭제됨.

### 콜백 등록 흐름
1. `useTextBoxEditingHandlers`에서 편집 시작 시 `setTextEditingCallbacks(callbacks)` 호출
2. `TextPropsContent`의 `EditingTextPanel`이 `textEditingCallbacks`를 구독해 인라인 스타일링 제공
3. 편집 종료 시 `setTextEditingCallbacks(null)` 호출 → `StaticTextPanel`로 전환

### 포커스 보존
- `TextPropsContent` 루트 div에 `data-text-props-panel` 속성 필수
- `isElementInToolbar()` 함수가 `[data-text-props-panel]`을 인식
- 모든 포맷팅 버튼에 `onMouseDown={(e) => e.preventDefault()}` 필수

## 폰트 크기 변경 시 박스 크기 동기화

### userResizedWidth 플래그
- `TextElement`에 `userResizedWidth?: boolean` 필드 존재
- **측면 핸들(e/w) 드래그** → `userResizedWidth = true` 설정, `widthMode = "fixed"`
- **코너 핸들(nw/ne/sw/se) 드래그** → `userResizedWidth = false` 설정 (폰트 크기 스케일)
- **소스**: `textResizePatch.ts`의 `buildTextResizePatch()`

### 폰트 크기 변경 시 너비 계산 공식
```typescript
// ✅ 올바른 방식 — fontSize 비율로 너비 비례 변경
const scale = element.style.fontSize > 0 ? newFontSize / currentFontSize : 1;
newW = Math.round(element.w * scale);

// ❌ 금지 — w/h 비율 사용 (element.h는 lineHeight 불일치로 부정확)
newW = newH * (element.w / element.h);
```
- `userResizedWidth = true` → 너비 고정(`w: element.w`), 높이만 변경
- `userResizedWidth = false` → 위 공식으로 너비 비례 변경
- 양쪽 모두 `widthMode: "fixed"` 유지

### updateElement 두 경로 — style deep merge
- **인라인 툴바** (`buildTextToolbarConfig` → `useElementPatchUpdater.updateElement`): style 자동 deep merge
- **사이드바** (`TextPropsContent` → `MainSection.updateElementForPanel`): 기본 shallow merge이므로 text 요소에 한해 명시적 deep merge 필수
  ```typescript
  // MainSection.updateElementForPanel 내부
  if (el.type === "text" && patch.style) {
    return { ...el, ...patch, style: { ...el.style, ...(patch.style as object) } };
  }
  ```

### useTextBoxAutoResize — contentKey vs styleSignature 분리
- `contentKey` (text/richText/isEditing 해시) 변경 → 항상 autoResize 실행
- `styleSignature` (fontSize/fontWeight 등 스타일) 변경 → style-only로 분류, autoResize skip
  - `userResizedWidth = true`면 skip하지 않고 `lastEmittedRectRef = null` (높이 재측정 허용)
- `shouldMeasureHeight = isMultiLine || wasMultiLineRef || userResizedWidth`
  - `userResizedWidth`인 경우 항상 DOM 높이 재측정 (박스 밖으로 텍스트 벗어남 방지)

## 주의사항

1. **contentEditable + execCommand 기반** — Tiptap 등 에디터 프레임워크 미사용
2. **selection 보존** — 사이드바 패널 클릭 시 편집 영역 포커스가 이동하므로 `savedRangeRef`로 선택 복원. 굵게/밑줄/기울임꼴/취소선 버튼에는 `onMouseDown={(e) => e.preventDefault()}`를 추가해 contentEditable 포커스 이탈을 방지한다.
3. **stripStyleTags** — 전역 스타일 변경(비편집 모드) 시 richText 내 해당 인라인 태그를 제거해 이중 적용 방지. `textDecorationLine`(편집 모드 인라인 적용 경로)과 `textDecoration`(shorthand) 두 속성 모두 처리해야 한다.
4. **IME 조합** — `isComposingRef`로 한글 입력 중 키 이벤트 차단
5. **surroundContents 제한** — 선택 범위가 여러 노드를 걸칠 때 실패할 수 있으므로 대안 처리 필요
6. **사이드바 패널 클릭 가드** — `TextBox.onPointerDown`에서 `target.closest("[data-text-props-panel]")`로 사이드바 패널 클릭을 감지해 `startAction` 호출을 막아야 사이드바 버튼의 `onClick`이 정상 실행된다.
