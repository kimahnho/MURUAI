# 메인 페이지 (NewLandingPage) 지침

> "/" 경로. 이미지 라이브러리 중심 랜딩 페이지.

## 구조

```
NewLandingPage
  ├─ HeroSection           — 메인/서브 카피 + 뱃지
  ├─ ImageGallerySection   — 6열×4행 이미지 24개 그리드
  ├─ EditorIntroSection    — 캔버스 에디터 미리보기
  ├─ ReasonsSection        — 선택 이유 카드 3개
  └─ CtaSection            — 무료 가입 CTA
```

**AuthModal**은 `MainLayout`에서 전역 렌더링 — 개별 페이지에서 import 불필요.

## 이미지 클릭 흐름 (HomePage.tsx)

### 인증 사용자

1. 갤러리 이미지 클릭
2. `buildImagePage(imageUrl)` — A4 중앙에 300×300 이미지 요소 생성
3. `createAndOpenDocument({ pages })` → 에디터 이동

### 비인증 사용자

1. 갤러리 이미지 클릭
2. `sessionStorage("pendingLandingImage")` 저장 → `openAuthModal()`
3. 로그인 완료 → `useEffect`가 pendingImage 감지 → 자동 `openDocumentWithImage()`

## sessionStorage 키

| 키 | 용도 | 소비 위치 |
|----|------|-----------|
| `pendingLandingImage` | 비인증 시 클릭한 이미지 URL 보관 | `HomePage useEffect` |

## 이미지 갤러리

- Cloudinary `muru-landing/` 폴더에 호스팅 (24장)
- `GALLERY_IMAGES` 상수 배열로 URL 관리 (`ImageGallerySection.tsx`)
- 반응형 그리드: 모바일 3열 / 태블릿 4열 / 데스크탑 6열
- 이미지 lazy loading (`loading="lazy"`)
- hover 시 `scale-105` + 보더 강조

## 디자인 톤

바이올렛 프라이머리 계열 (앱 디자인 시스템 통일):
- 배경: `from-[#FDFCFF] to-[#f5f3ff]` (히어로), `bg-primary-50` (에디터 소개)
- 텍스트: `text-black-90` (제목), `text-black-70` (부제)
- 버튼: `bg-primary hover:bg-primary-700`
- 보더/칩: `border-primary-200`, `bg-primary-50`
- 뱃지: `bg-primary-100 text-primary`
- 그림자: `rgba(124,58,237,0.08~0.14)` (바이올렛 틴트)

## 애니메이션 (framer-motion)

- **HeroSection**: `initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}` 페이드인
- **ImageGallerySection**: `whileInView` 스크롤 트리거 (`y: 30 → 0`, `once: true`)
- **EditorIntroSection / ReasonsSection**: `whileInView` 스크롤 트리거 (`y: 40 → 0`, `once: true`)

## 관련 파일

| 역할 | 경로 |
|------|------|
| 페이지 조합 (클릭 로직) | `src/pages/home/HomePage.tsx` |
| 메인 페이지 | `src/features/home/components/landing/NewLandingPage.tsx` |
| 히어로 | `src/features/home/components/landing/HeroSection.tsx` |
| 이미지 갤러리 | `src/features/home/components/landing/ImageGallerySection.tsx` |
| 에디터 소개 | `src/features/home/components/landing/EditorIntroSection.tsx` |
| 선택 이유 | `src/features/home/components/landing/ReasonsSection.tsx` |
| CTA | `src/features/home/components/landing/CtaSection.tsx` |
| 로고 요소 유틸 | `src/features/editor/utils/logoElement.ts` |
