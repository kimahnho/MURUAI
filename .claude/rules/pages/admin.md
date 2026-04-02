---
paths:
  - "src/features/admin/**"
  - "src/pages/admin/**"
---

# Admin (관리자 대시보드) 지침

> 서비스 지표, 유저 관리, 크레딧 요청 처리를 위한 관리자 전용 페이지.

## 접근 제어

`user_profiles.role === "admin"` 기반. 이메일 하드코딩 금지.

```typescript
// useAdminAuth.ts — role 기반 인증
const role = useAuthStore((s) => s.role);
const isAdmin = role === "admin";

type AuthStatus = "loading" | "unauthenticated" | "unauthorized" | "authorized";
```

- `AuthProvider`가 로그인 시 `user_profiles.role` 조회 → `useAuthStore.setRole()` 저장
- 헤더(`Header.tsx`)에서 `role === "admin"` 시 "관리자" 버튼 표시 → `/admin` 이동
- `is_admin()` SQL 함수 (`SECURITY DEFINER`)로 RLS 재귀 방지
- **`AdminGuard`** (`src/pages/admin/AdminGuard.tsx`)가 `/admin` 하위 모든 경로를 보호 — 라우터에서 중첩 레이아웃으로 적용

## 페이지 플로우 (`AdminGuard`)

`/admin/*` 접근 시 `AdminGuard`가 먼저 실행:

1. `loading` → "관리자 정보를 확인하는 중입니다."
2. `unauthenticated` → `AdminLoginView` (이메일+비밀번호 로그인)
3. `unauthorized` → `UnauthorizedView` + 로그아웃 버튼
4. `authorized` → `<Outlet />` (하위 라우트 렌더링)

개별 페이지(`AdminPage`, `AdminUserDocsPage`)에서는 권한 체크 불필요.

## 3탭 대시보드 구조

```typescript
type AdminTab = "dashboard" | "credits" | "users";
```

### 대시보드 탭

| 섹션 | 컴포넌트 | 설명 |
|------|----------|------|
| KPI 카드 4개 | `KpiCards.tsx` | WAU, 자료 제작, 템플릿 사용률, 다운로드 |
| AI 기능 사용량 | `AdminDashboardView.tsx` 내부 | `ai_generation_logs` 집계 (감정추론/스토리북, 메인/에디터, 확정 수) |
| 인기 이미지 | `ImagePopularitySection.tsx` | `image_usage_events` 집계 — 사용 빈도 순 이미지 랭킹 (썸네일+카운트+소스 뱃지) |
| 일자별 추이 | `TrendChart.tsx` | 생성/다운로드 테이블 |
| 주간 방문일수 분포 | `DistributionChart.tsx` | 수평 막대 차트 |
| 요일별 방문 유저 | `WeekdayCalendar.tsx` | 캘린더 히트맵 |
| Top 템플릿 | `TemplatesTable.tsx` | 사용 횟수/자료 수 + 프로그레스 바 |
| 유저별 자료 | `AdminDashboardView.tsx` 내부 | 카드 그리드, `/admin/user-docs` 링크 |

기간 필터: 최근 7일 / 30일 / 커스텀 (`DateRangeFilter.tsx`)

### 크레딧 요청 탭

`CreditRequestsSection.tsx` — `admin_list_credit_requests` RPC 사용

- 대기 중(pending) 요청: 유저 이름/이메일, 잔여 크레딧, 요청일 + 승인/거절 버튼
- 승인 → `admin_manage_credit_request(id, "approved")` → `user_credits.balance = 30`, `refill_count += 1`
- 거절 → `ConfirmDialog` 확인 후 처리
- 처리 이력: 접기/펼치기 (approved 초록, rejected 빨강 `Badge`)

### 유저 관리 탭

`UserListSection.tsx` — `admin_list_users` RPC 사용

- 검색: 이메일/이름 클라이언트 필터
- 테이블 컬럼: 이메일, 이름, 로그인 방식, 마지막 접속, 가입일, 역할, 크레딧(잔여/누적/리필)
- `EXCLUDED_USER_IDS`로 테스트 계정 제외
- role 뱃지: admin(primary), user(일반 텍스트)
- provider: Google / 카카오 / 이메일

