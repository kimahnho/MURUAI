/**
 * 학습지 상세 확인 모달 — 채팅에서 보이지 않는 description을 확인 후 캔버스로 생성.
 * 바깥 클릭 → 모달 닫기 → 채팅에서 수정 가능.
 */
import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useTherapyStore } from "../store/useTherapyStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { buildTherapyWorksheetPages } from "../utils/buildTherapyWorksheetPages";
import { generateWorksheetImages } from "../ai/generateWorksheetImages";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { mp } from "@/shared/utils/mixpanel";
import useToastStore from "@/shared/store/useToastStore";
import { WORKSHEET_TYPE_LABELS, DIFFICULTY_LABELS } from "../model/therapyConstants";

interface WorkspacePageProps {
  onClose: () => void;
}

const WorkspacePage = ({ onClose }: WorkspacePageProps) => {
  const { createAndOpenDocument } = useCreateDocumentNavigation();
  const user = useAuthStore((s) => s.user);

  const sessionSet = useTherapyStore((s) => s.sessionSet);
  const workspaceSheets = useTherapyStore((s) => s.workspaceSheets);
  const isRecording = useTherapyStore((s) => s.isRecording);
  const stopRecording = useTherapyStore((s) => s.stopRecording);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  if (!sessionSet) return null;

  const handleOpenInCanvas = async () => {
    try {
      if (isRecording) stopRecording();

      const sheets = workspaceSheets.map((s) => s.suggestion);
      let imageUrls: string[] | undefined;

      // 이미지 생성 시도
      if (user?.id) {
        setIsGenerating(true);
        setProgress({ current: 0, total: sheets.length });
        try {
          imageUrls = await generateWorksheetImages(
            sheets,
            sessionSet.domain,
            user.id,
            (current, total) => setProgress({ current, total }),
          );
        } catch (err) {
          console.warn("이미지 생성 실패, 텍스트 fallback 사용", err);
          useToastStore.getState().showToast("이미지 생성에 실패했어요. 텍스트로 대체합니다.");
        }
        setIsGenerating(false);
      }

      mp.track("치료 학습지 캔버스 열기", { domain: sessionSet.domain, sheet_count: workspaceSheets.length, has_images: !!imageUrls });
      const pages = buildTherapyWorksheetPages(workspaceSheets, sessionSet.domain, imageUrls);
      await createAndOpenDocument({ pages });
    } catch (err) {
      setIsGenerating(false);
      captureSentryError(err, "WorkspacePage 캔버스 열기");
    }
  };

  return (
    // backdrop — 바깥 클릭으로 모달 닫기
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
    >
      {/* 모달 본체 */}
      <div
        className="flex flex-col max-w-2xl w-full max-h-[80vh] mx-4 rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between shrink-0 px-6 py-4 border-b border-black-15">
          <div className="flex flex-col gap-0.5">
            <span className="text-title-18-semibold text-black-90">
              학습지 세트 확인
            </span>
            <span className="text-13-regular text-black-50">
              {workspaceSheets.length}장 · 수정이 필요하면 모달을 닫고 채팅에서 요청하세요
            </span>
          </div>
        </div>

        {/* 카드 리스트 — 스크롤 가능 */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="flex flex-col gap-3">
            {workspaceSheets.map((sheet) => (
              <div
                key={sheet.index}
                className="flex gap-3 rounded-xl border border-black-15 p-4"
              >
                {/* 번호 */}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-13-bold text-primary">
                  {sheet.index + 1}
                </span>

                <div className="flex flex-col gap-2 min-w-0">
                  {/* 제목 */}
                  <div>
                    <span className="text-12-semibold text-black-40">제목</span>
                    <p className="text-14-semibold text-black-80">{sheet.suggestion.title}</p>
                  </div>

                  {/* 활동 */}
                  <div>
                    <span className="text-12-semibold text-black-40">활동</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      <span className="rounded-md bg-black-5 px-1.5 py-0.5 text-12-regular text-black-50">
                        {WORKSHEET_TYPE_LABELS[sheet.suggestion.worksheetType] ?? sheet.suggestion.worksheetType}
                      </span>
                      <span className="rounded-md bg-black-5 px-1.5 py-0.5 text-12-regular text-black-50">
                        {DIFFICULTY_LABELS[sheet.suggestion.difficulty] ?? sheet.suggestion.difficulty}
                      </span>
                      <span className="rounded-md bg-black-5 px-1.5 py-0.5 text-12-regular text-black-50">
                        {sheet.suggestion.itemCount}개
                      </span>
                    </div>
                  </div>

                  {/* 설명 */}
                  {sheet.suggestion.description && (
                    <div>
                      <span className="text-12-semibold text-black-40">설명</span>
                      <p className="text-13-regular text-black-60 leading-relaxed mt-0.5">
                        {sheet.suggestion.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="shrink-0 px-6 py-4 border-t border-black-15">
          <button
            type="button"
            onClick={handleOpenInCanvas}
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-14-semibold text-white-100 hover:bg-primary-700 transition cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                이미지 생성 중 ({progress.current}/{progress.total})
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                캔버스에서 생성하기
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspacePage;
