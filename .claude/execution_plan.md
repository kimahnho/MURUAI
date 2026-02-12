# 편집 페이지 메모리 최적화 실행 계획

**목표**
페이지 수가 많아져도 RAM 사용량이 급증하지 않도록 렌더링과 히스토리 저장 방식을 개선한다.

**범위**
에디터 UI 및 히스토리 동작만 변경한다. 외부 API 계약은 변경하지 않는다.

**진행 단계**
1. 하단 썸네일 리스트 가상화 적용.
2. PDF 미리보기는 내보내기 시점에만 렌더링.
3. 히스토리 최대 저장 개수 50으로 제한.
4. 히스토리 저장 방식을 페이지 diff 기반으로 변경.
5. 페이지 변경 감지를 위한 `rev`(revision) 필드 도입.
6. 검증 시나리오 수행.

**구현 상세**
1. BottomBar 가상화
   - `listRef` 스크롤 위치와 컨테이너 너비로 가시 범위를 계산.
   - 가시 범위 + 버퍼만 렌더링.
   - 좌/우 스페이서로 전체 스크롤 폭 유지.
2. PDF 미리보기 온디맨드
   - `MainSection`에서 `PdfPreviewContainer` 제거.
   - `DesignLayout`에 `isPdfPreviewActive`, `preparePdfPages`, `cleanupPdfPages` 추가.
   - `ExportModal`에서 다운로드 전 `preparePdfPages`, 종료 시 `cleanupPdfPages` 호출.
3. 히스토리 용량 제한
   - `MAX_HISTORY_ENTRIES = 50` 도입.
   - `past`가 최대치를 넘으면 가장 오래된 항목 제거.
4. 히스토리 diff 저장
   - `past/future`는 페이지 diff만 저장.
   - `present`는 스냅샷 유지.
   - undo/redo는 diff 적용 방식으로 복원.
5. 증분 해시(페이지 rev)
   - `Page.rev` 필드 추가.
   - 페이지 내용 변경 시 `rev++`.
   - 히스토리 비교는 `id + rev`로 빠르게 판단.

**검증**
1. 페이지 50개 이상 생성 후 BottomBar 스크롤 시 렌더링 범위 확인.
2. PDF 전체/선택 내보내기 정상 동작 확인.
3. 50회 이상 편집 후 undo/redo 동작 및 메모리 사용량 확인.
