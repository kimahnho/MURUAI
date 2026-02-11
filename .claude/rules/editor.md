# Editor (캔버스 디자인 에디터) 지침

> 교육 자료를 만드는 캔버스 기반 편집기. Figma/Canva와 유사한 구조.

## 핵심 파일 위치

```
src/pages/editor/
  DesignPage.tsx                    # 메인 페이지 (pages와 features 1:1 대응)

src/features/editor/
  components/                       # UI 컴포넌트
    MainSection.tsx                 # 캔버스 + 툴바 영역
    SideBar.tsx                     # 사이드바
    CanvasStage.tsx                 # 캔버스 컨테이너
    DesignPaper.tsx                 # A4 문서 렌더러
    ShapeTransformBar.tsx           # 도형 회전/플립 툴바 + 회전 핸들 + 크기 라벨
    RotationBadge.tsx               # 회전 중 각도 표시 배지
    BottomBar.tsx                   # 페이지 네비게이션
    ElementToolbars.tsx             # 요소별 툴바
    MultiSelectionToolbar.tsx       # 다중 선택 툴바
    ExportModal.tsx                 # 내보내기 모달
    detail_content/                 # 사이드바 콘텐츠 패널
      PropertiesContent.tsx         # 속성 패널 (라우터 역할)
      ShapeProperties.tsx           # 도형 속성 편집
      TextProperties.tsx            # 텍스트 속성 편집
      AacBoardModal.tsx             # AAC 의사소통 판 설정 모달
      StorySequenceModal.tsx        # 이야기 장면 순서 모달
      PreviewCanvas.tsx             # 프리뷰 캔버스 공용 컴포넌트
      previewMetrics.ts             # 프리뷰 크기/스케일 계산 유틸
    template_component/             # 요소 컴포넌트 (text, line, arrow 등)
      round_box/
        RoundBox.tsx                # 도형 박스 컴포넌트
        useRoundBoxInteraction.ts   # 드래그/리사이즈/이미지 조작 포인터 핸들러
        ResizeHandles.tsx           # 8방향 리사이즈 + 이미지 핸들 컴포넌트
    hooks/                          # DesignPaper 전용 훅
  hooks/                            # 에디터 전용 훅
    useSelectionState.ts            # 다중 선택 상태 (색상/폰트/보더/분배)
    useAacSelectionState.ts         # AAC 카드 감지/라벨 위치 (useSelectionState에서 분리)
    useAutoSave.ts
    useHistorySync.ts
    useSnapGuides.ts                # 스냅 가이드
    useEditorHistory.ts             # useHistorySync + useTextEditTransaction 복합 훅
    usePageManagement.ts            # useActivePageManager + usePageActions 복합 훅
    useSelectionManagement.ts       # useSelectionState + 툴바 + clearer 복합 훅
    useCanvasViewport.ts            # useCanvasZoom + useCanvasWheelZoom 복합 훅
    useEditorSubscriptions.ts       # 6개 구독 훅 통합
    useDocumentLoader.ts            # 문서 생성/로딩 (DesignLayout용)
    useDocumentSave.ts              # 저장/자동저장 (DesignLayout용)
    useExportModal.ts               # 내보내기 모달 상태 (DesignLayout용)
    useOrientationControl.ts        # 방향 제어 + 템플릿 잠금 (DesignLayout용)
    ...
  store/
    elementStore.ts
    templateStore.ts
    fontStore.ts
    sideBarStore.ts
    unifiedHistoryStore.ts          # Undo/Redo
    ...
  model/
    canvasTypes.ts                  # 요소 타입 정의
    pageTypes.ts                    # 문서/페이지 타입
    useSmartGuides.ts
    ...
  templates/                        # 템플릿 정의
  utils/                            # 유틸리티
    distributeElements.ts           # 요소 균등 분배 순수 함수
    imageBoxScaling.ts              # 이미지 박스 비율 보정 유틸
```

## 아키텍처 원칙

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
type CanvasElement = TextElement | ShapeElement | LineElement | ArrowElement;
```

- 각 요소는 `id`, `type`, `position`, `size` 필수
- 요소별 컴포넌트: `components/template_component/`

## 주의사항

1. **DesignPaper 내부에서 store 직접 접근 최소화** - props로 전달받기
2. **selection rect는 로컬 상태로 유지** - 드래그 완료 시에만 selectedIds를 store에 반영
3. **템플릿 적용 시 isApplyingTemplateRef 체크** - 히스토리 충돌 방지
4. **readOnly prop 사용 시** - 미리보기 용도로 이벤트 핸들러 비활성화
