# 복사/붙여넣기 지침

> 요소 클립보드, 2-pass ID 리맵, 페이지 복사, 텍스트 재측정.

## 저장 매체

`sessionStorage` 사용 (브라우저 탭 간 공유 안 됨):

| 키 | 값 | 용도 |
|-----|-----|------|
| `"copiedElements"` | JSON `CanvasElement[]` | 요소 클립보드 |
| `"copiedElementsMeta"` | JSON `{ pageId }` | 복사 출처 페이지 |
| `"copiedPageId"` | `string` | 페이지 단위 복사 (단일) |
| `"copiedPageIds"` | JSON `string[]` | 페이지 다중 복사 |
| `"cutPageData"` | JSON `Page[]` | 페이지 잘라내기 데이터 (1회 소비 후 삭제) |

## 2-pass ID 리맵 (핵심)

```typescript
// 1st pass: 모든 클립보드 요소에 새 UUID 할당 → idMap 구성
const idMap = new Map<string, string>();
clipboard.forEach((el) => idMap.set(el.id, crypto.randomUUID()));

// 2nd pass: idMap으로 labelId/groupId 리맵
const nextLabelId = idMap.get(element.labelId) ?? element.labelId;
const nextGroupId = groupIdMap.get(element.groupId) ?? element.groupId;
```

- `labelId`: 이미지 슬롯 ↔ 텍스트 연결 유지
- `groupId`: 그룹 요소 관계 유지
- 참조 대상이 클립보드에 없으면 원본 ID 유지

## 붙여넣기 위치

| 조건 | 오프셋 |
|------|--------|
| 명시적 위치 전달 | `position.x/y - bounds.min` |
| 같은 페이지 | `+10px` (X, Y 동시) |
| 다른 페이지 | `0px` (원본 좌표 유지) |

## 텍스트 요소 재측정

`lockHeight: true`인 텍스트 요소는 높이 재측정을 스킵하여 원본 크기 유지. 그 외 텍스트는 `measureTextBoxSize()`로 크기 재계산.

## 요소 복사 토스트

요소 복사(`copySelectedElements`) 시 에디터 토스트 "요소가 복사되었습니다" 표시 (`useToastStore`).

## 페이지 잘라내기 (`cutPageData`)

- Ctrl+X: 페이지 **데이터 자체**를 `cutPageData`에 JSON 직렬화하여 저장 → 페이지 삭제
- 붙여넣기 시 `cutPageData` 우선 확인 → 있으면 데이터에서 직접 복원 후 키 삭제 (1회 소비)
- `cutPageData` 없으면 기존 `copiedPageIds` → `copiedPageId` 순서로 폴백
- ID만 저장하면 삭제된 페이지를 `pages.find()`로 찾을 수 없으므로 데이터 직렬화 필수

## 실수 방지

1. **idMap에 없는 labelId는 원본 유지** — 외부 참조를 깨뜨리지 않음
2. **텍스트 paste 시 `widthMode` + `lockHeight` 확인 필수** — 잘못된 재측정 방지
3. **같은 페이지 판단은 `copiedElementsMeta.pageId`로** — 현재 활성 페이지와 비교
4. **페이지 잘라내기는 ID가 아닌 데이터 저장 필수** — 삭제 후 ID로는 페이지를 찾을 수 없음

## 관련 파일

| 역할 | 경로 |
|------|------|
| 캔버스 클립보드 | `src/features/editor/sections/canvas/hooks/useDesignPaperClipboard.ts` |
| 붙여넣기 | `src/features/editor/sections/canvas/hooks/useDesignPaperPaste.ts` |
| 복사/붙여넣기 훅 | `src/features/editor/hooks/useCopyPaste.ts` |
| 키보드 연동 | `src/features/editor/sections/canvas/hooks/useDesignPaperKeyboard.ts` |
