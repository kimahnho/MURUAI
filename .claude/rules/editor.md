---
paths:
  - "src/features/editor/**"
  - "src/pages/editor/**"
---

# Editor (캔버스 디자인 에디터) 지침

> 교육 자료를 만드는 캔버스 기반 편집기. Figma/Canva와 유사한 구조.

## 핵심 파일 위치

```
src/pages/editor/
  DesignPage.tsx                    # 메인 페이지 (pages와 features 1:1 대응)

src/features/editor/
  sections/                         # 섹션별 분리
    sidebar/                        # 사이드바 섹션
      SideBar.tsx                   # 사이드바 라우터
      MultiPageTemplateDialog.tsx   # 멀티페이지 템플릿 적용 다이얼로그
      TemplateChoiceDialog.tsx      # 템플릿 선택 다이얼로그
      content/                      # 사이드바 콘텐츠 패널
        AACContent.tsx              # AAC 카드 라이브러리
        DesignContent.tsx           # AI 이미지 생성
        ElementContent.tsx          # 기본 도형/요소
        EmotionContent.tsx          # 감정 사진/이모지
        FontContent.tsx             # 폰트 선택
        ImageLibraryContent.tsx     # 이미지 라이브러리
        TemplateContent.tsx         # 템플릿 갤러리
        AiTemplateContent.tsx       # AI 템플릿 (스토리북 + 감정추론)
        EmotionInferenceChoiceModal.tsx # 감정 추론 생성 방식 선택 모달
        TextContent.tsx             # 텍스트 삽입
        UploadContent.tsx           # 파일 업로드
        TableContent.tsx            # 표 행/열 속성 패널 (표 선택 시에만 자동 노출)
        ShapePropsContent.tsx       # 도형 속성 패널 (도형 선택 시 자동 노출)
        LinePropsContent.tsx        # 선 속성 패널 (선 선택 시 자동 노출)
        ArrowPropsContent.tsx       # 화살표 속성 패널 (화살표 선택 시 자동 노출)
        AacPropsContent.tsx         # AAC 속성 패널 (AAC 카드 선택 시 자동 노출)
        TextPropsContent.tsx        # 텍스트 속성 패널 (텍스트 선택 시 자동 노출)
        MultiPropsContent.tsx       # 다중 선택 속성 패널 (다중 선택 시 자동 노출)
        LayerPanel.tsx              # 레이어 이동 버튼 (여러 Props 패널에서 공유)
        AacBoardModal.tsx           # AAC 의사소통 판 설정
        StorySequenceModal.tsx      # 이야기 장면 순서
        PreviewCanvas.tsx           # 프리뷰 캔버스
        previewMetrics.ts           # 프리뷰 크기/스케일 계산
      hooks/                        # 사이드바 전용 훅
        useAacCards.ts
        useAacContentState.ts
        useAiImageGeneration.ts
        useEmotionContentState.ts
        useEmotionEmojis.ts
        useEmotionPhotos.ts
        useFontContentState.ts
        useImageLibrary.ts
        useImageUploadToCloudinary.ts
        useTemplateContentState.ts
        useUploadContentState.ts

    canvas/                         # 캔버스 메인 섹션
      CanvasStage.tsx               # 캔버스 컨테이너 (viewport, zoom, pan)
      DesignPaper.tsx               # A4 문서 렌더러 (핵심)
      DesignPaperContextMenu.tsx    # 우클릭 메뉴
      DesignPaperOverlays.tsx       # 선택 오버레이
      ShapeTransformBar.tsx         # 도형 회전/플립 + 크기 라벨
      RotationBadge.tsx             # 회전 중 각도 표시
      SmartGuideOverlay.tsx         # 스마트 가이드 오버레이
      elements/                     # 캔버스 요소 컴포넌트
        arrow/                      # 화살표 요소
        circle/                     # 원형 요소
        line/                       # 선 요소
        table/                      # 표 요소
        round_box/                  # 사각형/둥근사각형 요소
        text/                       # 텍스트 요소
      hooks/                        # 캔버스 전용 훅
        useDesignPaperClipboard.ts
        useDesignPaperGroupDrag.ts
        useDesignPaperInteraction.ts # 드래그/리사이즈/라인 인터랙션
        useDesignPaperKeyboard.ts
        useDesignPaperPaste.ts
        useDesignPaperRotation.ts
        useDesignPaperStageActions.ts
        usePointerDragSession.ts    # pointer 세션(이동/업/threshold) 공통화
        useEmotionSlotBindings.ts
        useAacSelectionState.ts
        useCanvasStageHandlers.ts
        useCanvasStageSelection.ts
        useCanvasViewport.ts        # useCanvasZoom + useCanvasWheelZoom 복합 훅
        useCanvasZoom.ts
        useCanvasWheelZoom.ts
        useSelectionState.ts        # 다중 선택 상태 (색상/폰트/보더/분배)
        useSelectionToolbarActions.ts
        useSelectionClearer.ts
        useSnapGuides.ts

    bottombar/                      # 하단 페이지바 섹션
      BottomBar.tsx                 # 페이지 네비게이션 (다중 선택, Ctrl+C/V 포함)
      hooks/
        useBottomBarDrag.ts         # 페이지 드래그 재정렬
        useBottomBarScroll.ts       # 선택 페이지 자동 스크롤

  shared/                           # 에디터 내 공용 컴포넌트/훅
    MainSection.tsx                 # 캔버스+툴바 영역 오케스트레이터
    ColorPickerPopover.tsx          # 색상 선택기
    InlineFontPicker.tsx            # 인라인 폰트 선택기 (속성 패널 내 드롭다운)
    ExportModal.tsx                 # 내보내기 모달
    PdfPreviewContainer.tsx         # PDF 프리뷰 컨테이너
    hooks/
      useDragAndDrop.ts             # 범용 드래그앤드롭
      useNumberInput.ts             # 숫자 입력
      useStoreSubscription.ts       # store subscribe + guard + cleanup 공통화
      useSyncedRef.ts               # ref 동기화

  hooks/                            # 페이지 레벨 훅 (에디터 전체에서 사용)
    useEditorHistory.ts             # useHistorySync + useTextEditTransaction
    usePageManagement.ts            # useActivePageManager + usePageActions
    useSelectionManagement.ts       # useSelectionState + 툴바 + clearer
    useEditorSubscriptions.ts       # 6개 스토어 구독 통합
    useAutoSave.ts                  # 자동 저장
    useDocumentLoader.ts            # 문서 생성/로딩 (DesignLayout용)
    useDocumentSave.ts              # 저장 (DesignLayout용)
    useExportModal.ts               # 내보내기 모달 상태 (DesignLayout용)
    useOrientationControl.ts        # 방향 제어 (DesignLayout용)
    useTemplateApplyActions.ts      # 템플릿 적용 액션
    ...                             # 기타 페이지 레벨 훅

  store/                            # Zustand 스토어
    elementPanelStore.ts            # 선택 요소 속성 패널 데이터 + 콜백 (Table 제외)
    recentColorStore.ts             # 최근 사용한 색상 (세션 동안 최대 5개)
  model/                            # 타입/도메인 모델
  utils/                            # 유틸리티
    pageMutation.ts                 # updatePageById/updateElementsByPageId
    documentPersistence.ts          # buildPersistPayload/save 헬퍼
    layerUtils.ts                   # moveLayerByDirection 레이어 이동 유틸
  templates/                        # 템플릿 정의 (변경 없음)
  constants/                        # 상수 정의 (변경 없음)
```

