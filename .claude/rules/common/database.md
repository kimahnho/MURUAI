# 데이터베이스 구조 및 Supabase 호출 지침

## 테이블 목록 및 용도

### 프론트에서 직접 사용 (`.from()` 호출)

| 테이블 | 용도 | 소유권 컬럼 | 소프트 삭제 |
|--------|------|------------|------------|
| `students_n` | 학습자(아동) 관리 (`gender` 컬럼 추가됨) | `user_id` | `deleted_at` |
| `groups_n` | 그룹 관리 | `owner_id` | `deleted_at` |
| `groups_members_n` | 그룹-학습자 다대다 | — | `deleted_at` |
| `schedules_n` | 수업 일정 | `user_id` | `deleted_at` |
| `user_made_n` | 사용자 제작 문서 (canvas_data) | `user_id` | `deleted_at` |
| `user_made_targets_n` | 문서 공유 대상(학습자/그룹) | — | `deleted_at` |
| `user_uploads_n` | 사용자 업로드 이미지 | `user_id` | `deleted_at` |
| `emotion_photo` | 감정 사진 (정적 리소스) | — | — |
| `emotion_emoji` | 감정 그림 (정적 리소스) | — | — |
| `emotion_sticker` | 감정 이모지/스티커 (정적 리소스) | — | — |
| `aac_cards` | AAC 카드 (정적 리소스) | — | — |
| `images` | 클라우드 이미지 라이브러리 | — | — |
| `activity_events` | 사용자 활동 추적 (로그인 등) | `user_id` | — |
| `download_events` | 문서 다운로드 추적 | `user_id` | — |
| `template_usage_events` | 템플릿 사용 추적 | `user_id` | — |
| `image_request` | 이미지 상징 요청 (사용자가 원하는 이미지 키워드) | `user_id` | — |
| `ai_template_usage` | AI 이미지 크레딧 사용량 추적 (`image_count` 컬럼으로 이미지 단위 차감) | `user_id` | — |
| `ai_generation_logs` | AI 생성 이력 추적 (4단계: 주제→결과→이미지→확정) | `user_id` | — |
| `ai_credit_requests` | AI 크레딧 추가 요청 (`status`: pending/approved/rejected) | `user_id` | — |

### RPC 통해서만 접근 (직접 `.from()` 없음)

| 테이블 | 용도 | RPC 함수 |
|--------|------|---------|
| `ai_generated_images` | AI 생성 이미지 이력 | `get_ai_generated_images`, `save_ai_generated_image` |
| `ai_image_usage` | AI 이미지 일일 사용량 | `get_ai_image_usage_status`, `can_generate_ai_image` |

### 미사용 테이블

| 테이블 | 비고 |
|--------|------|
| `students` | 구버전 — `students_n`으로 대체됨 |
| `groups` | 구버전 — `groups_n`으로 대체됨 |
| `schedule_items` | 구버전 — `schedules_n`으로 대체됨 |
| `projects` | 구버전 — `user_made_n`으로 대체됨 |
| `user_made_versions` | 버전 이력 기능 — 미구현 |
| `admin_resources` | 관리자 리소스 승인 — 미구현 |
| `admin_users` | 관리자 권한 — 미구현 |
| `daily_usage_logs` | 일일 사용량 — 미구현 |

## 소유권 필터 규칙

```typescript
// students_n, schedules_n, user_made_n, user_uploads_n, ai_generated_images
.eq("user_id", session.user.id)

// groups_n
.eq("owner_id", session.user.id)
```

## 소프트 삭제 필터 (필수)

`deleted_at` 컬럼이 있는 테이블은 조회 시 반드시 필터를 추가한다.

```typescript
// ✅ 올바른 방식
.is("deleted_at", null)

// ❌ 금지: 삭제된 레코드가 노출됨
.from("students_n").select("*").eq("user_id", userId)
```

소프트 삭제 테이블: `students_n`, `groups_n`, `groups_members_n`, `schedules_n`, `user_made_n`, `user_made_targets_n`, `user_uploads_n`

## Supabase 호출 패턴

### 기본 CRUD

```typescript
// SELECT
const { data, error } = await supabase
  .from("students_n")
  .select("*")
  .eq("user_id", userId)
  .is("deleted_at", null)
  .order("created_at", { ascending: false });
if (error) throw error;

// INSERT + 결과 반환
const { data, error } = await supabase
  .from("students_n")
  .insert({ user_id: userId, name, birth_year })
  .select()
  .single();
if (error) throw error;

// UPDATE
const { error } = await supabase
  .from("students_n")
  .update({ name, birth_year })
  .eq("id", id);
if (error) throw error;

// 소프트 삭제
const { error } = await supabase
  .from("students_n")
  .update({ deleted_at: new Date().toISOString() })
  .eq("id", id);
if (error) throw error;
```

### 중첩 조인 (관계 데이터 한 번에 조회)

