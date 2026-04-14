/**
 * 유저 인터랙션 로그 수집 유틸.
 * Mixpanel + Supabase DB 이중 추적. 비차단 패턴 (void + console.warn).
 */
import { supabase } from "@/shared/api/supabase";
import { mp } from "@/shared/utils/mixpanel";
import { useAuthStore } from "@/shared/store/useAuthStore";

type InteractionParams = {
  /** 카테고리: template | editor | ai | export | navigation */
  category: string;
  /** 액션: template_apply | element_create | font_change 등 */
  action: string;
  /** 대상 (템플릿ID, 요소타입 등) */
  target?: string;
  /** 상세 데이터 (설정값, 입력값 등) */
  metadata?: Record<string, unknown>;
  /** 문서 ID */
  docId?: string;
};

// 브라우저 세션 ID — 탭 단위로 유지
let sessionId: string | null = null;
const getSessionId = () => {
  if (!sessionId) {
    sessionId = sessionStorage.getItem("interactionSessionId");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("interactionSessionId", sessionId);
    }
  }
  return sessionId;
};

/**
 * 유저 인터랙션을 Mixpanel + DB에 기록한다.
 * 비차단 — 실패해도 앱 흐름을 막지 않는다.
 */
export const trackInteraction = ({
  category,
  action,
  target,
  metadata,
  docId,
}: InteractionParams): void => {
  const userId = useAuthStore.getState().user?.id;

  // Mixpanel 추적
  mp.track(`[${category}] ${action}`, {
    category,
    action,
    target,
    doc_id: docId,
    ...metadata,
  });

  // DB 추적
  if (!userId) return;
  void (async () => {
    try {
      const { error } = await supabase.from("user_interaction_logs").insert({
        user_id: userId,
        session_id: getSessionId(),
        doc_id: docId ?? null,
        category,
        action,
        target: target ?? null,
        metadata: metadata ?? null,
      });
      if (error) console.warn("interaction log insert failed", error);
    } catch (e) {
      console.warn("interaction log error", e);
    }
  })();
};