## 연관 지침

- PDF 내보내기 전용 지침: `.claude/rules/pdf-export.md`
- TextBox 요소 지침: `.claude/rules/textbox.md`
- Table 요소 지침: `.claude/rules/table.md`

## 폴더 구조 원칙

### 섹션 분리 규칙
- `sections/<section>/` — 해당 섹션 전용 컴포넌트 + 훅
- `sections/<section>/hooks/` — 해당 섹션에서만 사용되는 훅
- `hooks/` (루트) — 페이지 전체에서 사용되는 훅
- `shared/` — 여러 섹션에서 공유하는 컴포넌트/훅

### 훅 배치 기준
- 단일 섹션 전용 → `sections/<section>/hooks/`
- 여러 섹션/페이지 레벨 → `hooks/`
- 범용 유틸 성격 → `shared/hooks/`

## 아키텍처 원칙

### 훅/유틸 공통화 원칙
- store 구독 로직은 `useStoreSubscription`을 우선 사용
- pointer 드래그 로직은 `usePointerDragSession`을 우선 사용
- `setPages(prev => prev.map(...))` 직접 반복 대신 `pageMutation` 유틸 우선 사용
- 저장 경로는 `documentPersistence` 헬퍼(`buildPersistPayload`, `saveNewDocument`, `saveExistingDocument`)를 우선 사용
- 대형 훅은 외부 API를 유지하고 내부 순수 계산만 `sections/canvas/utils/*`로 추출

