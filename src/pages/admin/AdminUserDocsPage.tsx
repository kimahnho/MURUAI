import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Search, Shield } from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";
import { EXCLUDED_USER_IDS } from "@/features/admin/constants/excludedUsers";

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

const DOCS_PAGE_SIZE = 24;

const useIsVisible = (ref: RefObject<HTMLElement | null>) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return isVisible;
};

const DocCard = ({
  doc,
  previewPage,
  previewBaseWidth,
  previewBaseHeight,
  previewScale,
  previewOrientation,
  onOpen,
}: {
  doc: DocItem;
  previewPage: CanvasDocument["pages"][number] | null;
  previewBaseWidth: number;
  previewBaseHeight: number;
  previewScale: number;
  previewOrientation: "vertical" | "horizontal";
  onOpen: () => void;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(cardRef);

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      className="group flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 text-left transition hover:border-primary-200 hover:shadow-sm"
    >
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg bg-slate-50">
        {isVisible && previewPage ? (
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${previewBaseWidth * previewScale}px`,
              height: `${previewBaseHeight * previewScale}px`,
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
                background={previewPage.background}
                readOnly
              />
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-12-regular text-black-70">
            미리보기 없음
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 px-1 pb-1">
        <span className="truncate text-13-bold text-black-90">{doc.name || "제목 없음"}</span>
        <div className="flex items-center gap-2">
          <span className="text-12-regular text-black-70">{formatDate(doc.created_at)}</span>
          {doc.targets.length > 0 && (
            <div className="flex items-center gap-1">
              {doc.targets.slice(0, 2).map((target) => (
                <span
                  key={`${target.type}-${target.id}`}
                  className={`rounded-md px-1.5 py-0.5 text-11-regular ${
                    target.type === "child" ? "bg-primary-50 text-primary" : "bg-success-50 text-success-700"
                  }`}
                >
                  {target.name}
                </span>
              ))}
              {doc.targets.length > 2 && (
                <span className="text-11-regular text-black-70">+{doc.targets.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const activeUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      setIsUserListLoading(true);
      setErrorMessage(null);

      const [docsResult, usersResult] = await Promise.all([
        supabase
          .from("user_made_n")
          .select("user_id,created_at")
          .is("deleted_at", null),
        supabase.rpc("admin_list_users"),
      ]);

      if (docsResult.error) {
        setErrorMessage("유저 목록을 불러오지 못했어요.");
        setUserEntries([]);
        setIsUserListLoading(false);
        return;
      }

      // userId → 이름 매핑
      const nameMap = new Map<string, string>();
      if (!usersResult.error && Array.isArray(usersResult.data)) {
        for (const u of usersResult.data as Array<{ id: string; display_name: string; email: string }>) {
          nameMap.set(u.id, u.display_name || u.email || "");
        }
      }

      // user_id별 문서 수 + 최근 생성일 집계
      const userMap = new Map<string, { total: number; latestCreatedAt: string | null }>();
      for (const row of (docsResult.data ?? []) as Array<{ user_id: string; created_at: string | null }>) {
        if (!row.user_id || EXCLUDED_USER_IDS.has(row.user_id)) continue;
        const entry = userMap.get(row.user_id) ?? { total: 0, latestCreatedAt: null };
        entry.total += 1;
        if (row.created_at && (!entry.latestCreatedAt || row.created_at > entry.latestCreatedAt)) {
          entry.latestCreatedAt = row.created_at;
        }
        userMap.set(row.user_id, entry);
      }

      const nextEntries = Array.from(userMap.entries())
        .map(([userId, stat]) => ({
          userId,
          userName: nameMap.get(userId) ?? null,
          total: stat.total,
          latestCreatedAt: stat.latestCreatedAt,
        }))
        .sort((a, b) => {
          const aTime = a.latestCreatedAt ? new Date(a.latestCreatedAt).getTime() : 0;
          const bTime = b.latestCreatedAt ? new Date(b.latestCreatedAt).getTime() : 0;
          return bTime - aTime;
        });

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
      const { data, error } = await supabase
        .from("user_made_n")
        .select("id,user_id,name,created_at,canvas_data")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(offset, offset + DOCS_PAGE_SIZE - 1);

      if (activeUserIdRef.current !== userId) return;
      if (error) {
        setErrorMessage("학습자료 목록을 불러오지 못했어요.");
        setIsDocsLoading(false);
        return;
      }
      const rows = (data as UserDocRow[] | null) ?? [];

      // targets 조회 (문서 ID 기반)
      const docIds = rows.map((r) => r.id);
      let targetsMap = new Map<string, DocTarget[]>();
      if (docIds.length > 0) {
        const { data: targetsData } = await supabase
          .from("user_made_targets_n")
          .select("user_made_id,child_id,group_id,students_n(id,name),groups_n(id,name)")
          .in("user_made_id", docIds)
          .is("deleted_at", null);
        if (targetsData) {
          for (const t of targetsData as unknown as Array<{
            user_made_id: string;
            child_id: string | null;
            group_id: string | null;
            students_n: { id: string; name: string } | { id: string; name: string }[] | null;
            groups_n: { id: string; name: string } | { id: string; name: string }[] | null;
          }>) {
            const targets = targetsMap.get(t.user_made_id) ?? [];
            const student = Array.isArray(t.students_n) ? t.students_n[0] : t.students_n;
            const group = Array.isArray(t.groups_n) ? t.groups_n[0] : t.groups_n;
            if (t.child_id && student) {
              targets.push({ type: "child", id: t.child_id, name: student.name });
            }
            if (t.group_id && group) {
              targets.push({ type: "group", id: t.group_id, name: group.name });
            }
            targetsMap.set(t.user_made_id, targets);
          }
        }
      }

      const nextDocs = rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        created_at: row.created_at,
        canvas_data: row.canvas_data ?? null,
        targets: targetsMap.get(row.id) ?? [],
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
    if (paramUserId && userEntryMap.has(paramUserId)) return paramUserId;
    return userEntries[0]?.userId ?? null;
  }, [paramUserId, userEntries, userEntryMap]);

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
                        setSearchParams({ userId: entry.userId }, { replace: true });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSearchParams({ userId: entry.userId }, { replace: true });
                        }
                      }}
                      className={`flex flex-col gap-2 rounded-xl border px-3 py-3 text-left transition ${
                        activeUserId === entry.userId
                          ? "border-primary-200 bg-primary-50 shadow-sm"
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
              <div className="grid w-full grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                  return (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      previewPage={previewPage ?? null}
                      previewBaseWidth={previewBaseWidth}
                      previewBaseHeight={previewBaseHeight}
                      previewScale={previewScale}
                      previewOrientation={previewOrientation}
                      onOpen={() => navigate(`/${doc.id}/edit`)}
                    />
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
