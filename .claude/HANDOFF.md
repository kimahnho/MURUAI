# 학습자료 컴포넌트 시스템 — Handoff 문서

> 새 세션에서 작업을 이어가기 위한 현재 상태 요약. 2026-04-06 기준.

## 브랜치

**`feat/worksheet-editor`** — main에 절대 커밋하지 않음. 모든 작업은 이 브랜치에서.

## 프로젝트 위치

`C:\Users\a\MURUAI_FE\`

## 로컬 실행

```bash
cd C:\Users\a\MURUAI_FE
node .yarn/releases/yarn-4.12.0.cjs dev --port 5173
# http://localhost:5173
```

- `.env.local`에 실제 Supabase URL/키 설정됨
- Supabase 대시보드에서 `http://localhost:5173/auth/callback` Redirect URL 추가 필요 (로그인 후 프로덕션으로 리다이렉트되는 문제 방지)

---

## 구현 완료된 기능

### 1. 학습자료 컴포넌트 시스템 (11개)

| 컴포넌트 | 타입 키 | 설명 |
|----------|---------|------|
| 제목 | `header_instruction` | 제목 + 지시문 + 음운 규칙 메모 |
| 칭찬 스탬프 | `reward_tracker` | 아이콘 선택 가능 (☆⭐♥♡✓●★), 14mm 슬롯 |
| 안내 가이드 | `info_guide` | 캐릭터 이모지 + 말풍선 + 팁 (회색 원 항상 표시) |
| 변환 쌍 | `arrow_transform` | 원래 → 변환 발음 변화 쌍 |
| 반복 연습 | `sequential_repeat` | 음절 반복 교대 운동 |
| 문장 선택 | `selection_sentence` | {A/B} 골라 읽기, 정답지 우측 정렬 |
| 단어 카드 | `grid_NxM` | 이미지+텍스트 모드: imageSlot(1:1) + 하단 라벨, labelId 연결로 이미지 삽입 시 단어 자동 연동 |
| 글자 색칠하기 | `outline_title` | text-stroke 기반 외곽선 텍스트 (내부 흰색 + 외곽선 색상) |
| 쓰기 칸 노트 | `writing_practice` | 5칸(32mm)/8칸(20mm)/10칸(16mm) 격자 |
| 색칠공부 | `coloring_area` | imageSlot 기반 이미지 프레임 + AI 색칠공부 그림 생성 버튼 |
| 체크리스트 | `checklist_table` | 어휘 목록 기록표 |

### 2. 캔버스 에디터 통합

#### 사이드바
- 템플릿 탭에 `[미리 만든 템플릿 | 직접 만들기]` 토글 추가
- "직접 만들기" 탭 상태는 `worksheetElementStore.templateActiveTab`에 영속화 (리마운트 시 유지)
- 예제 3종: 유음화, 어버이날, 단어학습

#### 오른쪽 편집 패널 (`WorksheetRightPanel`)
- 카드형 토글 UI (접기/펼치기)
- 드래그앤드롭 + ↑/↓ 버튼으로 순서 변경
- 새 컴포넌트 삽입 시 자동 펼침
- 캔버스 요소 클릭 시 해당 컴포넌트 카드 자동 펼침 + 하이라이트

#### 컴포넌트 선택
- 1-click = 컴포넌트 전체 선택 (worksheetMeta.componentId 기반)
- 전체 선택 상태에서 재클릭 = 개별 요소 선택
- 더블클릭 = 텍스트 인라인 편집
- hover 시 보라색 점선 바운딩 박스 (`WorksheetComponentOverlay`, pointerEvents:none)
- 빈 영역 클릭으로도 컴포넌트 전체 선택 (`useCanvasStageSelection`에서 바운딩 박스 히트 테스트)

#### 오토레이아웃
- `reflowWorksheetComponents()`: 배열 순서대로 Y축 재배치 + COMP_GAP(10mm) 간격
- 드래그 중 실시간 reflow (`requestAnimationFrame`, `useCanvasStageHandlers`)
- 리사이즈 시에도 실시간 reflow (높이 변화 감지)
- 스마트 가이드 숨김 (`isDraggingWorksheet` 플래그)
- 드롭 후 최종 reflow