### 렌더 분리
- `CanvasStage`: viewport, zoom, pan, 포인터 이벤트 최상위 처리
- `DesignPaper`: A4 문서 영역 + 요소 렌더링 (props 기반)
- React UI: 툴바, 사이드바, 인스펙터만 담당

### 고빈도 이벤트 처리 (중요)
```typescript
// ❌ 금지: pointer move를 매번 Zustand에 반영
onPointerMove={(e) => setPosition({ x: e.clientX, y: e.clientY })}

// ✅ 권장: 로컬 상태 또는 ref로 처리, 최종 결과만 store에 반영
const posRef = useRef({ x: 0, y: 0 });
onPointerMove={(e) => { posRef.current = { x: e.clientX, y: e.clientY }; }}
onPointerUp={() => setFinalPosition(posRef.current)}
```

### 드래그/선택 좌표계
- client 좌표 → container 좌표 → paper/world 좌표 순으로 변환
- scale, padding, pan offset 모두 고려해야 함
- `setPointerCapture()`로 캔버스 밖 드래그 추적

## 요소 타입

```typescript
type CanvasElement = TextElement | ShapeElement | LineElement | TableElement;
```

- 각 요소는 `id`, `type`, `position`, `size` 필수
- 요소별 컴포넌트: `sections/canvas/elements/`

## 페이지 넘버링 구현 지침

### 관련 파일
- 타입: `src/features/editor/model/pageTypes.ts` — `PageNumbering` 인터페이스
- 기본값/유틸: `src/features/editor/utils/pagePresentation.ts`
- 스토어: `src/features/editor/store/pageSettingsStore.ts`
- 스토어 구독: `src/features/editor/hooks/usePageSettingsSubscription.ts`
- 렌더: `src/features/editor/sections/canvas/DesignPaper.tsx`
- 설정 UI: `src/features/editor/sections/sidebar/content/PageContent.tsx`

### PageNumbering 타입

```typescript
interface PageNumbering {
  enabled: boolean;
  format: PageNumberFormat;      // "number" | "dash" | "korean" | "english"
  position: PageNumberPosition;  // "bottom-left" | "bottom-center" | "bottom-right"
  startPage: number;             // 넘버링을 시작할 페이지 위치 (기본값 1)
}
```

### startPage 동작 규칙
- `startPage = 3` 설정 시: 1·2페이지는 번호 없음, 3페이지부터 `- 1 -`, `- 2 -`, `- 3 -` ...
- 표시 번호 = `pageNumber - startPage + 1`
- `pageNumber < startPage` 이면 번호 미표시
- `numbering` 설정은 **전체 페이지에 일괄 적용** (`usePageSettingsSubscription`에서 `pages.map(...)`)
- 배경(`background`)은 활성 페이지에만 적용됨 (넘버링과 다름)

### cloneNumbering 규칙
새 필드 추가 시 `pageSettingsStore.ts`의 `cloneNumbering` 함수에 반드시 추가해야 함.
기존 저장 데이터 호환을 위해 `?? 기본값` 폴백 패턴 사용:
```typescript
startPage: numbering.startPage ?? 1,
```

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

## DesignLayout 헤더 반응형 규칙

- 헤더(`<header>`)에 `overflow-hidden` 적용
- 좌측 그룹은 `min-w-0 flex-1 overflow-hidden`으로 축소 허용
- 제목 입력 래퍼/input은 `min-w-0 shrink`로 유일하게 줄어드는 요소
- 홈/폴더/저장/undo·redo/방향전환/줌/구분선은 `shrink-0`으로 고정
- 우측 그룹(프린트/내보내기)은 `shrink-0`으로 항상 표시

## 주의사항

