# 홈페이지 구현 지침

## 페이지 구조

```
HomePage (src/pages/home/HomePage.tsx)
  ├─ 비인증: LandingPage (랜딩)
  └─ 인증:  DashboardPage (대시보드)
```

## 헤더

- 로그인 후: "내 학습자료" 링크(`/mydoc`) + "로그아웃" 버튼
- 비인증: "로그인" + "가입하기" 버튼
- 반응형 패딩: `px-4 md:px-15`

## 랜딩페이지 (`src/features/home/components/landing/`)

```
LandingPage
  ├─ HeroSection       — 헤드라인 + CTA 버튼 + 에디터 미리보기 이미지
  ├─ FeatureSection     — 기능 소개 카드 3개
  └─ CtaSection         — 하단 CTA 배너
```

- 이미지: `images.mainImage` (`src/shared/assets/main_image.png`)
- 모바일 반응형 적용 (`md:` 브레이크포인트)

## 대시보드 (`src/features/home/components/dashboard/`)

### 좌우 스플릿 레이아웃

```
┌─────────────────────────────────────────────────┐
│ 안녕하세요! 오늘은 어떤 자료를 만들어볼까요?      │ 상단 인사말
├────────────────────┬────────────────────────────┤
│ AI로 만들기 [NEW]  │ 최근 학습자료    전체보기 → │
│ [스토리북][감정추론]│ ┌──┐┌──┐┌──┐┌──┐           │
│  ⚡ N/30           │ └──┘└──┘└──┘└──┘           │
│ 빠른 시작          │                            │
│ [빈문서][감정추론]…│ 내 학습자                   │
│                    │ [아동|그룹] 탭 + 리스트     │
└────────────────────┴────────────────────────────┘
```

- **AI로 만들기가 빠른 시작 위에 배치** (DashboardPage.tsx에서 순서 변경)
- AI 섹션: `border-2 border-primary-200 bg-primary-50` + NEW 뱃지(`animate-pulse`) + 사용량 표시(`⚡ N/30`)
- 빠른 시작 템플릿 클릭: `buildTemplatePages()`로 canvas_data에 미리 포함하여 저장 → `createAndOpenDocument({ pages })`
- AI 카드 클릭: `sessionStorage("pendingEditorIntent")` → 에디터에서 사이드바 ai-template 전환 + 모달 자동 열기
- 모바일: 세로 1열 (좌 → 우)
- 데스크탑: `flex-col lg:flex-row`, 양쪽 `flex-1`

### 섹션 타이틀 규칙

모든 섹션 타이틀은 동일 크기 + 아이콘:
- `text-title-22-semibold` + `icon-s text-primary`
- 빠른 시작: `BookOpen`, AI로 만들기: `Sparkles`, 최근 학습자료: `FileText`, 내 학습자: `Users`

## RecentDocumentsSection 규칙

- `user_made_n` 테이블에서 최근 **4개** 조회
- 카드 미리보기: `DesignPaper readOnly` + **15% 스케일** (`previewScale = 0.15`)
- 그리드: `grid-cols-4 gap-3`
- 카드 클릭 → `/${doc.id}/edit`
- "전체보기" → `/mydoc`

## ChoiceUserSection 규칙

- **컴팩트 리스트** 방식 (캐러셀 아님)
- 아동/그룹 탭 전환 (아동: 보라, 그룹: 초록 색상 분리)
- 페이지네이션: 4개씩, `← 1/3 →` 형태
- 페이지네이션 영역은 `invisible`로 항상 공간 유지
- 블록 컨테이너: `rounded-2xl border shadow-sm p-5`
- 블록 border 색상: 아동 탭 `border-primary-200`, 그룹 탭 `border-emerald-200`
- 데이터: `useStudentStore` (Zustand, 5분 캐시)

## EditUserModal / EditGroupModal

- `showCloseButton={false}` — 커스텀 헤더에서 수정(Pencil) + 닫기(X) 버튼 직접 배치
- 읽기 모드: 하단에 삭제 버튼(destructive) + 닫기 버튼
- 삭제 확인: `ConfirmDialog` variant="danger"
- 출생 연도 + 성별: 한 행에 나란히 배치
- 읽기 모드 출생 연도: `2015년 (만 11세)` 형태
- 수정 모드 출생 연도: input 옆에 `만 N세` 표시 (4자리 입력 시)
- `groupModel.delete(id)`: 소프트 삭제 (멤버 + 그룹)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 홈 페이지 | `src/pages/home/HomePage.tsx` |
| 헤더 | `src/shared/ui/layout/Header.tsx` |
| 랜딩 페이지 | `src/features/home/components/landing/LandingPage.tsx` |
| 히어로 섹션 | `src/features/home/components/landing/HeroSection.tsx` |
| 기능 소개 | `src/features/home/components/landing/FeatureSection.tsx` |
| CTA 배너 | `src/features/home/components/landing/CtaSection.tsx` |
| 대시보드 | `src/features/home/components/dashboard/DashboardPage.tsx` |
| 빠른 시작 | `src/features/home/components/dashboard/QuickStartSection.tsx` |
| AI 기능 | `src/features/home/components/dashboard/AiFeatureSection.tsx` |
| 최근 자료 | `src/features/home/components/RecentDocumentsSection.tsx` |
| 아동/그룹 리스트 | `src/features/home/components/ChoiceUserSection.tsx` |
| 아동 편집 모달 | `src/features/home/components/EditUserModal.tsx` |
| 그룹 편집 모달 | `src/features/home/components/EditGroupModal.tsx` |
| 학생 모델 | `src/features/home/model/student.model.ts` |
| 그룹 모델 | `src/features/home/model/group.model.ts` |
| 학생 스토어 | `src/features/home/store/useStudentStore.ts` |
| 내 학습자료 | `src/pages/mydoc/MyDocPage.tsx` |
| 메인 이미지 | `src/shared/assets/main_image.png` |
