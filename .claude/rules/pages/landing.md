# 메인 페이지 (NewLandingPage) 지침

> "/" 경로. 프롬프트 입력 중심의 AI 학습자료 생성 진입점.

## 구조

```
NewLandingPage
  ├─ PromptHeroSection   — 주제 입력 + 생성 버튼 + 미리보기 캐러셀
  ├─ CapabilitySection   — 기능 소개 카드 3개 + 하단 CTA
  └─ AuthModal           — 로그인 모달 (비인증 시)
```

## 생성 흐름 (HomePage.tsx)

### 인증 사용자

1. 주제 입력 → "생성하기" 클릭
2. `fetchMonthlyAiTemplateUsage()` → 30회 이상이면 소진 모달
3. `fetchEmotionImageMap("photo-boy")` → `generateEmotionStory(topic)` → `buildEmotionStoryPages()`
4. `sessionStorage("pendingAiLog")` 저장 (에디터에서 DB 로그 + 배너 등록)
5. `recordAiTemplateUsage("emotion")` — 사용량 기록
6. `createAndOpenDocument({ pages })` → 에디터 이동

### 비인증 사용자

1. 주제 입력 → "생성하기" 클릭
2. `sessionStorage("pendingLandingTopic")` 저장 → `openAuthModal()`
3. 로그인 완료 → `useEffect`가 pendingTopic 감지 → 자동 `executeGeneration()`

## 월간 사용량 제한

- `MONTHLY_AI_TEMPLATE_LIMIT = 30`
- 인증 시 `fetchMonthlyAiTemplateUsage()` 조회 → `isQuotaExhausted` state
- 소진 시: `BaseModal` "무료 이용 횟수 소진" 모달 + input/버튼 disabled

## sessionStorage 키

| 키 | 용도 | 소비 위치 |
|----|------|-----------|
| `pendingLandingTopic` | 비인증 시 입력 주제 보관 | `HomePage useEffect` |
| `pendingAiLog` | 생성 로그 데이터 (에디터 전달) | `useEditorSubscriptions` |

## 레이아웃 규칙

- **간격은 padding + gap** — margin 대신 부모 `gap` 또는 `padding`으로 관리
- **섹션 간 균일 간격** — 프롬프트 영역 이후 하단 섹션들은 래퍼 div의 `gap-12 md:gap-16`으로 통일
- **프롬프트 영역 ↔ 하단 영역 분리** — 래퍼의 `pt-10 md:pt-14`로 구분

## 디자인 톤

웜톤 베이지/브라운 계열:
- 배경: `from-[#FFFDF9] to-[#F9F7F2]`
- 텍스트: `#3A332C` (진함), `#6A5D54` (중간), `#A69B8F` (연함)
- 버튼: `bg-[#8C6D46] hover:bg-[#7A5D3A]`
- 보더/칩: `border-[#EBE2D0]`, `bg-[#FCFAF5]`
- 헤더 가입 버튼: `bg-[#3A332C]` (다크 브라운)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 페이지 조합 (생성 로직) | `src/pages/home/HomePage.tsx` |
| 메인 페이지 | `src/features/home/components/landing/NewLandingPage.tsx` |
| 프롬프트 히어로 | `src/features/home/components/landing/PromptHeroSection.tsx` |
| 기능 소개 + CTA | `src/features/home/components/landing/CapabilitySection.tsx` |
| AI 사용량 유틸 | `src/features/editor/utils/aiTemplateUsage.ts` |
