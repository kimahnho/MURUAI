# MyDoc (내 학습자료) 지침

> 사용자가 만든 학습자료를 관리하는 페이지 — 사이드바 필터 + 카드 그리드 + 페이지네이션.

## 레이아웃

```
┌─────────────────────────────────────────────┐
│ ← 뒤로   내 학습자료         + 새 자료 만들기 │ 헤더 (고정)
├──────────┬──────────────────────────────────┤
│ 사이드바  │ 🔍 검색...                       │
│          │                                  │
│ 전체 (12)│ 전체 학습자료 (12개)              │
│          │                                  │
│ ▾ 아동   │ ┌──┐┌──┐┌──┐┌──┐┌──┐            │
│  김하늘(3)│ └──┘└──┘└──┘└──┘└──┘            │
│  이서준(5)│                                  │
│          │        [더 보기]                  │
│ ▾ 그룹   │                                  │
│  1반 (4) │                                  │
└──────────┴──────────────────────────────────┘
```

- **사이드바**: `md` 이상에서 표시, 아동/그룹 접기/펼치기, 문서 개수 표시
- **모바일**: 사이드바 대신 `<select>` 드롭다운
- **사이드바 스켈레톤**: 필터 로딩 중에도 사이드바 영역 표시 (고정 레이아웃)

## 데이터 로딩 (2단계 분리)

### 1단계: 필터 + 전체 개수 (사이드바가 먼저 표시)
```typescript
Promise.all([
  supabase.from("user_made_n").select("id", { count: "exact", head: true }),  // 전체 개수
  supabase.from("students_n").select("id,name"),   // 아동 목록
  supabase.from("groups_n").select("id,name"),      // 그룹 목록
]);
```

### 2단계: 문서 목록 (canvas_data 포함, 페이지네이션)
```typescript
supabase.from("user_made_n")
  .select("id,name,created_at,canvas_data")
  .limit(PAGE_SIZE + 1);  // PAGE_SIZE = 20

// 타겟은 문서 ID로 필터링
supabase.from("user_made_targets_n")
  .in("user_made_id", docIds);  // ❌ 전체 스캔 금지
```

## 페이지네이션

- 커서 기반: `.lt("created_at", lastCreatedAt).limit(PAGE_SIZE + 1)`
- `hasMore`: 21개 조회 → 20개 표시 + hasMore 판단
- "더 보기" 버튼 (`Spinner` 로딩 표시)
- 전체 개수: 별도 `count` 쿼리 (페이지네이션과 독립)
- 필터/검색 적용 시: 로컬 필터링된 개수 표시

## 카드 그리드

- 반응형: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`
- 미리보기: `DesignPaper readOnly` + `PREVIEW_SCALE = 0.18`
- 대상 태그: 아동 `bg-primary-50 text-primary-700`, 그룹 `bg-success-50 text-success-700`
- 액션: hover 시 복제/삭제 버튼 표시

## 삭제/복제

- `ConfirmDialog` 사용 (기존 BaseModal 인라인 버튼 아님)
- 삭제: 소프트 삭제 (`deleted_at`) — targets 먼저, 문서 후
- 복제: 원본 `canvas_data` 별도 조회 → 새 문서 생성 → targets 복사

## 실수 방지

1. **인증 필수** — 미인증 시 `/`로 리다이렉트
2. **`user_made_targets_n` 전체 스캔 금지** — `.in("user_made_id", docIds)` 필수
3. **삭제 시 targets 먼저** — `user_made_targets_n` → `user_made_n` 순서
4. **canvas_data 파싱** — JSON 문자열/객체 모두 처리 (`parseCanvasData`)
5. **orientation 검증** — `horizontal | vertical` 외 값은 `vertical` 폴백

## 관련 파일

| 역할 | 경로 |
|------|------|
| 메인 페이지 | `src/pages/mydoc/MyDocPage.tsx` |
| ConfirmDialog | `src/shared/ui/ConfirmDialog.tsx` |
| Spinner | `src/shared/ui/Spinner.tsx` |
