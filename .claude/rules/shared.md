# Shared (공용 모듈) 지침

> 모든 feature에서 사용하는 공용 코드. **feature를 import하면 안 됨**.

## 폴더 구조

```
src/shared/
  ui/           # 순수 UI 컴포넌트 (BaseModal, Button 등)
  hooks/        # 범용 훅 (useAuth)
  lib/          # 유틸리티 (initSentry, initMixpanel)
  store/        # 전역 스토어 (useAuthStore)
  supabase/     # Supabase 클라이언트
  providers/    # 전역 Provider (AuthProvider)
  components/   # 공용 컴포넌트 (ErrorFallback, AuthModal)
  assets/       # 이미지, 아이콘
  cloudinary/   # Cloudinary 유틸
```

## 의존성 규칙 (중요)

```typescript
// ❌ 절대 금지
import { useEditorStore } from '@/features/editor/store/...';
import { MyDocPage } from '@/pages/mydoc/...';

// ✅ 허용
import { supabase } from '@/shared/supabase/supabase';
import { useAuthStore } from '@/shared/store/useAuthStore';
```

## shared/ui 컴포넌트 요건

1. **비즈니스 로직 금지** - 순수 UI만
2. **store 접근 금지** - Zustand, 전역 상태 사용 불가
3. **API 호출 금지** - Supabase, fetch 사용 불가
4. **navigation 금지** - react-router 사용 불가
5. **props 기반** - 모든 데이터는 props로 전달

## 주요 파일

| 파일 | 용도 |
|------|------|
| `supabase/supabase.ts` | Supabase 클라이언트 인스턴스 |
| `store/useAuthStore.ts` | 인증 상태 전역 관리 |
| `hooks/useAuth.ts` | 인증 관련 훅 |
| `providers/AuthProvider.tsx` | 인증 상태 초기화 |
| `components/AuthModal.tsx` | 로그인 모달 |
| `components/ErrorFallback.tsx` | 에러 바운더리 폴백 |

## 새 공용 코드 추가 기준

- 2개 이상의 서로 다른 feature에서 사용
- 도메인 종속 없음 (User, Document, Student 등에 묶이지 않음)
- 위 조건 미충족 시 feature 내부에 유지
