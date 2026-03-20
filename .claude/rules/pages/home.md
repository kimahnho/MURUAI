---
paths:
  - "src/features/home/**"
  - "src/pages/home/**"
  - "src/pages/dashboard/**"
---

# Home (홈 기능) 지침

> 메인 페이지, 대시보드, 학습자/그룹 관리를 포함하는 home feature 전반.

상세 지침은 아래 파일을 참조:
- 라우팅 + 대시보드: `.claude/rules/pages/home-page.md`
- 메인 페이지 (NewLandingPage): `.claude/rules/pages/landing.md`

## 핵심 파일 위치

```
src/pages/home/HomePage.tsx              # "/" 메인 페이지 (AI 생성 로직 조합)
src/pages/dashboard/DashboardRoute.tsx   # "/dashboard" 대시보드 (인증 필수)

src/features/home/
  components/
    landing/          # 메인 페이지 (NewLandingPage, PromptHeroSection, CapabilitySection)
    dashboard/        # 대시보드 (DashboardPage, AiFeatureSection, QuickStartSection)
    ChoiceUserSection.tsx
    RecentDocumentsSection.tsx
    EditUserModal.tsx / EditGroupModal.tsx
  store/
    useStudentStore.ts
  model/
    student.model.ts / group.model.ts
```

## 주의사항

1. **인증 필수** — 대시보드(`/dashboard`)는 비인증 시 "/" 리다이렉트
2. **user_id 필터링** — 모든 Supabase 쿼리에 현재 사용자 ID 조건 필수
3. **의존성 규칙** — `features/home` → `features/editor` 직접 import 금지. `pages/home/HomePage.tsx`에서 조합
