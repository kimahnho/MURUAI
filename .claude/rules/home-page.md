# 홈페이지 구현 지침

## 섹션 구조 (순서 고정)

```
FirstCommentSection    — 인사말 + "바로 만들어보기" / "내 학습자료" 버튼
RecentDocumentsSection — 최근 작업한 학습자료 5개 카드
ChoiceUserSection      — 개별 아동 / 그룹 수업 선택 + 카드 캐러셀
```

## 인증 상태별 표시 규칙

- `FirstCommentSection`: 항상 표시 (비인증 시 버튼 클릭 → AuthModal)
- `RecentDocumentsSection`: 비인증 시 `return null` — 섹션 전체 숨김
- `ChoiceUserSection`: 비인증 시 `return null` — 섹션 전체 숨김

## 데이터 페칭 패턴

- TanStack Query 미사용 — `useEffect` + 직접 Supabase 호출 + `useState`
- 인증 상태(`isAuthenticated`) 변경 시 데이터 재로드
- 비인증 시 데이터 초기화 및 섹션 숨김

## 레이아웃 간격 규칙

- 섹션 간 간격: 부모(`HomePage`)에서 `gap-10 pb-20`으로 관리 — 개별 섹션에 `py` 사용 금지
- `FirstCommentSection`만 `pt-25`로 상단 여백 유지

## RecentDocumentsSection 규칙

- `user_made_n` 테이블에서 최근 5개 조회, `.is("deleted_at", null)` 소프트 삭제 필터 필수
- 카드 미리보기: `DesignPaper` 컴포넌트를 `readOnly` + 18% 스케일로 렌더
- 카드 클릭 → `/${doc.id}/edit`로 이동
- "전체보기" 링크 → `/mydoc`으로 이동
- 카드 그리드: `grid grid-cols-5 gap-5`
- 로딩/빈 데이터 시 실제 카드와 동일 높이의 스켈레톤 카드 5개를 렌더해 레이아웃 점프 방지

## ChoiceUserSection 규칙

- 데이터: `useStudentStore` (Zustand, 5분 캐시)
- 캐러셀: 항목 5개 이상일 때 활성화 (4개/페이지 + 추가 버튼)
- 그리드: `grid grid-cols-5 gap-5`
- 카드 높이: `h-85` 고정

## 관련 파일

| 역할 | 경로 |
|------|------|
| 홈 페이지 | `src/pages/home/HomePage.tsx` |
| 인사말 섹션 | `src/features/home/components/FirstCommentSection.tsx` |
| 최근 자료 섹션 | `src/features/home/components/RecentDocumentsSection.tsx` |
| 아동/그룹 섹션 | `src/features/home/components/ChoiceUserSection.tsx` |
| 학생 카드 | `src/features/home/components/UserCard.tsx` |
| 그룹 카드 | `src/features/home/components/GroupCard.tsx` |
| 학생 스토어 | `src/features/home/store/useStudentStore.ts` |
| 내 학습자료 페이지 | `src/pages/mydoc/MyDocPage.tsx` |
