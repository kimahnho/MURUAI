/**
 * 문서 초기 로드와 로딩/오류 상태를 관리해 에디터 진입 데이터를 준비하는 훅.
 */
import { useCallback, useEffect, useState } from "react";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { mp } from "@/shared/utils/mixpanel";
import { useOrientationStore } from "../store/orientationStore";
import { useToastStore } from "../store/toastStore";
import type { CanvasDocument } from "../model/pageTypes";
import { useEmotionSceneStore } from "../store/emotionSceneStore";
import { useAiGenerationModeStore } from "../store/aiGenerationModeStore";
import { useSideBarStore } from "../store/sideBarStore";
import { migrateLogoFill } from "../utils/logoElement";
import { migrateCloudinaryToWebp } from "../utils/migrateCloudinaryUrls";

type DocumentLoaderParams = {
  docId?: string;
};

export const useDocumentLoader = ({ docId }: DocumentLoaderParams) => {
  const showToast = useToastStore((state) => state.showToast);
  const setOrientation = useOrientationStore((state) => state.setOrientation);

  const [docName, setDocName] = useState("");
  const [loadedDocument, setLoadedDocument] = useState<CanvasDocument | null>(
    null,
  );
  const [loadedDocumentId, setLoadedDocumentId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // 문서 저장 직후에는 동일 id 재요청을 막고, 필요 시 수동 clear 후 재로드를 허용한다.
  const clearLoadedDocument = useCallback(() => {
    setLoadedDocument(null);
  }, []);

  // 문서 ID가 있으면 기존 문서를 불러오고, 없으면 신규 문서 상태로 유지한다.
  useEffect(() => {
    if (!docId) {
      setLoadedDocument(null);
      setLoadedDocumentId(null);
      return;
    }
    if (docId === loadedDocumentId) return;
    let isMounted = true;
    const loadUserMade = async () => {
      const user = useAuthStore.getState().user;
      if (!user) {
        showToast("로그인이 필요해요.");
        return;
      }
      const { data: row, error } = await supabase
        .from("user_made_n")
        .select("id,name,canvas_data,user_id")
        .eq("id", docId)
        .single();
      if (!isMounted) return;
      if (error || !row) {
        if (error) captureSentryError(error, "문서 로드");
        showToast("학습자료를 불러오지 못했어요.");
        return;
      }

      // 소유권 체크: 본인 문서가 아닌 경우
      const isOwner = row.user_id === user.id;
      const role = useAuthStore.getState().role;
      if (!isOwner) {
        if (role === "admin") {
          // admin은 조회만 허용 (readOnly)
          setIsReadOnly(true);
        } else {
          // 일반 유저는 접근 차단
          showToast("접근 권한이 없어요.");
          return;
        }
      } else {
        setIsReadOnly(false);
      }

      let canvasData: unknown = row.canvas_data;
      if (typeof canvasData === "string") {
        try {
          canvasData = JSON.parse(canvasData);
        } catch {
          showToast("학습자료 형식이 올바르지 않아요.");
          return;
        }
      }
      // canvas_data는 DB에 문자열/JSON 혼재 가능성이 있어 런타임 검증 후에만 상태로 반영한다.
      if (!canvasData || !Array.isArray((canvasData as CanvasDocument).pages)) {
        showToast("학습자료 형식이 올바르지 않아요.");
        return;
      }
      setDocName(row.name ?? "");

      // 기존 문서의 로고 fill을 현재 고정 URL로 교체 (빌드 해시 변경 대응)
      migrateLogoFill((canvasData as CanvasDocument).pages);
      // 비WebP Cloudinary URL을 WebP 버전으로 자동 교체
      migrateCloudinaryToWebp((canvasData as CanvasDocument).pages);

      setLoadedDocument(canvasData as CanvasDocument);
      setLoadedDocumentId(row.id);

      // 감정추론 배너 상태 복원
      const doc = canvasData as CanvasDocument;
      if (doc.emotionSceneMeta?.length) {
        const store = useEmotionSceneStore.getState();
        for (const meta of doc.emotionSceneMeta) {
          const exists = store.pendingGenerations.some(
            (pg) => pg.storyPageIds[0] === meta.storyPageIds[0],
          );
          if (!exists) {
            store.addPendingGeneration({
              stories: meta.stories,
              storyPageIds: meta.storyPageIds,
              bannerPhase: meta.bannerPhase === "generating" ? "ready" : meta.bannerPhase,
            });
          }
        }
      }
      // 포커스 모드 상태 복원 — 메타가 없으면 이전 문서의 상태를 초기화
      if (doc.focusedAiMode) {
        useAiGenerationModeStore.getState().restore(doc.focusedAiMode);
        useSideBarStore.getState().setSelectedMenu("ai-story-edit");
      } else {
        useAiGenerationModeStore.getState().exitFocusedMode();
        useSideBarStore.getState().setSelectedMenu("template");
      }

      mp.track("문서 열기", { page_count: (canvasData as CanvasDocument).pages?.length ?? 0 });
      const initialOrientation = (canvasData as CanvasDocument).pages[0]
        ?.orientation;
      if (
        initialOrientation === "horizontal" ||
        initialOrientation === "vertical"
      ) {
        setOrientation(initialOrientation);
      }
    };
    loadUserMade();
    return () => {
      isMounted = false;
    };
  }, [loadedDocumentId, docId, showToast, setOrientation]);

  return {
    docName,
    setDocName,
    loadedDocument,
    loadedDocumentId,
    clearLoadedDocument,
    isReadOnly,
  };
};
