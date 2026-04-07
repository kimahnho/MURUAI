/**
 * 워크시트 컴포넌트 사용 분석 이벤트 수집 훅.
 * useEditorSubscriptions와 독립적으로 동작 — 추적 실패가 에디터에 영향 없음.
 * 모든 구독 콜백은 try-catch로 격리.
 */
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useWorksheetElementStore } from "@/features/editor/store/worksheetElementStore";
import type { InsertedWorksheetComponent } from "@/features/editor/store/worksheetElementStore";
import type { WorksheetConfig } from "@/features/worksheet-editor/model/types";
import { DEFAULT_CONFIGS } from "@/features/worksheet-editor/constants/defaults";
import {
  initWorksheetSession,
  trackWorksheetInsert,
  trackWorksheetConfigChangeDebounced,
  trackWorksheetReorder,
  trackWorksheetDelete,
  recordComponentInsertTime,
  getComponentLifetimeSeconds,
} from "@/shared/utils/trackWorksheetAnalytics";

/** config의 최상위 키 비교로 변경된 필드 목록 반환 */
const diffConfigKeys = (prev: WorksheetConfig, next: WorksheetConfig): string[] => {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: string[] = [];
  for (const k of keys) {
    const pv = (prev as unknown as Record<string, unknown>)[k];
    const nv = (next as unknown as Record<string, unknown>)[k];
    if (JSON.stringify(pv) !== JSON.stringify(nv)) changed.push(k);
  }
  return changed;
};

