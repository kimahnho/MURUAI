/**
 * 워크시트 컴포넌트 사용 분석 이벤트 수집.
 * Agentic AI 학습 데이터용 — 컴포넌트 조합 패턴, config 분포, 편집 순서, 삭제 패턴 수집.
 *
 * 비차단 패턴: pushEvent는 동기 배열 push만 수행 (네트워크 없음).
 * 5초마다 또는 10개 쌓이면 batch insert로 Supabase 전송.
 * 전송 실패 시 console.warn — 에디터 동작에 영향 없음.
 */
import { supabase } from "@/shared/api/supabase";
import type { WorksheetComponentType, WorksheetConfig } from "@/features/worksheet-editor/model/types";

// --- 세션 상태 (모듈 레벨, 탭 수명과 동일) ---
let _sessionId: string | null = null;
let _userId: string | null = null;
let _seq = 0;

const SESSION_KEY = "worksheet_analytics_session";

/** 세션 초기화 — useWorksheetAnalytics 마운트 시 호출 */
export const initWorksheetSession = (userId: string) => {
  _userId = userId;
  // HMR/새로고침 시 세션 복원
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { sessionId: string; seq: number };
      _sessionId = parsed.sessionId;
      _seq = parsed.seq;
      return;
    } catch {
      // 파싱 실패 시 새 세션
    }
  }
  _sessionId = crypto.randomUUID();
  _seq = 0;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: _sessionId, seq: 0 }));
};

// --- 버퍼 + 배치 전송 ---
interface BufferedEvent {
  user_id: string;
  doc_id: string | null;
  page_id: string;
  session_id: string;
  event_type: string;
  component_id: string | null;
  component_type: string | null;
  seq: number;
  payload: Record<string, unknown>;
}

const _buffer: BufferedEvent[] = [];
let _flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000;
const FLUSH_THRESHOLD = 10;

const scheduleFlush = () => {
  if (_flushTimer) return;
  _flushTimer = setTimeout(() => {
    _flushTimer = null;
    void flush();
  }, FLUSH_INTERVAL);
};

const flush = async () => {
  if (_buffer.length === 0) return;
  const batch = _buffer.splice(0);
  const { error } = await supabase
    .from("worksheet_interaction_events")
    .insert(batch);
  if (error) {
    console.warn("worksheet_interaction_events batch insert failed", error);
    // 실패한 이벤트를 버퍼 앞에 복원 (다음 flush에서 재시도)
    _buffer.unshift(...batch);
  }
};

// 페이지 언로드 시 마지막 flush 시도
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (_buffer.length > 0) void flush();
  });
}

// --- 이벤트 push (동기, 논블로킹) ---
const pushEvent = (
  docId: string | null,
  pageId: string,
  eventType: string,
  componentId: string | null,
  componentType: string | null,
  payload: Record<string, unknown>,
) => {
  if (!_sessionId || !_userId) return;

  _buffer.push({
    user_id: _userId,
    doc_id: docId,
    page_id: pageId,
    session_id: _sessionId,
    event_type: eventType,
    component_id: componentId,
    component_type: componentType,
    seq: _seq++,
    payload,
  });

  // seq 영속화
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: _sessionId, seq: _seq }));

  if (_buffer.length >= FLUSH_THRESHOLD) {
    void flush();
  } else {
    scheduleFlush();
  }
};

// --- Public API ---

export const trackWorksheetInsert = (
  docId: string | null,
  pageId: string,
  componentId: string,
  componentType: WorksheetComponentType,
  payload: {
    insert_index: number;
    total_after: number;
    component_sequence: WorksheetComponentType[];
    source: "palette" | "example";
    default_config: WorksheetConfig;
  },
) => {
  pushEvent(docId, pageId, "insert", componentId, componentType, payload as unknown as Record<string, unknown>);
};

export const trackWorksheetConfigChange = (
  docId: string | null,
  pageId: string,
  componentId: string,
  componentType: WorksheetComponentType,
  payload: {
    changed_fields: string[];
    config_after: WorksheetConfig;
  },
) => {
  pushEvent(docId, pageId, "config_change", componentId, componentType, payload as unknown as Record<string, unknown>);
};

export const trackWorksheetReorder = (
  docId: string | null,
  pageId: string,
  payload: {
    from_index: number;
    to_index: number;
    component_sequence: WorksheetComponentType[];
  },
) => {
  pushEvent(docId, pageId, "reorder", null, null, payload as unknown as Record<string, unknown>);
};

export const trackWorksheetDelete = (
  docId: string | null,
  pageId: string,
  componentId: string,
  componentType: WorksheetComponentType,
  payload: {
    delete_index: number;
    total_after: number;
    component_sequence: WorksheetComponentType[];
    config_at_deletion: WorksheetConfig;
    lifetime_seconds: number;
  },
) => {
  pushEvent(docId, pageId, "delete", componentId, componentType, payload as unknown as Record<string, unknown>);
};

export const trackWorksheetSnapshot = (
  docId: string | null,
  pageId: string,
  payload: {
    components: { id: string; type: WorksheetComponentType; config: WorksheetConfig; element_count: number }[];
    total: number;
  },
) => {
  pushEvent(docId, pageId, "snapshot", null, null, payload as unknown as Record<string, unknown>);
};

// --- config_change 디바운스 (컴포넌트별 1초) ---
const _configTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const trackWorksheetConfigChangeDebounced = (
  docId: string | null,
  pageId: string,
  componentId: string,
  componentType: WorksheetComponentType,
  configAfter: WorksheetConfig,
  changedFields: string[],
) => {
  const existing = _configTimers.get(componentId);
  if (existing) clearTimeout(existing);
  _configTimers.set(
    componentId,
    setTimeout(() => {
      _configTimers.delete(componentId);
      trackWorksheetConfigChange(docId, pageId, componentId, componentType, {
        changed_fields: changedFields,
        config_after: configAfter,
      });
    }, 1000),
  );
};

// --- 삭제 시 lifetime 계산 ---
const _insertTimestamps = new Map<string, number>();

export const recordComponentInsertTime = (componentId: string) => {
  _insertTimestamps.set(componentId, Date.now());
};

export const getComponentLifetimeSeconds = (componentId: string): number => {
  const ts = _insertTimestamps.get(componentId);
  _insertTimestamps.delete(componentId);
  if (!ts) return 0;
  return Math.round((Date.now() - ts) / 1000);
};

// --- snapshot 해시 중복 방지 ---
const _lastSnapshotHash = new Map<string, string>();

/** 키를 정렬하여 안정적 직렬화 */
const stableStringify = (obj: unknown): string => JSON.stringify(obj, (_, v) => {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return Object.keys(v).sort().reduce<Record<string, unknown>>((acc, k) => { acc[k] = (v as Record<string, unknown>)[k]; return acc; }, {});
  }
  return v as unknown;
});

export const shouldEmitSnapshot = (
  pageId: string,
  components: { id: string; type: string; config: unknown; element_count: number }[],
): boolean => {
  const hash = stableStringify(components);
  const prev = _lastSnapshotHash.get(pageId);
  if (prev === hash) return false;
  _lastSnapshotHash.set(pageId, hash);
  return true;
};

// --- 디버그용: 버퍼 내용 확인 ---
export const getBufferSnapshot = () => [..._buffer];
export const getBufferSize = () => _buffer.length;
