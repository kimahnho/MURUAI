import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Search, Shield } from "lucide-react";
import { supabase } from "@/shared/supabase/supabase";
import DesignPaper from "@/features/editor/ui/parts/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";
import { EXCLUDED_USER_IDS } from "@/features/admin/constants/excludedUsers";

type UserOverviewRow = {
  user_id: string;
  user_name: string | null;
  total: number | null;
  latest_created_at: string | null;
};

type UserEntry = {
  userId: string;
  userName: string | null;
  total: number;
  latestCreatedAt: string | null;
};

type UserDocRow = {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string | null;
  canvas_data?: unknown | null;
  targets?: unknown | null;
};

type DocTarget = {
  type: "child" | "group";
  id: string;
  name: string;
};

type DocItem = {
  id: string;
  user_id: string;
  name: string | null;
  created_at: string | null;
  canvas_data?: unknown | null;
  targets: DocTarget[];
  canvasData: CanvasDocument | null;
};

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR");
};

const getInitial = (value: string) => value.trim().slice(0, 1) || "?";

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

const parseTargets = (value: unknown): DocTarget[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw) => {
      const entry = raw as Partial<DocTarget>;
      const type: DocTarget["type"] =
        entry.type === "child" ? "child" : "group";
      const id = entry.id ? String(entry.id) : "";
      if (!id) return null;
      return {
        type,
        id,
        name: entry.name ? String(entry.name) : type === "child" ? "아동" : "그룹",
      } satisfies DocTarget;
    })
    .filter((entry): entry is DocTarget => Boolean(entry));
};

const DOCS_PAGE_SIZE = 24;

