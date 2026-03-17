# 구독 패턴 지침

> 요소 생성, 보드 생성, 템플릿 적용 등 Zustand 스토어 → 캔버스 동기화 패턴.

## 구독 원칙

스토어의 `requestId` 증가를 감지하여 캔버스 상태를 동기화하는 패턴. 모든 구독 훅은 `useEditorSubscriptions`에서 등록된다.

```
스토어 액션 (requestId++) → Zustand subscribe 감지 → 핸들러 실행 → 페이지/요소 업데이트
```

## 요소 생성 구독 (`useElementSubscription`)

`elementStore.requestedType` 변경 감지 → 타입별 팩토리 함수 호출

### 지원 요소 타입 (9종)

| 타입 | 팩토리 함수 |
|------|------------|
| `text` | `addTextElement()` |
| `rect`, `roundRect`, `ellipse`, `mosaic`, `circleMosaic` | `addShapeElement()` |
| `line`, `arrow` | `addLineElement()` |
| `aacCard`, `emotionCard` | `addAacCardElement()` 등 |
| `table` | `addTableElement()` |

- 생성 후 자동 선택 (`setSelectedIds([newId])`)
- 편집 상태 초기화 (`setEditingTextId(null)`)

## 보드 생성 구독 (`useBoardSubscriptions`)

### AAC 보드

`aacBoardStore.requestId` 감지 → `addAacBoardPageV2()` → 첫 요소 자동 선택 → 사이드바 `"emotion-aac"` 전환

### 스토리보드

`storyBoardStore.requestId` 감지 → 페이지 생성 → 사이드바 전환 (요소 사전 선택 없음)

## 템플릿 적용 구독 (`useTemplateSubscription`)

- 선택 페이지 변경 → `selectedTemplate` 동기화 (page.templateId)
- 단일 페이지만 있을 때 → 템플릿 선택 다이얼로그 표시
- **히스토리 디바운스**: `recordHistory()` 100ms `setTimeout`으로 배치 업데이트
- `aacBoard`/`aacBoardV2` templateId → `selectedTemplate = null`로 리셋

## 이미지 채우기 구독 (`useImageFillSubscription`)

상세: `.claude/rules/image-fill-system.md` 참조

## 실수 방지

1. **콜백 안정성 필수** — 구독에 전달하는 모든 함수는 참조가 안정해야 함 (무한 구독 루프 방지)
2. **requestId는 시맨틱 의미 없음** — 변경 트리거 용도만, 값 자체를 사용하지 않음
3. **구독 해제 보장** — cleanup 함수에서 반드시 `unsubscribe()` 호출
4. **히스토리 기록 타이밍** — 구독 핸들러에서 직접 `recordHistory()` 호출 시 디바운스 적용

## 관련 파일

| 역할 | 경로 |
|------|------|
| 구독 등록 허브 | `src/features/editor/hooks/useEditorSubscriptions.ts` |
| 요소 생성 | `src/features/editor/hooks/useElementSubscription.ts` |
| 보드 생성 | `src/features/editor/hooks/useBoardSubscriptions.ts` |
| 템플릿 적용 | `src/features/editor/hooks/useTemplateSubscription.ts` |
| 이미지 채우기 | `src/features/editor/hooks/useImageFillSubscription.ts` |
| 폰트 동기화 | `src/features/editor/hooks/useFontSubscription.ts` |
| 방향 동기화 | `src/features/editor/hooks/useOrientationSubscription.ts` |
| 페이지 설정 | `src/features/editor/hooks/usePageSettingsSubscription.ts` |
