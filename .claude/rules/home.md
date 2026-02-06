# Home (홈 페이지) 지침

> 학습자/그룹 관리 및 주간 수업 계획표를 보여주는 대시보드.

## 핵심 파일 위치

```
src/features/home/
  pages/HomePage.tsx           # 메인 페이지
  ui/
    sections/                   # 페이지 섹션
      FirstCommentSection.tsx   # 상단 인사말
      ChoiceUserSection.tsx     # 학습자 선택
      CalendarSection.tsx       # 주간 계획표
    parts/                      # UI 컴포넌트
      AddUserModal.tsx
      AddGroupModal.tsx
      EditUserModal.tsx
      EditGroupModal.tsx
      AddScheduleModal.tsx
      UserCard.tsx
      GroupCard.tsx
      TimeTable.tsx
  store/
    useStudentStore.ts
    useScheduleStore.ts
  model/
    student.model.ts
    group.model.ts
    schedule.model.ts
    scheduleForm.model.ts
  utils/dateUtils.ts
```

## 데이터 모델

```typescript
// 학습자
type Student = { id: string; name: string; ... }

// 그룹
type Group = { id: string; name: string; members: string[]; ... }

// 수업 일정
type Schedule = { id: string; date: string; studentId?: string; groupId?: string; ... }
```

## Supabase 테이블

- `students_n` - 학습자 정보
- `groups_n` - 그룹 정보
- `schedules` - 수업 일정

## 주의사항

1. **인증 필수** - 로그인하지 않은 사용자는 데이터 접근 불가
2. **user_id 필터링** - 모든 쿼리에 현재 사용자 ID 조건 필수
3. **모달 상태는 로컬** - 전역 store 사용하지 않음
