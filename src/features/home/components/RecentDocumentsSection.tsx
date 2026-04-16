/**
 * 홈 화면에 최근 작업한 학습자료 5개를 카드 형태로 표시하는 섹션.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { captureSentryError } from "@/shared/utils/sentryUtils";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { mp } from "@/shared/utils/mixpanel";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";
import { decompressCanvasData } from "@/shared/utils/canvasDataCompression";

type RecentDoc = {
  id: string;
  name: string | null;
  created_at: string | null;
  canvas_data?: unknown | null;
  canvasData: CanvasDocument | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR");
};

const RecentDocumentsSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [docs, setDocs] = useState<RecentDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    const fetchRecentDocs = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setDocs([]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_made_n")
        .select("id,name,created_at,updated_at,canvas_data")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(6);

      if (cancelled) return;

      if (error) {
        console.error("최근 학습자료 조회 실패", error);
        captureSentryError(error, "최근 학습자료 조회");
        setDocs([]);
        setIsLoading(false);
        return;
      }

      const rows = (data ?? []) as {
        id: string;
        name: string | null;
        created_at: string | null;
        canvas_data?: unknown | null;
      }[];

      setDocs(
        rows.map((row) => ({
          ...row,
          canvasData: decompressCanvasData(row.canvas_data),
        })),
      );
      setIsLoading(false);
    };

    void fetchRecentDocs();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const pageWidthPx = 210 * 3.7795;
  const pageHeightPx = 297 * 3.7795;
  const previewScale = 0.15;

  return (
    <section className="flex w-full flex-col gap-4">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-title-18-semibold text-black-90">
          최근 학습자료
        </h2>
        <button
          type="button"
          onClick={() => navigate("/mydoc")}
          className="flex items-center gap-1 text-14-semibold text-black-50 hover:text-primary transition cursor-pointer"
        >
          전체보기
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* 카드 그리드 */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex w-40 shrink-0 flex-col gap-2 rounded-xl border border-black-15 bg-white p-2 md:w-44">
              <div className="aspect-3/4 w-full animate-pulse rounded-lg bg-black-10" />
              <div className="flex flex-col gap-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-black-10" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-black-10" />
              </div>
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-black-20 bg-black-5 py-10">
            <span className="text-14-regular text-black-40">아직 만든 자료가 없어요</span>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {docs.map((doc) => {
            const previewPage = doc.canvasData?.pages?.[0];
            const rawOrientation = previewPage?.orientation;
            const previewOrientation =
              rawOrientation === "horizontal" || rawOrientation === "vertical"
                ? rawOrientation
                : "vertical";

            const previewBaseWidth =
              previewOrientation === "horizontal" ? pageHeightPx : pageWidthPx;
            const previewBaseHeight =
              previewOrientation === "horizontal" ? pageWidthPx : pageHeightPx;
            const previewScaledWidth = previewBaseWidth * previewScale;
            const previewScaledHeight = previewBaseHeight * previewScale;
            const previewElements = Array.isArray(previewPage?.elements)
              ? previewPage.elements
              : [];

            return (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                onClick={() => { mp.track("최근 자료 클릭"); navigate(`/${doc.id}/edit`); }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    mp.track("최근 자료 클릭");
                    navigate(`/${doc.id}/edit`);
                  }
                }}
                className="flex w-40 shrink-0 cursor-pointer flex-col gap-2 rounded-xl border border-black-15 bg-white p-2 transition hover:border-primary-200 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] md:w-44"
              >
                {/* 미리보기 */}
                <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border border-black-10 bg-black-5">
                  {previewPage ? (
                    <div
                      className="absolute left-1/2 top-1/2"
                      style={{
                        width: `${previewScaledWidth}px`,
                        height: `${previewScaledHeight}px`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div
                        style={{
                          width: `${previewBaseWidth}px`,
                          height: `${previewBaseHeight}px`,
                          transform: `scale(${previewScale})`,
                          transformOrigin: "top left",
                          pointerEvents: "none",
                        }}
                      >
                        <DesignPaper
                          pageId={`home-${doc.id}`}
                          orientation={previewOrientation}
                          elements={previewElements}
                          selectedIds={[]}
                          editingTextId={null}
                          background={previewPage?.background}
                          readOnly
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-12-regular text-black-40">
                      미리보기 없음
                    </div>
                  )}
                </div>

                {/* 문서 정보 */}
                <div className="flex flex-col gap-1">
                  <span className="text-14-semibold text-black-90 truncate">
                    {doc.name || "제목 없음"}
                  </span>
                  <span className="text-12-regular text-black-50">
                    {formatDate(doc.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default RecentDocumentsSection;
