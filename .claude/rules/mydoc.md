# MyDoc (내 보관함) 지침

> 사용자가 만든 학습자료를 관리하는 페이지.

## 핵심 파일 위치

```
src/pages/mydoc/
  MyDocPage.tsx          # 메인 페이지 (pages와 features 1:1 대응)

src/features/mydoc/
  (현재 비어 있음 - 확장 시 아래 구조 사용)
```

## 기능

- 학습자/그룹별 자료 필터링
- 자료 검색
- 자료 삭제/복제
- 미리보기 (DesignPaper readOnly 모드 사용)

## Supabase 테이블

- `user_made_n` - 사용자 제작 문서
  - `id`, `user_id`, `name`, `canvas_data`, `created_at`
- `user_made_targets_n` - 문서-학습자/그룹 연결
  - `user_made_id`, `child_id`, `group_id`

## 미리보기 렌더링

```tsx
<DesignPaper
  pageId={`mydoc-${doc.id}`}
  orientation={previewOrientation}
  elements={previewElements}
  selectedIds={[]}
  editingTextId={null}
  readOnly  // 이벤트 핸들러 비활성화
/>
```

## 주의사항

1. **인증 필수** - 미인증 시 홈으로 리다이렉트
2. **canvas_data 파싱** - JSON 문자열 또는 객체 모두 처리
3. **orientation 검증** - 'horizontal' | 'vertical' 외 값은 'vertical'로 폴백
4. **삭제 시 targets도 삭제** - user_made_targets_n 먼저 삭제 후 user_made_n 삭제

## 확장 시

mydoc feature가 커지면 다음 구조로 분리:
```
src/features/mydoc/
  components/DocCard.tsx
  hooks/useMyDocs.ts
  api/myDocApi.ts
```