1. **DesignPaper 내부에서 store 직접 접근 최소화** - props로 전달받기
2. **selection rect는 로컬 상태로 유지** - 드래그 완료 시에만 selectedIds를 store에 반영
3. **템플릿 적용 시 isApplyingTemplateRef 체크** - 히스토리 충돌 방지
4. **readOnly prop 사용 시** - 미리보기 용도로 이벤트 핸들러 비활성화
5. **수동 pointer listener 추가 지양** - 신규 로직은 `usePointerDragSession` 기반으로 구현
6. **페이지 갱신 일관성 유지** - `updatePageById`/`updateElementsByPageId` 사용으로 `bumpPageRevision` 누락 방지

## 템플릿 PDF 자산 관리

- 경로: `src/features/editor/templates/template_pdf/<template-slug>/`
- 각 템플릿 폴더에는 아래 두 파일을 유지한다.
  - `template.pdf`: 원본 템플릿 PDF
  - `preview.png`: 에디터/썸네일에서 사용하는 배경 이미지(고해상도 권장)
- 템플릿이 "배경만" 필요한 경우 템플릿 TS 파일(`src/features/editor/templates/*.ts`)의 `elements`는 빈 배열(`[]`)로 유지한다.
- 실제 페이지 배경 적용은 `src/features/editor/utils/pageFactory.ts`의 `getTemplateBackground()`에서 `templateId -> preview.png`를 매핑한다.
- 사이드바 템플릿 썸네일 배경은 `src/features/editor/sections/sidebar/content/TemplateContent.tsx`의 `getTemplatePreviewBackground()`에서 동일 매핑을 유지한다.
- 바텀 페이지 썸네일은 `DesignPaper`에 `background={page.background}` 전달 방식으로 렌더하므로, 템플릿 배경은 페이지 데이터에만 정상 주입되면 자동 노출된다.

## 하단바 다중 페이지 선택 및 복사/붙여넣기

- `selectedPageIds: string[]`를 BottomBar 로컬 state로 관리 (캔버스 활성 페이지 `selectedPageId`와 별도)
- **Shift+클릭**: 앵커(`selectedPageId`)~클릭 페이지 범위를 `selectedPageIds`에 저장
- **Cmd/Ctrl+클릭**: 개별 페이지 토글. 앵커 페이지(`selectedPageId`)는 제거 불가
- **단일 클릭**: `onSelectPage` 호출 + `selectedPageIds` 초기화
- `selectedPageId` 변경 시 `selectedPageIds` 자동 초기화 (useEffect)
- **Ctrl+C**: `selectedPageIds`가 있으면 해당 배열을, 없으면 `[selectedPageId]`를 `sessionStorage.copiedPageIds`(JSON)에 저장
- **Ctrl+V**: `handlePastePages(selectedPageId)` 호출 → `copiedPageIds` 배열을 읽어 대상 페이지 직후에 순서대로 삽입
- `handlePastePages`는 `copiedPageIds` 우선, 없으면 `copiedPageId` 폴백 (`usePageActions.ts`)
- **keydown 핸들러의 클로저 문제 주의**: `selectedPageIds`, `selectedPageId`, `pages`, `onSelectPage`, `onPastePages`는 별도 ref로 유지하고, keydown useEffect는 빈 dependency(`[]`)로 한 번만 등록해 최신 값은 ref에서 읽는다

## 캔버스 파일 드래그 앤 드롭

- OS 파일 탐색기에서 JPG/PNG/SVG 파일을 캔버스에 직접 드래그 앤 드롭하면 이미지 요소 생성
- 지원 파일: `image/jpeg`, `image/png`, `image/svg+xml` (`useImageUploadToCloudinary.ts`와 동일)
- 흐름: 로컬 프리뷰 즉시 표시(`URL.createObjectURL`) → 백그라운드 Cloudinary 업로드 → `fill` URL 교체 → 실패 시 요소 제거 + `revokeObjectURL`
- `DesignPaper.tsx`의 `onDrop`에서 사이드바 드래그(`application/x-muru-image`)와 OS 파일 드롭(`dataTransfer.files`)을 분기 처리
- 파일 드롭 로직은 `useCanvasFileDrop` 훅(`src/features/editor/hooks/useCanvasFileDrop.ts`)에서 처리 — `DesignPaper`에는 `onFileDropOnCanvas` prop으로 전달
- `getElements` 콜백 패턴: 비동기 업로드 완료 시점에 최신 elements를 참조하기 위해 사용
- 이미지 크기: 원본 비율 유지, 최대 300px
- 업로드 완료 시 `triggerRefetch()`로 사이드바 업로드 목록 동기화
