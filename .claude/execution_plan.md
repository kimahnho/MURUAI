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
6. 비활성 페이지를 IndexedDB로 스왑(LRU 기반).
7. 검증 시나리오 수행.

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
6. 페이지 스왑(LRU + IndexedDB)
   - 활성/가시 페이지는 메모리에 유지.
   - 비활성 페이지는 요소 데이터를 IndexedDB에 저장 후 메모리에서 제거.
   - PDF 내보내기 시 모든 페이지를 재로드(수화)한 뒤 렌더링.
7. 저장 안전장치
   - 자동/수동 저장 전에 스왑된 페이지 전체 수화 완료 대기.
   - 수화 완료 후 서버 저장 진행.
8. 라우트/에디터 화면 코드 분할
   - 라우트 단위 lazy 로딩 적용.
   - 에디터 내부 주요 섹션(MainSection, SideBar) lazy 로딩 적용.
   - MainSection 내부 툴바/하단바/다이얼로그 lazy 로딩 적용.
9. 에디터 전용 폰트 지연 로딩
   - 전역 스타일에서 에디터 전용 `@font-face` 정의 제거.
   - 에디터 페이지 로드 시에만 폰트 CSS를 로딩하도록 분리.

**검증**
1. 페이지 50개 이상 생성 후 BottomBar 스크롤 시 렌더링 범위 확인.
2. PDF 전체/선택 내보내기 정상 동작 확인.
3. 50회 이상 편집 후 undo/redo 동작 및 메모리 사용량 확인.
4. 에디터 진입 전에는 폰트 리소스가 요청되지 않는지 확인.

## BottomBar 안정화 지침(추가)

1. `TanStack Query`는 서버 상태 캐시 용도이며, 하단 페이지 바 스크롤/가상화 문제 해결 수단으로 사용하지 않는다.
2. BottomBar 스크롤 상한 계산은 추정 폭(`totalWidth`) 대신 실제 DOM 값(`scrollWidth`)을 우선 사용한다.
3. 선택 페이지 자동 이동은 "이미 보이는 경우 이동하지 않음"을 기본 정책으로 유지한다.
4. 페이지 추가 직후 자동 이동은 새 선택 페이지 기준으로 즉시 정렬하며, 중첩 `smooth` 스크롤을 피한다.
5. 네트워크 가능한 환경에서 `@tanstack/react-virtual` 도입을 검토하되, 도입 전까지는 수동 가상화보다 안정 동작을 우선한다.

## 현재 우선순위(조정)

- 사용자 요청에 따라 성능 이슈 `1(초기 JS 번들 과대)`, `2(폰트 리소스 용량 과대)`는 현 단계에서 추가 작업 제외.
- 이번 단계는 아래 항목만 진행:
1. 대문서 저장 시 강제 hydrate 비용 완화.
2. PDF 내보내기 피크 메모리 완화.
3. 사이드바/캔버스 불필요 재렌더 감소.
4. IndexedDB 스왑 복원 체감 지연 완화.

## 이번 턴 반영 내용

1. 저장 경로 최적화(완료)
   - 저장 전 전체 페이지를 강제로 화면 hydrate 하던 흐름을 제거.
   - 저장 시점에는 `isSwapped` 페이지만 IndexedDB에서 읽어 직렬화 데이터에만 합성.
   - 효과: 저장 순간 대규모 메모리 스파이크 완화.
2. PDF 메모리 피크 완화(완료)
   - `canvas.toDataURL()` 경로를 제거하고 캔버스를 jsPDF에 직접 전달.
   - 페이지 추가 후 캔버스 `width/height` 초기화로 메모리 즉시 해제 유도.
3. 스왑/복원 배치 처리(완료)
   - 스왑 복원/퇴출 시 페이지 단위 `setPages` 반복을 배치 업데이트 1회로 축소.
   - 효과: 대량 페이지에서 렌더 횟수와 체감 지연 감소.
4. 선로딩 범위 보강(완료)
   - 선택 페이지의 인접 페이지(앞/뒤 1장)를 `requiredPageIds`에 포함.
   - 효과: 페이지 전환 시 스왑 복원 대기 감소.
5. IndexedDB 배치 I/O(완료)
   - 페이지별 개별 읽기/쓰기 트랜잭션을 배치 트랜잭션으로 통합.
   - `loadPageElementsBatch`, `savePageElementsBatch` 도입 및 저장/스왑 경로 적용.
   - 효과: 대량 페이지 문서에서 저장/복원 지연 및 메인 스레드 부담 완화.
6. 실측 로그 계측(완료)
   - `perfLogger` 유틸 도입.
   - 자동 저장/수동 저장/PDF 생성/페이지 스왑 경로에 소요 시간 로그 추가.
   - `DEV` 또는 `VITE_EDITOR_PERF_LOG=true` 환경에서만 출력.
7. BottomBar 휠 이벤트 경고 수정(완료)
   - React `onWheel` 경로에서 `preventDefault()` 호출 시 passive 경고 발생.
   - BottomBar 컨테이너에 `passive: false` 네이티브 `wheel` 리스너를 등록하도록 변경.
8. PDF UX/부하 제어(완료)
   - 내보내기 진행률(`n/total`) 및 안내 문구 추가.
   - 내보내기 취소 버튼 추가(AbortController 기반).
   - PDF 내보내기 중 자동 저장 일시 정지(`pdfExporting` 상태 기반).
9. 다중 선택 드래그 동작 보정(완료)
   - 다중 선택 상태에서 요소 드래그 시작 시 단일 선택으로 리셋되던 조건 제거.
   - 선택된 요소 중 하나를 드래그하면 전체 선택 요소가 함께 이동하도록 정렬.

## 실측 방법

1. 개발 환경에서 에디터 실행 후 콘솔에서 `[editor-perf]` 로그 확인.
2. 측정 대상 로그:
   - `autosave.resolvePagesForPersistence`
   - `autosave.updateUserMadeVersion`
   - `manualsave.resolvePagesForPersistence`
   - `manualsave.updateUserMadeVersion`
   - `pdf.generate.total`
   - `pdf.render.page`
   - `pageswap.loadBatch`
   - `pageswap.saveBatch`
