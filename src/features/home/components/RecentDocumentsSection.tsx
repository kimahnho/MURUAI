/**
 * 홈 화면에 최근 작업한 학습자료 5개를 카드 형태로 표시하는 섹션.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";

type RecentDoc = {
  id: string;
  name: string | null;
  created_at: string | null;
  canvas_data?: unknown | null;
  canvasData: CanvasDocument | null;
};

const parseCanvasData = (value: unknown): CanvasDocument | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as CanvasDocument;
      return Array.isArray(parsed.pages) ? parsed : null;
    } catch {
      return null;
    }
  }
  if (typeof value === "object") {
    const data = value as CanvasDocument;
    return Array.isArray(data.pages) ? data : null;
  }
  return null;
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
    if (!isAuthenticated) {
      setDocs([]);
      setIsLoading(false);
      return;
    }

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
        .select("id,name,created_at,canvas_data")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (cancelled) return;

      if (error) {
        console.error("최근 학습자료 조회 실패", error);
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
          canvasData: parseCanvasData(row.canvas_data),
        })),
      );
      setIsLoading(false);
    };

    void fetchRecentDocs();

    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const pageWidthPx = 210 * 3.7795;
  const pageHeightPx = 297 * 3.7795;
  const previewScale = 0.18;

  return (
    <section className="flex flex-col w-full px-4 md:px-10 gap-6">
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between">
        <span className="text-title-18-semibold md:text-title-22-semibold text-black-90">
          최근 작업한 학습자료
        </span>
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
        <div className="grid w-full grid-cols-2 md:grid-cols-5 gap-3 md:gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`${i >= 2 ? "hidden md:flex" : "flex"} flex-col gap-3 rounded-2xl border border-black-20 bg-white-100 p-3 shadow-sm`}
            >
              <div className="aspect-3/4 w-full animate-pulse rounded-xl bg-black-10" />
              <div className="flex flex-col gap-1">
                <div className="h-5 w-3/4 animate-pulse rounded bg-black-10" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-black-10" />
              </div>
            </div>
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="grid w-full grid-cols-2 md:grid-cols-5 gap-3 md:gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`${i >= 2 ? "hidden md:flex" : "flex"} flex-col gap-3 rounded-2xl border border-dashed border-black-20 bg-black-5 p-3`}
            >
              <div className="aspect-3/4 w-full rounded-xl bg-black-10" />
              <div className="flex flex-col gap-1">
                <div className="h-5 w-3/4 rounded bg-black-10" />
                <div className="h-4 w-1/2 rounded bg-black-10" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid w-full grid-cols-2 md:grid-cols-5 gap-3 md:gap-5">
          {docs.map((doc, docIndex) => {
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
                onClick={() => navigate(`/${doc.id}/edit`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/${doc.id}/edit`);
                  }
                }}
                className={`${docIndex >= 2 ? "hidden md:flex" : "flex"} cursor-pointer flex-col gap-3 rounded-2xl border border-black-20 bg-white-100 p-3 shadow-sm transition hover:border-primary hover:shadow-md`}
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