## RPC 함수

| 함수 | 용도 | 반환 |
|------|------|------|
| `admin_list_users()` | 전체 유저 목록 | id, email, display_name, provider, last_sign_in_at, created_at, role, credit_balance/total_used/refill_count |
| `admin_list_credit_requests()` | 크레딧 요청 목록 | request_id, user_id, user_email, user_display_name, status, credit_balance, created_at, reviewed_at |
| `admin_manage_credit_request(id, action)` | 승인/거절 | void (승인 시 `balance += 30` 누적 충전) |
| `admin_dashboard_metrics(start_date, end_date)` | 대시보드 집계 | 문서/템플릿/활동/다운로드 지표 (없으면 fallback 쿼리) |

모든 RPC는 `SECURITY DEFINER` + admin 체크 (`is_admin()` 호출).

## AI 사용량 집계

`adminMetrics.ts`에서 `ai_generation_logs` 테이블을 직접 조회:

```typescript
type AiUsageStat = {
  type: string;       // "emotion" | "storybook"
  total: number;      // 총 생성 횟수
  confirmed: number;  // 확정 횟수 (confirmed_at 존재)
  fromLanding: number; // source === "landing"
  fromEditor: number;  // source !== "landing"
};
```

## 실수 방지

1. **이메일 기반 관리자 인증 금지** — `user_profiles.role` 기반만 사용
2. **프론트엔드 가드만으로 충분하지 않음** — RPC 내부에서도 admin 체크 필수
3. **지표 쿼리는 서버 RPC 우선** — fallback은 클라이언트 집계 (대량 데이터)
4. **EXCLUDED_USER_IDS** — 테스트 계정 제외 (`excludedUsers.ts`)
5. **유저 이름 표시** — `admin_list_users` RPC의 `display_name` 또는 `email` 사용 (`auth.users` JOIN)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 권한 가드 | `src/pages/admin/AdminGuard.tsx` |
| 메인 페이지 | `src/pages/admin/AdminPage.tsx` |
| 유저별 자료 | `src/pages/admin/AdminUserDocsPage.tsx` |
| 대시보드 뷰 | `src/features/admin/components/AdminDashboardView.tsx` |
| 로그인 뷰 | `src/features/admin/components/AdminLoginView.tsx` |
| 권한 없음 뷰 | `src/features/admin/components/UnauthorizedView.tsx` |
| 크레딧 요청 | `src/features/admin/components/CreditRequestsSection.tsx` |
| 유저 목록 | `src/features/admin/components/UserListSection.tsx` |
| KPI 카드 | `src/features/admin/components/KpiCards.tsx` |
| 일자별 추이 | `src/features/admin/components/TrendChart.tsx` |
| 방문일수 분포 | `src/features/admin/components/DistributionChart.tsx` |
| 요일별 캘린더 | `src/features/admin/components/WeekdayCalendar.tsx` |
| 템플릿 테이블 | `src/features/admin/components/TemplatesTable.tsx` |
| 인기 이미지 | `src/features/admin/components/ImagePopularitySection.tsx` |
| 기간 필터 | `src/features/admin/components/DateRangeFilter.tsx` |
| 인증 훅 | `src/features/admin/hooks/useAdminAuth.ts` |
| 대시보드 훅 | `src/features/admin/hooks/useAdminDashboard.ts` |
| 유저 목록 훅 | `src/features/admin/hooks/useAdminUsers.ts` |
| 크레딧 요청 훅 | `src/features/admin/hooks/useAdminCreditRequests.ts` |
| 지표 API | `src/features/admin/api/adminMetrics.ts` |
| 크레딧 API | `src/features/admin/api/adminCredits.ts` |
| 제외 유저 | `src/features/admin/constants/excludedUsers.ts` |
| SQL 마이그레이션 | `supabase/migrations/001_user_profiles_and_admin_rpc.sql` |