const AdminUserDocsPage = () => {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  const [isUserListLoading, setIsUserListLoading] = useState(true);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docsOffset, setDocsOffset] = useState(0);
  const [hasMoreDocs, setHasMoreDocs] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [manualSelectedUserId, setManualSelectedUserId] = useState<
    string | null
  >(null);
  const [searchParams] = useSearchParams();
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setIsUserListLoading(true);
      setErrorMessage(null);
      const { data, error } = await supabase.rpc("admin_user_docs_overview");
      if (error) {
        setErrorMessage("유저 목록을 불러오지 못했어요.");
        setUserEntries([]);
        setIsUserListLoading(false);
        return;
      }
      const rows = (data as UserOverviewRow[] | null) ?? [];
      const nextEntries = rows
        .filter((row) => row.user_id && !EXCLUDED_USER_IDS.has(row.user_id))
        .map((row) => ({
          userId: row.user_id,
          userName: row.user_name ?? null,
          total: row.total ?? 0,
          latestCreatedAt: row.latest_created_at ?? null,
        }));
      setUserEntries(nextEntries);
      setIsUserListLoading(false);
    };

    loadUsers();
  }, []);

  const paramUserId = searchParams.get("userId");

  const loadDocsPage = useCallback(
    async (userId: string, offset: number, append: boolean) => {
      if (!append) {
        setDocs([]);
        setDocsOffset(0);
        setHasMoreDocs(false);
      }
      setIsDocsLoading(true);
      const { data, error } = await supabase.rpc("admin_user_docs_for_user", {
        target_user_id: userId,
        limit_count: DOCS_PAGE_SIZE,
        offset_count: offset,
      });
      if (activeUserIdRef.current !== userId) return;
      if (error) {
        setErrorMessage("학습자료 목록을 불러오지 못했어요.");
        setIsDocsLoading(false);
        return;
      }
      const rows = (data as UserDocRow[] | null) ?? [];
      const nextDocs = rows
        .filter((row) => row.user_id && !EXCLUDED_USER_IDS.has(row.user_id))
        .map((row) => ({
          id: row.id,
          user_id: row.user_id,
          name: row.name,
          created_at: row.created_at,
          canvas_data: row.canvas_data ?? null,
          targets: parseTargets(row.targets),
          canvasData: parseCanvasData(row.canvas_data),
        }));

      setDocs((prev) => (append ? [...prev, ...nextDocs] : nextDocs));
      setIsDocsLoading(false);
      setErrorMessage(null);
      setHasMoreDocs(nextDocs.length === DOCS_PAGE_SIZE);
      setDocsOffset(offset);
    },
    [],
  );

  const keyword = searchTerm.trim().toLowerCase();
  const userEntryMap = useMemo(() => {
    const map = new Map<string, UserEntry>();
    userEntries.forEach((entry) => {
      map.set(entry.userId, entry);
    });
    return map;
  }, [userEntries]);

  const filteredUserEntries = useMemo(() => {
    if (!keyword) return userEntries;
    return userEntries.filter((entry) => {
      const nameMatch = (entry.userName || "")
        .toLowerCase()
        .includes(keyword);
      const idMatch = entry.userId.toLowerCase().includes(keyword);
      return nameMatch || idMatch;
    });
  }, [keyword, userEntries]);

  const activeUserId = useMemo(() => {
    if (userEntries.length === 0) return null;
    if (paramUserId && userEntryMap.has(paramUserId)) {
      return paramUserId;
    }
    if (manualSelectedUserId && userEntryMap.has(manualSelectedUserId)) {
      return manualSelectedUserId;
    }
    return userEntries[0]?.userId ?? null;
  }, [manualSelectedUserId, paramUserId, userEntries, userEntryMap]);

  useEffect(() => {
    activeUserIdRef.current = activeUserId;
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) return;
    const handle = window.setTimeout(() => {
      void loadDocsPage(activeUserId, 0, false);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [activeUserId, loadDocsPage]);

  const selectedEntry = activeUserId ? userEntryMap.get(activeUserId) : null;
  const selectedUserName = selectedEntry?.userName ?? null;
  const selectedUserLabel = selectedUserName || activeUserId;
  const selectedUserTotal = selectedEntry?.total ?? 0;

  const filteredDocs = useMemo(() => {
    if (!keyword) return docs;
    const userMatch =
      (activeUserId ?? "").toLowerCase().includes(keyword) ||
      (selectedUserName ?? "").toLowerCase().includes(keyword);
    return docs.filter((doc) => {
      const nameMatch = (doc.name || "").toLowerCase().includes(keyword);
      const targetMatch = doc.targets.some((target) =>
        target.name.toLowerCase().includes(keyword),
      );
      return userMatch || nameMatch || targetMatch;
    });
  }, [activeUserId, docs, keyword, selectedUserName]);

  const totalDocsCount = useMemo(
    () => userEntries.reduce((sum, entry) => sum + entry.total, 0),
    [userEntries],
  );
  const isDocsLoadingView = isDocsLoading && Boolean(activeUserId);
  const handleLoadMore = () => {
    if (!activeUserId || isDocsLoading || !hasMoreDocs) return;
    void loadDocsPage(activeUserId, docsOffset + DOCS_PAGE_SIZE, true);
  };
  const avatarPalette = [
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-violet-100 text-violet-700",
    "bg-red-100 text-red-700",
    "bg-indigo-100 text-indigo-700",
  ];

  return (
    <div className="flex h-full w-full flex-col bg-slate-50">
      <div className="flex w-full items-center justify-between px-10 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-title-18-semibold text-slate-900">
                관리자 보관함
              </span>
              <span className="text-12-regular text-slate-500">
                유저별 학습자료 확인
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
              placeholder="유저 이름/ID 또는 자료명 검색"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-14-regular text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-12-regular text-sky-700">
            유저 {filteredUserEntries.length}명
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-12-regular text-emerald-700">
            자료 {totalDocsCount}개
          </span>
        </div>
      </div>

      <div className="flex w-full flex-1 gap-6 overflow-hidden px-10 pb-10">
        <aside className="flex min-h-0 w-72 flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-14-semibold text-slate-800">유저 목록</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-12-regular text-slate-500">
              최근 생성순
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isUserListLoading ? (
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-10">
                <span className="text-14-regular text-slate-500">
                  유저 목록을 불러오는 중입니다.
                </span>
              </div>
            ) : filteredUserEntries.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-10">
                <span className="text-14-regular text-slate-500">
                  표시할 유저가 없습니다.
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredUserEntries.map((entry, index) => {
                  const avatarClass =
                    avatarPalette[index % avatarPalette.length] ??
                    "bg-slate-100 text-slate-700";
                  return (
                    <button
                      key={entry.userId}
                      type="button"
                      onClick={() => {
                        setManualSelectedUserId(entry.userId);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setManualSelectedUserId(entry.userId);
                        }
                      }}
                      className={`flex flex-col gap-2 rounded-xl border px-3 py-3 text-left transition ${
                        activeUserId === entry.userId
                          ? "border-indigo-200 bg-indigo-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-12-semibold ${avatarClass}`}
                        >
                          {getInitial(entry.userName || entry.userId)}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-12-semibold text-slate-900">
                            {entry.userName || entry.userId}
                          </span>
                          <span className="text-12-regular text-slate-500">
                            최근 생성: {formatDate(entry.latestCreatedAt)}
                          </span>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-12-regular text-slate-600">
                          {entry.total}개
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-title-16-semibold text-slate-900">
                {activeUserId ? selectedUserLabel : "유저를 선택해주세요"}
              </span>
              <span className="text-12-regular text-slate-500">
                {activeUserId
                  ? `총 ${selectedUserTotal}개 자료${keyword ? ` · 검색 ${filteredDocs.length}개` : ""}`
                  : "좌측 목록에서 유저를 선택하면 자료를 확인할 수 있어요."}
              </span>
            </div>
            {activeUserId && (
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-12-regular text-slate-600">
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-12-regular text-violet-700">
                  {selectedUserName ? "이름" : "유저 ID"}
                </span>
                <span className="text-slate-800">
                  {selectedUserName ? selectedUserName : activeUserId}
                </span>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-14-regular text-rose-600">
              {errorMessage}
            </div>
          )}

          {isDocsLoadingView ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-14">
              <span className="text-14-regular text-slate-500">
                학습자료를 불러오는 중입니다.
              </span>
            </div>
          ) : !activeUserId ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-14">
              <span className="text-14-regular text-slate-500">
                유저를 선택해주세요.
              </span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-14">
              <span className="text-14-regular text-slate-500">
                등록된 학습자료가 없습니다.
              </span>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <div className="grid w-full flex-1 grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredDocs.map((doc) => {
                  const previewPage = doc.canvasData?.pages?.[0];
                  const pageWidthPx = 210 * 3.7795;
                  const pageHeightPx = 297 * 3.7795;
                  const previewOrientation =
                    previewPage?.orientation ?? "vertical";
                  const previewBaseWidth =
                    previewOrientation === "horizontal"
                      ? pageHeightPx
                      : pageWidthPx;
                  const previewBaseHeight =
                    previewOrientation === "horizontal"
                      ? pageWidthPx
                      : pageHeightPx;
                  const previewScale = 0.18;
                  const previewScaledWidth = previewBaseWidth * previewScale;
                  const previewScaledHeight = previewBaseHeight * previewScale;
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
                      className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
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
                                pageId={`admin-${doc.id}`}
                                orientation={previewOrientation}
                                elements={previewPage.elements}
                                selectedIds={[]}
                                editingTextId={null}
                                readOnly
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-12-regular text-slate-400">
                            미리보기 없음
                          </div>
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-200/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-14-semibold text-slate-900">
                          {doc.name || "제목 없음"}
                        </span>
                        <span className="text-12-regular text-slate-500">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {doc.targets.length === 0 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-12-regular text-amber-700">
                            등록 대상 없음
                          </span>
                        ) : (
                          doc.targets.map((target) => (
                            <span
                              key={`${target.type}-${target.id}`}
                              className={`rounded-full px-2 py-1 text-12-regular ${
                                target.type === "child"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {target.type === "child" ? "아동" : "그룹"}:{" "}
                              {target.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMoreDocs && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isDocsLoading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-13-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDocsLoading ? "불러오는 중..." : "더 보기"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminUserDocsPage;
