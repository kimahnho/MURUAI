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
        EmotionAACContent.tsx       # 감정/AAC 통합 탭
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
        AacCardPropsContent.tsx     # AAC 카드 V2 속성 패널
        EmotionCardPropsContent.tsx # 감정 카드 속성 패널
        TextPropsContent.tsx        # 텍스트 속성 패널 (텍스트 선택 시 자동 노출)
        MultiPropsContent.tsx       # 다중 선택 속성 패널 (다중 선택 시 자동 노출)
        LayerPanel.tsx              # 레이어 이동 버튼 (여러 Props 패널에서 공유)
        AacBoardModal.tsx           # AAC 의사소통 판 설정
        PageContent.tsx              # 페이지 설정 (넘버링/배경)
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
      EmotionSceneBanner.tsx        # 감정추론 AI 이미지 생성 플로팅 배너
      EmotionSceneImageModal.tsx    # 감정추론 이미지 재생성 모달
      VocabTracingBanner.tsx        # 어휘 카드 따라쓰기 생성 플로팅 버튼
      DesignPaperOverlays.tsx       # 선택 오버레이
      GuideRenderer.tsx             # 정렬 가이드 렌더러
      ResizeHandles.tsx             # 리사이즈 핸들
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
        aac_card/                   # AAC 카드 복합 요소
        emotion_card/               # 감정 카드 요소
      hooks/                        # 캔버스 전용 훅
        useDesignPaperActions.ts
        useDesignPaperClipboard.ts
        useDesignPaperElementRenderer.tsx # 요소 렌더링 분기
        useDesignPaperGroupDrag.ts
        useDesignPaperInteraction.ts # 드래그/리사이즈/라인 인터랙션
        useDesignPaperKeyboard.ts
        useDesignPaperPaste.ts
        useDesignPaperRotation.ts
        useDesignPaperSelectionContextMenu.ts # 선택 컨텍스트 메뉴
        useDesignPaperStageActions.ts
        useElementPatchUpdater.ts   # 요소 패치 업데이트
        useGroupOverlayDrag.ts      # 그룹 오버레이 드래그
        usePaperRects.ts            # 페이퍼 영역 계산
        usePointerDragSession.ts    # pointer 세션(이동/업/threshold) 공통화
        useSnapTransformRect.ts     # 스냅 변환 사각형
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
    emotionSceneStore.ts            # 감정추론 AI 2단계 생성 플로우 상태
    vocabTracingStore.ts            # 어휘 따라쓰기 페이지 생성 요청
    recentColorStore.ts             # 최근 사용한 색상 (세션 동안 최대 5개)
  model/                            # 타입/도메인 모델
  utils/                            # 유틸리티
    pageMutation.ts                 # updatePageById/updateElementsByPageId
    documentPersistence.ts          # buildPersistPayload/save 헬퍼
    layerUtils.ts                   # moveLayerByDirection 레이어 이동 유틸
    tracingGridUtils.ts             # 어휘 추출 + 따라쓰기 그리드 페이지 빌더
  templates/                        # 템플릿 정의 (변경 없음)
  constants/                        # 상수 정의 (변경 없음)
```

## 연관 지침

- PDF 내보내기 전용 지침: `.claude/rules/pdf-export.md`
- TextBox 요소 지침: `.claude/rules/textbox.md`
- Table 요소 지침: `.claude/rules/table.md`
- 사이드바 속성 패널 지침: `.claude/rules/editor-sidebar-panel.md`
- 에디터 기능별 상세 지침: `.claude/rules/editor-features.md`

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
type CanvasElement = TextElement | ShapeElement | LineElement | TableElement | AacCardElement | EmotionCardElement;
```

- 각 요소는 `id`, `type`, `position`, `size` 필수
- 요소별 컴포넌트: `sections/canvas/elements/`


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