#### 영속화
- `ElementBase.worksheetMeta`: `{ componentId, componentType }` — 요소가 어떤 컴포넌트에 속하는지 식별
- `Page.worksheetComponents[]`: 페이지별 컴포넌트 메타 (id, type, config, elementIds) — canvas_data에 저장
- 페이지 전환 시 `loadFromPage()`으로 편집 패널 자동 복원
- Ctrl+Z 복원 시 `worksheetMeta`에서 컴포넌트 재구성

#### 동기화
- 100ms 간격으로 페이지 전환/undo/삭제 감지
- 편집 패널 삭제(X) → 캔버스 요소도 함께 제거 (`requestDeleteWithElements`)
- 캔버스 요소 삭제 → 편집 패널 자동 정리
- config 변경 → `configChangeId++` → 재빌드 구독 → 캔버스 업데이트
- `updateComponentConfigSilent`: 재빌드 트리거 없이 config만 업데이트 (역동기화용)

#### 단어 카드 이미지 연동
- 이미지 삽입 시 `config.items[].imageUrl/imageBox`에 영속화
- 셀 내용 수정 시 이미지 유지 (config에서 복원)
- 셀 X버튼 삭제 시 해당 카드만 제거 + 뒤 카드 밀림
- 이미지 삽입 후 다음 카드 자동 선택 (X→Y 순)
- `labelId`로 하단 텍스트 라벨 자동 업데이트

#### 텍스트 외곽선 (text-stroke)
- `TextElement.style.textStroke`: `{ enabled, width, color }` — optional 필드
- `useDesignPaperElementRenderer`에서 `-webkit-text-stroke` CSS 적용
- 글자 색칠하기 컴포넌트에서 사용 (내부 흰색 + 외곽선)

#### imageSlot 공통 동작
- 이미지 삽입 시 가이드 텍스트 자동 클리어 (`shouldClearPlaceholder`)
- 이미지 삽입 시 점선 테두리 자동 제거 (`border.enabled = false`)
- 색칠공부 AI 생성: `requestColoringAi()` → 사이드바 AI 이미지 탭 전환 + lineart 스타일 자동 선택

### 3. 독립 워크시트 에디터 (/worksheet-editor)

- `src/features/worksheet-editor/` — 독립 feature 모듈
- `src/pages/worksheet-editor/WorksheetEditorPage.tsx` — 라우트 진입점
- 3-column 레이아웃: 팔레트 + A4 미리보기(210mm 실제 렌더 + CSS scale) + 편집 패널
- JSON 내보내기, PDF 출력 (window.print)
- 이 독립 에디터는 초기 프로토타입이며, 캔버스 에디터 통합이 메인

---

## 핵심 파일 경로

### 캔버스 에디터 통합 (메인)

| 역할 | 경로 |
|------|------|
| 컴포넌트 → CanvasElement 변환 | `src/features/editor/utils/buildWorksheetPage.ts` |
| Zustand 스토어 | `src/features/editor/store/worksheetElementStore.ts` |
| 오른쪽 편집 패널 | `src/features/editor/sections/rightpanel/WorksheetRightPanel.tsx` |
| 사이드바 탭 | `src/features/editor/sections/sidebar/content/WorksheetBuilderTab.tsx` |
| 구독 (삽입/재빌드/동기화) | `src/features/editor/hooks/useEditorSubscriptions.ts` |
| 캔버스 핸들러 (reflow) | `src/features/editor/sections/canvas/hooks/useCanvasStageHandlers.ts` |
| 컴포넌트 오버레이 | `src/features/editor/sections/canvas/WorksheetComponentOverlay.tsx` |
| 선택 로직 수정 | `src/features/editor/sections/canvas/hooks/useDesignPaperSelectionContextMenu.ts` |
| 빈 영역 클릭 선택 | `src/features/editor/sections/canvas/hooks/useCanvasStageSelection.ts` |
| 이미지 채우기 연동 | `src/features/editor/hooks/useImageFillSubscription.ts` |
| 에디터 레이아웃 | `src/pages/editor/DesignPage.tsx` |
| 템플릿 탭 토글 | `src/features/editor/sections/sidebar/content/TemplateContent.tsx` |

### 독립 워크시트 에디터

