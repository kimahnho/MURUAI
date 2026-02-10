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
    BottomBar.tsx                   # 페이지 네비게이션
    ElementToolbars.tsx             # 요소별 툴바
    MultiSelectionToolbar.tsx       # 다중 선택 툴바
    ExportModal.tsx                 # 내보내기 모달
    detail_content/                 # 사이드바 콘텐츠 패널
    template_component/             # 요소 컴포넌트 (text, line, arrow 등)
    hooks/                          # DesignPaper 전용 훅
  hooks/                            # 에디터 전용 훅
    useSelectionState.ts
    useAutoSave.ts
    useHistorySync.ts
    useSnapGuides.ts                # 스냅 가이드
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
    useDragResize.ts
    useSmartGuides.ts
    ...
  templates/                        # 템플릿 정의
  utils/                            # 유틸리티
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
