# Admin (관리자 대시보드) 지침

> 서비스 지표를 확인하는 관리자 전용 페이지.

## 핵심 파일 위치

```
src/features/admin/
  pages/
    AdminPage.tsx           # 관리자 대시보드 메인
    AdminUserDocsPage.tsx   # 유저별 문서 조회
  ui/
    AdminDashboardView.tsx  # 대시보드 렌더링
    AdminLoginView.tsx      # 로그인 화면
    UnauthorizedView.tsx    # 권한 없음 화면
    parts/
      DateRangeFilter.tsx
      KpiCards.tsx
      TrendChart.tsx
      DistributionChart.tsx
      TemplatesTable.tsx
      WeekdayCalendar.tsx
  hooks/
    useAdminAuth.ts         # 인증/권한 확인
    useAdminDashboard.ts    # 지표 데이터 로드
  api/adminMetrics.ts       # Supabase RPC 호출
  constants/excludedUsers.ts
```

## 접근 제어

```typescript
// 인증 상태
type AuthStatus = 'loading' | 'unauthenticated' | 'unauthorized' | 'authenticated';

// admin@muruai.com 이메일만 접근 가능
const ADMIN_EMAIL = 'admin@muruai.com';
```

## 페이지 플로우

1. `loading` → 인증 정보 확인 중
2. `unauthenticated` → `AdminLoginView` 표시
3. `unauthorized` → `UnauthorizedView` + 로그아웃 버튼
4. `authenticated` → `AdminDashboardView` 표시

## 대시보드 지표

- 기간 필터: 최근 7일 / 30일 / 커스텀
- WAU (주간 활성 사용자)
- 자료 제작 횟수
- 템플릿 사용률
- 다운로드 전환율

## 주의사항

1. **프론트엔드 가드만으로 충분하지 않음** - DB RLS도 설정 권장
2. **지표 쿼리는 서버 RPC 우선** - 대량 데이터 프론트 집계 지양
3. **새 지표 추가 시 constants에 타입 정의**
4. **EXCLUDED_USER_IDS** - 테스트 계정 등 제외할 유저 ID 관리
