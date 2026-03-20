# TODOS

## 🔴 High Priority

### ~~Google API 키 백엔드 프록시 이동~~ ✅ 완료 (2026-03-20)
- `getGenAI()`를 HTTP 프록시 클라이언트로 교체 → `/api/genai/text`, `/api/genai/image` 서버 라우트 경유
- Vercel 대시보드에 `GOOGLE_API_KEY` (VITE_ 없음) 환경변수 설정 필요
- `.env.local`에서 `VITE_GOOGLE_API_KEY` 제거는 배포 확인 후 진행

### ~~.env.local에서 Cloudinary API Secret 제거~~ ✅ 완료 (2026-03-20)
- `VITE_CLAUDINARY_API_SECRET` 항목 삭제됨

## 🟡 Medium Priority (사용자 검증 후)

### sessionStorage → localStorage 정리
- **What:** UI 영속 상태(bottomBarCollapsed 등)를 localStorage로, 임시 상태는 sessionStorage 유지
- **Why:** 탭 닫으면 UI 설정 초기화되는 불편함
- **Scope:** 44개 sessionStorage 사용처 분류 후 적절한 저장소로 이동
- **Blocked by:** 사용자 피드백으로 우선순위 확인
- **Added:** 2026-03-20 (plan-eng-review)

### 테스트 인프라 구축
- **What:** vitest 설정 + 핵심 유틸리티 유닛 테스트
- **Why:** 코드 변경 시 기존 기능 깨짐 방지 (특히 undo/redo, 템플릿, 클립보드)
- **Scope:** vitest 설정 → 핵심 유틸리티(pageFactory, instantiateTemplate, unifiedHistoryStore) 테스트
- **Blocked by:** 사용자 검증 후 제품 방향 확정
- **Added:** 2026-03-20 (plan-eng-review)