```typescript
// groups_n + groups_members_n + students_n
const { data, error } = await supabase
  .from("groups_n")
  .select("id, name, groups_members_n(student_id, students_n(id, name, birth_year))")
  .eq("owner_id", userId)
  .is("deleted_at", null);

// user_made_targets_n + students_n + groups_n
const { data, error } = await supabase
  .from("user_made_targets_n")
  .select("user_made_id, child_id, group_id, students_n(id,name), groups_n(id,name)");
```

### 카운트만 조회

```typescript
const { count, error } = await supabase
  .from("user_made_n")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId);
```

### 날짜 범위 조회

```typescript
const { data, error } = await supabase
  .from("schedules_n")
  .select("*")
  .eq("user_id", userId)
  .is("deleted_at", null)
  .lte("start_date", endDate)
  .gte("end_date", startDate);
```

### RPC (서버 함수 호출)

```typescript
// 단순 RPC
const { data, error } = await supabase.rpc("get_ai_image_usage_status", {
  daily_limit: DAILY_LIMIT,
});
if (error) throw error;

// RPC 실패 시 테이블 직접 조회로 fallback
const { data, error } = await supabase.rpc("admin_dashboard_metrics", { ... });
if (error) {
  // fallback: 테이블 직접 조회 후 로컬 집계
}
```

### 병렬 쿼리

```typescript
const [docsResult, studentsResult, groupsResult] = await Promise.all([
  supabase.from("user_made_n").select("id,name,canvas_data").eq("user_id", userId),
  supabase.from("students_n").select("id,name").eq("user_id", userId),
  supabase.from("groups_n").select("id,name").eq("owner_id", userId),
]);
// 각 결과 개별 에러 처리
if (studentsResult.error) { ... }
```

### 멀티 테이블 트랜잭션 (수동 롤백)

Supabase는 클라이언트 트랜잭션을 지원하지 않으므로, 실패 시 수동으로 롤백한다.

```typescript
const { data: group, error: groupError } = await supabase
  .from("groups_n")
  .insert({ owner_id: userId, name })
  .select("id")
  .single();
if (groupError) throw groupError;

const { error: membersError } = await supabase
  .from("groups_members_n")
  .insert(memberRows);
if (membersError) {
  // 수동 롤백
  await supabase.from("groups_n").delete().eq("id", group.id);
  throw membersError;
}
```

## TanStack Query 통합 패턴

```typescript
// 정적 리소스 (emotion_photo, aac_cards, emotion_emoji, images)
// → staleTime: Infinity로 세션 내 재검증 없음
export const useEmotionPhotos = () => {
  return useQuery({
    queryKey: ["emotion-photos"],
    queryFn: fetchAllEmotionPhotos,
    staleTime: Infinity,
    gcTime: Infinity,
  });
};

// 사용자 데이터 (기본 staleTime 사용, 에러 시 UI 피드백)
export const useStudents = () => {
  return useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });
};

// Mutation
export const useCreateStudent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createStudent,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["students"] }),
  });
};
```

## 에러 처리 전략

| 상황 | 처리 방식 |
|------|----------|
| 모델 함수 / API 함수 | `if (error) throw error` — 호출처에서 catch |
| 이벤트 추적 (activity_events, download_events, template_usage_events) | `console.warn()` — 로그만 남기고 진행 계속 (비차단) |
| UI 컴포넌트 직접 호출 | `showToast()` 또는 에러 state 업데이트 |
| 관리자 페이지 집계 | RPC 실패 → 테이블 직접 조회 fallback |

```typescript
// ✅ 모델 함수: throw
const { data, error } = await supabase.from("students_n").insert(...).select().single();
if (error) throw error;
return data;

// ✅ 이벤트 추적: warn (비차단)
const { error } = await supabase.from("activity_events").insert({ ... });
if (error) console.warn("activity_events insert failed", error);

// ✅ UI: 토스트
const { error } = await supabase.from("user_uploads_n").insert({ ... });
if (error) { showToast("업로드 정보를 저장하지 못했어요."); return null; }
```

## 이벤트 추적 테이블 사용 규칙

`activity_events`, `download_events`, `template_usage_events`는 insert 전용이며, 실패해도 사용자 흐름을 막지 않는다.

```typescript
// src/shared/utils/trackEvents.ts 에 집중 관리
trackActivityEvent("login", userId);   // 에러 무시
trackDownloadEvent(userId, userMadeId); // 에러 무시
trackTemplateUsageEvent(templateId, userId, userMadeId); // 에러 무시
```

## canvas_data 저장 패턴

`user_made_n.canvas_data`는 `jsonb` 컬럼으로 에디터 전체 상태를 직렬화해서 저장한다.

```typescript
// 신규 저장
await supabase
  .from("user_made_n")
  .insert({ user_id: userId, name, canvas_data: canvasData })
  .select("id")
  .single();

// 업데이트
await supabase
  .from("user_made_n")
  .update({ name, canvas_data: canvasData })
  .eq("id", docId);
```

## 클라이언트 초기화

- 파일: `src/shared/api/supabase.ts`
- 단일 인스턴스 `supabase`를 프로젝트 전체에서 공유
- 환경 변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
