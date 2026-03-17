# 홈페이지 구현 지침

## 페이지 구조

```
HomePage (src/pages/home/HomePage.tsx)
  ├─ 비인증: LandingPage (랜딩)
  └─ 인증:  DashboardPage (대시보드)
```

### 랜딩페이지 (`src/features/home/components/landing/`)

```
LandingPage
  ├─ HeroSection       — 헤드라인 + CTA 버튼 + 에디터 미리보기 이미지
  ├─ FeatureSection     — 기능 소개 카드 3개
  └─ CtaSection         — 하단 CTA 배너
```

- 이미지: `images.mainImage` (src/shared/assets/main_image.png)
- 모바일 반응형 적용 (`md:` 브레이크포인트)

### 대시보드 (`src/features/home/components/dashboard/`)

```
DashboardPage
  ├─ QuickStartSection        — 빈 문서/템플릿 빠른 시작
  ├─ AiFeatureSection         — AI 기능 카드 2개
  ├─ RecentDocumentsSection   — 최근 작업한 학습자료 5개
  └─ ChoiceUserSection        — 개별 아동 / 그룹 수업 선택 + 캐러셀
```

## 모바일 반응형 규칙

### 그리드

```typescript
// ❌ 금지: 데스크탑 전용 고정 그리드
className="grid grid-cols-5 gap-5"

// ✅ 필수: 모바일 → 데스크탑 점진적 확장
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5"
```

### 패딩/간격

- 섹션 래퍼: `px-4 md:px-10`
- 섹션 간 간격: `gap-6 md:gap-10`

### 카드 높이

- `h-auto md:h-85` — 모바일에서 유연, 데스크탑에서 고정

## 데이터 페칭 패턴

- TanStack Query 미사용 — `useEffect` + 직접 Supabase 호출 + `useState`
- 인증 상태(`isAuthenticated`) 변경 시 데이터 재로드

## RecentDocumentsSection 규칙

- `user_made_n` 테이블에서 최근 5개 조회, `.is("deleted_at", null)` 소프트 삭제 필터 필수
- 카드 미리보기: `DesignPaper` 컴포넌트를 `readOnly` + 18% 스케일로 렌더
- 카드 클릭 → `/${doc.id}/edit`로 이동
- "전체보기" 링크 → `/mydoc`으로 이동
- 그리드: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5`
- 로딩/빈 데이터 시 스켈레톤 카드로 레이아웃 점프 방지

## ChoiceUserSection 규칙

- 데이터: `useStudentStore` (Zustand, 5분 캐시)
- 캐러셀: 항목 5개 이상일 때 활성화 (4개/페이지 + 추가 버튼)
- 그리드: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5`
- 카드 높이: `h-auto md:h-85`

## 관련 파일

| 역할 | 경로 |
|------|------|
| 홈 페이지 | `src/pages/home/HomePage.tsx` |
| 랜딩 페이지 | `src/features/home/components/landing/LandingPage.tsx` |
| 히어로 섹션 | `src/features/home/components/landing/HeroSection.tsx` |
| 기능 소개 | `src/features/home/components/landing/FeatureSection.tsx` |
| CTA 배너 | `src/features/home/components/landing/CtaSection.tsx` |
| 대시보드 | `src/features/home/components/dashboard/DashboardPage.tsx` |
| 빠른 시작 | `src/features/home/components/dashboard/QuickStartSection.tsx` |
| AI 기능 | `src/features/home/components/dashboard/AiFeatureSection.tsx` |
| 최근 자료 | `src/features/home/components/RecentDocumentsSection.tsx` |
| 아동/그룹 | `src/features/home/components/ChoiceUserSection.tsx` |
| 학생 카드 | `src/features/home/components/UserCard.tsx` |
| 그룹 카드 | `src/features/home/components/GroupCard.tsx` |
| 학생 스토어 | `src/features/home/store/useStudentStore.ts` |
| 내 학습자료 | `src/pages/mydoc/MyDocPage.tsx` |
| 메인 이미지 | `src/shared/assets/main_image.png` |
