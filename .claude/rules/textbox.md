# TextBox (텍스트 박스 요소) 지침

> 캔버스 위 텍스트 요소의 편집/렌더링/스타일 처리 규칙.

## 핵심 파일 위치

```
src/features/editor/sections/canvas/elements/text/
  TextBox.tsx                        # 텍스트 박스 컴포넌트 (렌더링 + 편집)
  TextToolBar.tsx                    # 상단 텍스트 편집 툴바
  textBoxTypes.ts                    # TextBoxProps, TextBoxToolbar 타입
  textBoxMeasure.ts                  # 텍스트 측정 유틸
  textContentUtils.ts                # HTML 정규화, stripStyleTags
  textSelection.ts                   # 단어 선택 유틸
  hooks/
    useTextBoxAutoResize.ts          # 텍스트 크기에 따른 박스 자동 리사이즈
    useTextBoxEditingHandlers.ts     # 텍스트 입력/포맷/키보드 편집 이벤트
    useTextBoxInteraction.ts         # 드래그/리사이즈/클릭 인터랙션
    useTextBoxSelectionEffect.ts     # 편집 진입 시 캐럿/선택 복원

src/features/editor/sections/canvas/utils/
  textToolbarConfig.ts               # 요소 레벨 툴바 설정 빌더 (buildTextToolbarConfig)

src/features/editor/sections/canvas/hooks/
  useDesignPaperElementRenderer.tsx   # 텍스트 요소 렌더링 분기 (renderTextElement)
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

## 주의사항

1. **contentEditable + execCommand 기반** — Tiptap 등 에디터 프레임워크 미사용
2. **selection 보존** — 툴바 클릭 시 편집 영역 포커스가 이동하므로 `savedRangeRef`로 선택 복원
3. **stripStyleTags** — 전역 스타일 변경(비편집 모드) 시 richText 내 해당 인라인 태그를 제거해 이중 적용 방지
4. **IME 조합** — `isComposingRef`로 한글 입력 중 키 이벤트 차단
5. **surroundContents 제한** — 선택 범위가 여러 노드를 걸칠 때 실패할 수 있으므로 대안 처리 필요
