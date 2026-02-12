import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/shared/api/supabase";
import { updateUserMadeVersion } from "../utils/userMadeExport";
import type { Page } from "../model/pageTypes";

export type SaveState = "saving" | "saved" | "error";

type AutoSaveParams = {
  pages: Page[];
  docId?: string | null;
  docName: string;
  // ✅ null도 전달하므로 타입에 포함
  onSaveStateChange?: (state: SaveState | null) => void;
  // 데이터 로딩 완료 여부 (초기 로딩 중에는 자동 저장 방지)
  isDataLoaded?: boolean;
};

export const useAutoSave = ({
  pages,
  docId,
  docName,
  onSaveStateChange,
  isDataLoaded = true, // 기본값 true로 하위 호환성 유지
}: AutoSaveParams) => {
  const [saveState, setSaveState] = useState<SaveState | null>(null);

  // ✅ setTimeout 타입 안정화 (Node/DOM 혼재 방지)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const lastPagesRef = useRef(pages);
  const clientRevisionRef = useRef(0);
  // 초기 저장을 방지하기 위한 플래그
  const hasInitialSaveRef = useRef(false);

  // ✅ deps 경고 방지 + 불필요한 재생성 방지: callback은 ref로 보관
  const onSaveStateChangeRef = useRef(onSaveStateChange);
  useEffect(() => {
    onSaveStateChangeRef.current = onSaveStateChange;
  }, [onSaveStateChange]);

  const emitSaveState = (state: SaveState | null) => {
    onSaveStateChangeRef.current?.(state);
  };

  // 데이터 유효성 검증
  const validateData = useCallback((pagesToSave: typeof pages) => {
    if (!pagesToSave || pagesToSave.length === 0) {
      console.warn("Save blocked: No pages to save");
      return false;
    }
    // 모든 페이지에 요소가 없는 경우 차단
    const hasAnyElements = pagesToSave.some(
      (page) => page.elements && page.elements.length > 0,
    );
    if (!hasAnyElements) {
      console.warn("Save blocked: All pages are empty");
      return false;
    }

    // 추가 안전장치: 총 요소 수가 너무 적으면 경고 (배포 시 데이터 손실 방지)
    const totalElements = pagesToSave.reduce(
      (sum, page) => sum + (page.elements?.length || 0),
      0,
    );
    if (totalElements < 1) {
      console.warn("Save blocked: Total elements count is suspiciously low", {
        totalElements,
        pageCount: pagesToSave.length,
      });
      return false;
    }

    return true;
  }, []);

  const performSave = useCallback(
    async (isManual = false) => {
      if (!docId) {
        // docId가 없으면 저장 대상 없음 (UI는 파생값으로 null 처리)
        return;
      }

      // 데이터 유효성 검증
      if (!validateData(lastPagesRef.current)) {
        if (isManual) {
          emitSaveState("error");
          if (statusResetTimeoutRef.current) {
            clearTimeout(statusResetTimeoutRef.current);
          }
          statusResetTimeoutRef.current = setTimeout(() => {
            emitSaveState(null);
            statusResetTimeoutRef.current = null;
          }, 2000);
        }
        return;
      }

      const myRevision = ++clientRevisionRef.current;

      try {
        // 수동 저장 시에만 상태 표시
        if (isManual) {
          setSaveState("saving");
          emitSaveState("saving");
        }

        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!user) {
          // 최신 요청일 때만 상태 반영
          if (myRevision === clientRevisionRef.current && isManual) {
            setSaveState(null);
            emitSaveState(null);
          }
          return;
        }

        await updateUserMadeVersion({
          docId,
          name: docName || "제목 없음",
          canvasData: { pages: lastPagesRef.current },
        });

        // ✅ 레이스 방지: 최신 저장만 반영
        if (myRevision !== clientRevisionRef.current) return;

        // 수동 저장 시에만 "저장됨" 표시
        if (isManual) {
          setSaveState("saved");
          emitSaveState("saved");
          // 2초 후 상태 초기화
          if (statusResetTimeoutRef.current) {
            clearTimeout(statusResetTimeoutRef.current);
          }
          statusResetTimeoutRef.current = setTimeout(() => {
            if (clientRevisionRef.current === myRevision) {
              setSaveState(null);
              emitSaveState(null);
            }
            statusResetTimeoutRef.current = null;
          }, 2000);
        }
      } catch (error) {
        if (myRevision !== clientRevisionRef.current) return;

        console.error("Save failed:", error);
        if (isManual) {
          setSaveState("error");
          emitSaveState("error");
        }
      }
    },
    [docId, docName, validateData],
  );

  useEffect(() => {
    lastPagesRef.current = pages;

    // 기존 타이머 정리
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // ✅ docId가 없으면 "동기 setState in effect"를 피해서 비동기로 reset
    if (!docId) {
      const t = setTimeout(() => {
        setSaveState(null);
        emitSaveState(null);
      }, 0);

      return () => clearTimeout(t);
    }

    // 🔒 데이터 로딩 중에는 자동 저장 방지 (배포 시 빈 상태 저장 방지)
    if (!isDataLoaded) {
      console.log("Auto-save skipped: Data not loaded yet");
      return;
    }

    // 🔒 초기 마운트 시 즉시 저장 방지 (첫 렌더링은 건너뛰기)
    if (!hasInitialSaveRef.current) {
      hasInitialSaveRef.current = true;
      console.log("Auto-save skipped: Initial mount");
      return;
    }

    // 1초 디바운스 자동 저장 (상태 표시 없음)
    saveTimeoutRef.current = setTimeout(() => performSave(false), 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [pages, docId, docName, performSave, isDataLoaded]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (statusResetTimeoutRef.current) {
        clearTimeout(statusResetTimeoutRef.current);
        statusResetTimeoutRef.current = null;
      }
    };
  }, []);

  const manualSave = useCallback(() => {
    if (!docId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    performSave(true);
  }, [docId, performSave]);

  const retrySave = useCallback(() => {
    if (!docId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    performSave(true);
  }, [docId, performSave]);

  // ✅ docId가 없으면 UI에는 항상 null로 보이게(파생값)
  const effectiveSaveState = docId ? saveState : null;

  return { saveState: effectiveSaveState, manualSave, retrySave };
};