export const useWorksheetAnalytics = (docId: string | null, selectedPageId: string) => {
  // 이전 상태 캐시 (config 변경 감지용)
  const prevConfigsRef = useRef<Map<string, WorksheetConfig>>(new Map());
  // 이전 컴포넌트 순서 캐시 (reorder 감지용)
  const prevOrderRef = useRef<string[]>([]);

  // 세션 초기화
  useEffect(() => {
    const userId = useAuthStore.getState().user?.id;
    if (userId) initWorksheetSession(userId);
  }, []);

  // 1. Insert 구독
  useEffect(() => {
    let prevRequestId = useWorksheetElementStore.getState().requestId;
    const unsub = useWorksheetElementStore.subscribe((state) => {
      if (state.requestId === prevRequestId) return;
      prevRequestId = state.requestId;
      try {
        const comps = state.insertedComponents;
        if (comps.length === 0) return;
        const lastComp = comps[comps.length - 1];
        recordComponentInsertTime(lastComp.id);
        trackWorksheetInsert(docId, selectedPageId, lastComp.id, lastComp.type, {
          insert_index: comps.length - 1,
          total_after: comps.length,
          component_sequence: comps.map((c) => c.type),
          source: "palette",
          default_config: structuredClone(DEFAULT_CONFIGS[lastComp.type]),
        });
        // config 캐시 초기화
        prevConfigsRef.current.set(lastComp.id, structuredClone(lastComp.config));
      } catch {
        // 추적 실패 무시
      }
    });
    return unsub;
  }, [docId, selectedPageId]);

  // 2. Batch insert 구독
  useEffect(() => {
    let prevBatchId = useWorksheetElementStore.getState().batchRequestId;
    const unsub = useWorksheetElementStore.subscribe((state) => {
      if (state.batchRequestId === prevBatchId) return;
      prevBatchId = state.batchRequestId;
      try {
        const comps = state.insertedComponents;
        for (const comp of comps) {
          recordComponentInsertTime(comp.id);
          trackWorksheetInsert(docId, selectedPageId, comp.id, comp.type, {
            insert_index: comps.indexOf(comp),
            total_after: comps.length,
            component_sequence: comps.map((c) => c.type),
            source: "example",
            default_config: structuredClone(DEFAULT_CONFIGS[comp.type]),
          });
          prevConfigsRef.current.set(comp.id, structuredClone(comp.config));
        }
      } catch {
        // 추적 실패 무시
      }
    });
    return unsub;
  }, [docId, selectedPageId]);

  // 3. Config change 구독 (디바운스)
  useEffect(() => {
    let prevChangeId = useWorksheetElementStore.getState().configChangeId;
    const unsub = useWorksheetElementStore.subscribe((state) => {
      if (state.configChangeId === prevChangeId) return;
      prevChangeId = state.configChangeId;
      // reorder는 별도 구독에서 처리
      if (state.lastChangedComponentId === "__reorder__") return;
      try {
        const compId = state.lastChangedComponentId;
        if (!compId) return;
        const comp = state.insertedComponents.find((c) => c.id === compId);
        if (!comp) return;
        const prevConfig = prevConfigsRef.current.get(compId);
        const changedFields = prevConfig ? diffConfigKeys(prevConfig, comp.config) : Object.keys(comp.config);
        prevConfigsRef.current.set(compId, structuredClone(comp.config));
        trackWorksheetConfigChangeDebounced(
          docId, selectedPageId, compId, comp.type, comp.config, changedFields,
        );
      } catch {
        // 추적 실패 무시
      }
    });
    return unsub;
  }, [docId, selectedPageId]);

  // 4. Reorder 구독
  useEffect(() => {
    let prevChangeId = useWorksheetElementStore.getState().configChangeId;
    const unsub = useWorksheetElementStore.subscribe((state) => {
      if (state.configChangeId === prevChangeId) return;
      prevChangeId = state.configChangeId;
      if (state.lastChangedComponentId !== "__reorder__") return;
      try {
        const newOrder = state.insertedComponents.map((c) => c.id);
        const oldOrder = prevOrderRef.current;
        // from/to 역산: 이전 순서에서 위치가 바뀐 요소 찾기
        let fromIndex = -1;
        let toIndex = -1;
        if (oldOrder.length === newOrder.length) {
          for (let i = 0; i < oldOrder.length; i++) {
            if (oldOrder[i] !== newOrder[i]) {
              if (fromIndex === -1) fromIndex = i;
              toIndex = i;
            }
          }
        }
        prevOrderRef.current = newOrder;
        trackWorksheetReorder(docId, selectedPageId, {
          from_index: fromIndex,
          to_index: toIndex,
          component_sequence: state.insertedComponents.map((c) => c.type),
        });
      } catch {
        // 추적 실패 무시
      }
    });
    return unsub;
  }, [docId, selectedPageId]);

  // 5. Delete 구독
  useEffect(() => {
    let prevDeleteId = useWorksheetElementStore.getState().deleteWithElementsId;
    const unsub = useWorksheetElementStore.subscribe((state) => {
      if (state.deleteWithElementsId === prevDeleteId) return;
      prevDeleteId = state.deleteWithElementsId;
      try {
        const compId = state.pendingDeleteCompId;
        if (!compId) return;
        const comps = state.insertedComponents;
        const comp = comps.find((c) => c.id === compId);
        if (!comp) return;
        const deleteIndex = comps.indexOf(comp);
        const lifetime = getComponentLifetimeSeconds(compId);
        const remaining = comps.filter((c) => c.id !== compId);
        trackWorksheetDelete(docId, selectedPageId, compId, comp.type, {
          delete_index: deleteIndex,
          total_after: remaining.length,
          component_sequence: remaining.map((c) => c.type),
          config_at_deletion: structuredClone(comp.config),
          lifetime_seconds: lifetime,
        });
        prevConfigsRef.current.delete(compId);
      } catch {
        // 추적 실패 무시
      }
    });
    return unsub;
  }, [docId, selectedPageId]);

  // 컴포넌트 순서 캐시 동기화
  useEffect(() => {
    const comps = useWorksheetElementStore.getState().insertedComponents;
    prevOrderRef.current = comps.map((c: InsertedWorksheetComponent) => c.id);
    for (const comp of comps) {
      if (!prevConfigsRef.current.has(comp.id)) {
        prevConfigsRef.current.set(comp.id, structuredClone(comp.config));
      }
    }
  }, [selectedPageId]);
};
