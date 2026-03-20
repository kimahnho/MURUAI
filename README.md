# MuruAI

캔버스 기반 교육 자료 제작 에디터. Figma/Canva와 유사한 디자인 에디터로, 언어치료 및 특수교육 현장에서 사용하는 교안을 제작합니다.

## 기술 스택

- **프레임워크**: React 19 + TypeScript
- **빌드**: Vite + React Compiler (babel-plugin-react-compiler)
- **상태 관리**: Zustand (selector 기반 구독)
- **서버 상태**: TanStack Query
- **백엔드**: Supabase (Auth, Database, Storage, Edge Functions)
- **스타일링**: Tailwind CSS v4
- **PDF 출력**: html-to-image + jsPDF
- **모니터링**: Sentry, Mixpanel, Vercel Analytics

## 시작하기

### 환경 변수

`.env` 파일을 생성하고 필수 변수를 설정합니다.

```bash
# 필수
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<supabase-anon-key>

# 선택
VITE_SENTRY_DSN=<sentry-dsn>
VITE_SENTRY_AUTH_TOKEN=<sentry-auth-token>
VITE_MIXPANEL_TOKEN=<mixpanel-token>
VITE_GOOGLE_API_KEY=<google-ai-api-key>  # 로컬 개발 전용 (프로덕션은 서버 프록시)
```

### 설치 및 실행

```bash
yarn install
yarn dev
```

## 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `yarn dev` | 개발 서버 시작 |
| `yarn build` | TypeScript 검사 + Vite 프로덕션 빌드 |
| `yarn typecheck` | TypeScript 타입 검사만 (tsc -b --noEmit) |
| `yarn lint` | ESLint + TypeScript 검사 |
| `yarn preview` | 프로덕션 빌드 미리보기 |
| `yarn generate:fonts` | CDN 폰트 레지스트리 재생성 |

## 프로젝트 구조

```
src/
  app/              # 엔트리, 라우팅, 레이아웃, 전역 Provider
  shared/           # 공용 유틸·UI·훅 (features를 import하지 않음)
  features/
    editor/         # 핵심 디자인 에디터
      hooks/        # 에디터 전용 훅
      model/        # 타입 정의
      store/        # Zustand 스토어
      sections/     # 캔버스, 사이드바, 하단바
      templates/    # 템플릿 정의 및 PDF 자산
      utils/        # 에디터 유틸리티
      ai/           # AI 기능 (스토리 생성, 이미지 생성)
    home/           # 홈 페이지
    admin/          # 관리자 대시보드
    storybook/      # AI 스토리북 생성기
  pages/            # 라우트 레벨 페이지
api/                # Vercel Serverless Functions (GenAI 프록시)
supabase/           # SQL 마이그레이션
```

### 의존성 규칙

- `shared/` → `features/` import 금지
- `features/A` → `features/B` 직접 import 금지
- 경로 별칭: `@/` → `src/`
