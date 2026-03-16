# 히스토리 / Undo-Redo 지침

> 통합 히스토리 스토어, 스냅샷 관리, 자동 저장 연동.

## 스냅샷 구조

```typescript
// 변경 단위: PageDiff (페이지 순서 + 변경된 페이지 before/after)
type PageDiff = {
  orderBefore: string[];
  orderAfter: string[];
  changedPages: Record<string, { before?: Page; after?: Page }>;
};

// 히스토리 엔트리: diff + 선택 상태
type HistoryPatch = {
  diff: PageDiff;
  before: { selectedPageId: string; selectedIds: string[] };
  after: { selectedPageId: string; selectedIds: string[] };
  timestamp: number;
  label?: string;  // "요소 이동", "페이지 삭제" 등
};
```

## 핵심 상수

| 상수 | 값 | 용도 |
|------|-----|------|
| `HISTORY_MERGE_WINDOW_MS` | 500ms | 연속 편집 자동 병합 윈도우 |
| `MAX_HISTORY_ENTRIES` | 50 | 과거 스택 최대 크기 |

## 동작 원리

### 기록 (`recordHistory`)

1. 현재 페이지와 이전 스냅샷 비교 (`arePagesEqual`)
2. 변경이 없으면 기록 안 함
3. `PageDiff` 생성 — 추가/삭제/수정된 페이지만 추적
4. **병합 판단**: 500ms 이내 + 라벨 없음 → 이전 엔트리의 `after`를 덮어쓰기 (새 엔트리 생성 안 함)
5. 새 기록 시 `future` 스택 초기화 (redo 불가)

### Undo (`requestUndo`)

`past` 스택에서 pop → `future`에 push → `applyPageDiff(diff, "undo")` 실행

### Redo (`requestRedo`)

`future` 스택에서 pop → `past`에 push → `applyPageDiff(diff, "redo")` 실행

### 트랜잭션

```typescript
beginTransaction();
// 여러 페이지 수정...
commitTransaction("복합 작업");  // 1개의 undo 엔트리로 통합
```

## 시그니처 캐싱

```typescript
// WeakMap<Page, string>으로 페이지 변경 감지 최적화
// rev 필드 기반 해시 → JSON 직렬화 없이 변경 여부 판단
```

- `arePagesEqual()`: 배열 길이 + ID 순서 + 시그니처 비교
- 시그니처 캐시는 WeakMap이므로 GC 자동 해제

## 자동 저장 (`useAutoSave`)

### 저장 조건

- `pages.length > 0`
- 전체 페이지에 요소가 1개 이상
- `docId`가 존재

### 디바운스 패턴

- `clientRevisionRef`: 단조 증가 카운터 — 마지막 저장만 유효
- `saveTimeoutRef`: 디바운스 타이머
- `statusResetTimeoutRef`: "저장됨" 표시 타이머

### 상태

`SaveState = "saving" | "saved" | "error" | null`

## 실수 방지

1. **깊은 복사는 `structuredClone` 필수** — `JSON.parse(JSON.stringify())` 금지
2. **`bumpPageRevision()` 호출 필수** — 페이지 수정 후 시그니처 캐시 무효화
3. **트랜잭션 미커밋 방지** — `beginTransaction()` 후 반드시 `commitTransaction()` 호출
4. **초기 렌더 저장 방지** — `hasInitialSaveRef`로 첫 렌더 시 빈 데이터 저장 차단
5. **연속 편집 병합 주의** — 의미 있는 작업에는 `label`을 명시하여 병합 방지

## 관련 파일

| 역할 | 경로 |
|------|------|
| 통합 히스토리 스토어 | `src/features/editor/store/unifiedHistoryStore.ts` |
| 에디터 히스토리 훅 | `src/features/editor/hooks/useEditorHistory.ts` |
| 히스토리 동기화 | `src/features/editor/hooks/useHistorySync.ts` |
| 자동 저장 | `src/features/editor/hooks/useAutoSave.ts` |
| 페이지 리비전 | `src/features/editor/utils/pageRevision.ts` |
| 페이지 변경 유틸 | `src/features/editor/utils/pageMutation.ts` |
