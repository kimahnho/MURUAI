# 홈페이지 구현 지침

## 라우팅 구조

```
"/"           → HomePage      → NewLandingPage (인증 여부 무관, 항상 표시)
"/dashboard"  → DashboardRoute → DashboardPage (인증 필수, 비인증 시 "/" 리다이렉트)
"/auth/callback" → AuthCallbackPage → "/" 리다이렉트
```

- `HomePage`는 인증 여부와 관계없이 항상 `NewLandingPage`를 렌더링
- 인증 사용자가 대시보드를 보려면 헤더의 "대시보드" 링크를 클릭

## 헤더 (`src/shared/ui/layout/Header.tsx`)

```
인증:   [로고 → /] [대시보드 → /dashboard] [내 학습자료 → /mydoc] [로그아웃]
비인증: [로고 → /] [로그인] [가입하기]
```

- 모바일: `h-14`, 로그아웃은 `LogOut` 아이콘 버튼
- 데스크탑: `h-18`, 로그아웃은 텍스트 버튼
- 모든 텍스트에 `whitespace-nowrap` 적용
- "가입하기" 버튼: 다크 브라운(`bg-[#3A332C]`) — 웜톤 통일

## 메인 페이지 (NewLandingPage)

상세: `.claude/rules/pages/landing.md` 참조

## 대시보드 (`/dashboard`)

### DashboardRoute (`src/pages/dashboard/DashboardRoute.tsx`)

- 인증 필수: `isAuthenticated` false → `navigate("/", { replace: true })`
- `isLoading` 중 null 반환 (플래시 방지)

### DashboardPage (`src/features/home/components/dashboard/DashboardPage.tsx`)

좌우 스플릿 레이아웃:

```
┌────────────────────┬────────────────────────────┐
│ AI로 만들기 [NEW]  │ 최근 학습자료    전체보기 → │
│ [스토리북][감정추론]│ ┌──┐┌──┐┌──┐┌──┐           │
│  ⚡ N/30 크레딧    │ └──┘└──┘└──┘└──┘           │
│ 빠른 시작          │                            │
│ [빈문서][감정추론]…│ 내 학습자                   │
│                    │ [아동|그룹] 탭 + 리스트     │
└────────────────────┴────────────────────────────┘
```

- AI 카드 클릭: `sessionStorage("pendingEditorIntent")` → 에디터에서 사이드바 전환
- 모바일: 세로 1열 / 데스크탑: `flex-col lg:flex-row`

## 관련 파일

| 역할 | 경로 |
|------|------|
| 홈 페이지 | `src/pages/home/HomePage.tsx` |
| 대시보드 라우트 | `src/pages/dashboard/DashboardRoute.tsx` |
| 라우터 | `src/app/config/Router.tsx` |
| 헤더 | `src/shared/ui/layout/Header.tsx` |
| 메인 페이지 | `src/features/home/components/landing/NewLandingPage.tsx` |
| 프롬프트 히어로 | `src/features/home/components/landing/PromptHeroSection.tsx` |
| 기능 소개 | `src/features/home/components/landing/CapabilitySection.tsx` |
| 대시보드 | `src/features/home/components/dashboard/DashboardPage.tsx` |
| AI 기능 | `src/features/home/components/dashboard/AiFeatureSection.tsx` |
| 빠른 시작 | `src/features/home/components/dashboard/QuickStartSection.tsx` |
| 최근 자료 | `src/features/home/components/RecentDocumentsSection.tsx` |
| 아동/그룹 리스트 | `src/features/home/components/ChoiceUserSection.tsx` |
| 레거시 랜딩 | `src/features/home/components/landing/LandingPage.tsx` (보존, 미사용) |
