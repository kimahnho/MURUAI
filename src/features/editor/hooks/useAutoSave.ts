/**
 * 에디터 변경사항을 디바운스 기반으로 자동 저장하고 수동 저장 상태를 함께 관리하는 훅.
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/shared/api/supabase";
import { measurePerf } from "../utils/perfLogger";
import { usePageSwapStore } from "../store/pageSwapStore";
import type { Page } from "../model/pageTypes";
import {
  buildPersistPayload,
  saveExistingDocument,
} from "../utils/documentPersistence";

export type SaveState = "saving" | "saved" | "error";

type AutoSaveParams = {
  pages: Page[];
  docId?: string | null;
  docName: string;
  onSaveStateChange?: (state: SaveState | null) => void;
  isDataLoaded?: boolean;
};

export const useAutoSave = ({
  pages,
  docId,
  docName,
  onSaveStateChange,
  isDataLoaded = true,
}: AutoSaveParams) => {
  const isDev = import.meta.env.DEV;
  const [saveState, setSaveState] = useState<SaveState | null>(null);
  const isPdfExporting = usePageSwapStore((state) => state.pdfExporting);

  // 런타임별 타이머 타입 차이를 피하기 위해 반환 타입 기반으로 통일한다.
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const lastPagesRef = useRef(pages);
  const clientRevisionRef = useRef(0);
  // 첫 렌더 직후 빈 상태가 덮어쓰는 것을 막기 위해 초기 저장을 건너뛴다.
  const hasInitialSaveRef = useRef(false);

  // 외부 콜백 변경으로 효과 훅이 재실행되지 않게 최신 콜백만 ref로 유지한다.
  const onSaveStateChangeRef = useRef(onSaveStateChange);
  useEffect(() => {
    onSaveStateChangeRef.current = onSaveStateChange;
  }, [onSaveStateChange]);

  const emitSaveState = (state: SaveState | null) => {
    onSaveStateChangeRef.current?.(state);
  };

  const validateData = useCallback((pagesToSave: typeof pages) => {
    if (!pagesToSave || pagesToSave.length === 0) {
      console.warn("Save blocked: No pages to save");
      return false;
    }
    const hasAnyElements = pagesToSave.some(
      (page) => page.elements && page.elements.length > 0,
    );
    if (!hasAnyElements) {
      console.warn("Save blocked: All pages are empty");
      return false;
    }

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
        // 문서 ID가 없으면 저장 대상이 없으므로 즉시 종료한다.
        return;
      }

      const myRevision = ++clientRevisionRef.current;

      try {
        if (isManual) {
          setSaveState("saving");
          emitSaveState("saving");
        }

        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (!user) {
          // 이전 요청이 늦게 끝나도 상태가 뒤집히지 않도록 최신 버전만 반영한다.
          if (myRevision === clientRevisionRef.current && isManual) {
            setSaveState(null);
            emitSaveState(null);
          }
          return;
        }

        const pagesToPersist = await measurePerf(
          "autosave.resolvePagesForPersistence",
          async () => (await buildPersistPayload(lastPagesRef.current)).pages,
          {
            totalPages: lastPagesRef.current.length,
            swappedPages: lastPagesRef.current.filter((page) => page.isSwapped)
              .length,
            isManual,
          },
        );
        if (!validateData(pagesToPersist)) {
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

        await measurePerf(
          "autosave.updateUserMadeVersion",
          () =>
            saveExistingDocument({
              docId,
              name: docName || "제목 없음",
              pages: pagesToPersist,
            }),
          {
            totalPages: pagesToPersist.length,
            isManual,
          },
        );

        if (myRevision !== clientRevisionRef.current) return;

        // 자동 저장은 조용히 처리하고, 수동 저장만 사용자 피드백을 노출한다.
        if (isManual) {
          setSaveState("saved");
          emitSaveState("saved");
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

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // 효과 훅 내부 동기 setState 경고를 피하기 위해 비동기로 상태를 초기화한다.
    if (!docId) {
      const t = setTimeout(() => {
        setSaveState(null);
        emitSaveState(null);
      }, 0);

      return () => clearTimeout(t);
    }

    // PDF 생성 중 저장이 겹치면 스냅샷 일관성이 깨질 수 있어 자동 저장을 멈춘다.
    if (isPdfExporting) {
      return;
    }

    // 데이터 로딩이 완료되기 전에는 빈 상태 저장을 막는다.
    if (!isDataLoaded) {
      if (isDev) {
        console.log("Auto-save skipped: Data not loaded yet");
      }
      return;
    }

    if (!hasInitialSaveRef.current) {
      hasInitialSaveRef.current = true;
      if (isDev) {
        console.log("Auto-save skipped: Initial mount");
      }
      return;
    }

    // 잦은 편집 입력을 묶기 위해 1초 디바운스로 저장한다.
    saveTimeoutRef.current = setTimeout(() => performSave(false), 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [pages, docId, docName, performSave, isDataLoaded, isPdfExporting, isDev]);

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

  // 신규 문서 생성 전에는 저장 상태를 UI에 노출하지 않는다.
  const effectiveSaveState = docId ? saveState : null;

  return { saveState: effectiveSaveState, manualSave, retrySave };
};