| 역할 | 경로 |
|------|------|
| 타입 정의 | `src/features/worksheet-editor/model/types.ts` |
| 기본 config / 메타 | `src/features/worksheet-editor/constants/defaults.ts` |
| Zustand 스토어 | `src/features/worksheet-editor/store/worksheetStore.ts` |
| 편집 폼 (11개) | `src/features/worksheet-editor/sections/forms/EditorForms.tsx` |
| 미리보기 컴포넌트 | `src/features/worksheet-editor/preview/MiniComponents.tsx` |
| 예제 데이터 | `src/features/worksheet-editor/utils/examples.ts` |

### 수정된 기존 파일

| 파일 | 변경 내용 |
|------|----------|
| `canvasTypes.ts` | `WorksheetMeta` 타입 + `ElementBase.worksheetMeta` + `TextElement.style.textStroke` |
| `pageTypes.ts` | `PageWorksheetComponent` 인터페이스 + `Page.worksheetComponents` |
| `DesignPaper.tsx` | WorksheetComponentOverlay + 스마트 가이드 숨김 + hover 감지 |
| `useAiImageGeneration.ts` | coloringAiRequestId 구독 → lineart 자동 선택 |
| `DesignContent.tsx` | lineart 선택 시 placeholder 변경 |

---

## 알려진 이슈 / TODO

### 기존 서비스 영향
- `features/worksheet-editor/`의 컴포넌트를 `features/editor/`에서 import — 의존성 규칙 위반. 프로덕션 시 shared로 승격 필요.

### 기능적 TODO
- Cloudinary 환경변수 미설정 → 이미지 업로드 시 영속화 안 됨 (로컬 blob URL만)
- 드래그 밀림 모션이 피그마만큼 부드럽지 않음 — CSS transition 적용하려면 캔버스 렌더링 아키텍처 변경 필요
- 편집 패널에서 config 변경 시 재빌드가 발생하여 캔버스에서 직접 수정한 미세 조정(위치, 크기)이 리셋될 수 있음

### UI/UX TODO
- 전체 컴포넌트 요소 크기/글자 크기/도형 길이 디자인 개선 필요
- 언어치료 영역별 자료 레퍼런스 기반 신규 컴포넌트 추출

---

## Zustand 스토어 구조 (`worksheetElementStore`)

```typescript
interface WorksheetElementStore {
  // 삽입 요청
  requestId / requestedComponent / requestInsert()

  // 일괄 삽입
  batchRequestId / requestedBatch / requestBatchInsert()

  // 삽입된 컴포넌트 관리
  insertedComponents: InsertedWorksheetComponent[]
  addInsertedComponent / updateComponentConfig / updateComponentConfigSilent
  updateElementIds / moveInsertedComponent / reorderInsertedComponent
  removeInsertedComponent / loadFromPage

  // 삭제 (캔버스 요소도 함께)
  deleteWithElementsId / pendingDeleteCompId / requestDeleteWithElements

  // config 변경 트리거
  configChangeId / lastChangedComponentId

  // AI 색칠공부 생성
  coloringAiRequestId / requestColoringAi

  // 드래그 / hover
  isDraggingWorksheet / hoveredComponentId

  // 탭 / 패널
  templateActiveTab / isPanelVisible / selectedComponentId
}
```

---

## 구독 체인 (useEditorSubscriptions 내)

```
1. 단일 삽입: requestId → buildWorksheetComponentElements → worksheetMeta 스탬프 → setPages + addInsertedComponent
2. 일괄 삽입: batchRequestId → 순차 빌드 → setPages + worksheetComponents 영속화
3. Config 변경: configChangeId → 재빌드 + reflow + worksheetComponents 동기화
4. 편집 패널 삭제: deleteWithElementsId → 캔버스 요소 제거 + worksheetComponents 동기화
5. 페이지 전환: 100ms interval → loadFromPage + groupId 마이그레이션
6. Undo/Redo: 요소 수 변화 감지 → worksheetMeta에서 컴포넌트 재구성
```

---

## 빌드 / 검증

```bash
node .yarn/releases/yarn-4.12.0.cjs typecheck   # 타입 체크
node .yarn/releases/yarn-4.12.0.cjs build        # 프로덕션 빌드
```

## 커밋 규칙

```bash
git -c user.name="muruai" -c user.email="muruai@users.noreply.github.com" commit -m "메시지"
git push origin feat/worksheet-editor
```
