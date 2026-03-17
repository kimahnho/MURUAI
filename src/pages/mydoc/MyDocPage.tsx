/**
 * 내 학습자료 페이지 — 좌측 사이드바 필터 + 우측 카드 그리드.
 * 아동/그룹별 필터링, 이름 검색, 복제/삭제를 지원한다.
 * 페이지네이션(20개)으로 canvas_data 포함 조회한다.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Sentry from "@sentry/react";
import {
  ChevronDown,
  ChevronLeft,
  Copy,
  FileText,
  FolderOpen,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { mp } from "@/shared/utils/mixpanel";
import { useAuthStore } from "@/shared/store/useAuthStore";
import ConfirmDialog from "@/shared/ui/ConfirmDialog";
import Spinner from "@/shared/ui/Spinner";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";

// ─── 타입 ───

type DocMeta = {
  id: string;
  name: string | null;
  created_at: string | null;
  canvas_data?: unknown | null;
};

type TargetRow = {
  user_made_id: string | null;
  child_id: string | null;
  group_id: string | null;
  students_n?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null;
  groups_n?:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null;
};

type DocTarget = {
  type: "child" | "group";
  id: string;
  name: string;
};

type DocItem = DocMeta & {
  targets: DocTarget[];
  canvasData: CanvasDocument | null;
};

type SimpleTarget = { id: string; name: string };

// ─── 상수 ───

const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;
const PREVIEW_SCALE = 0.18;
const PAGE_SIZE = 20;

// ─── 유틸 ───

const formatDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR");
};

const parseCanvasData = (value: unknown): CanvasDocument | null => {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as CanvasDocument;
      return Array.isArray(parsed.pages) ? parsed : null;
    } catch (error) {
      Sentry.captureException(error);
      return null;
    }
  }
  if (typeof value === "object") {
    const data = value as CanvasDocument;
    return Array.isArray(data.pages) ? data : null;
  }
  return null;
};

// ─── 사이드바 필터 항목 ───

interface FilterItemProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}

const FilterItem = ({ label, count, isActive, onClick, icon }: FilterItemProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition cursor-pointer ${
      isActive
        ? "bg-primary-50 text-primary border-l-2 border-primary"
        : "text-black-70 hover:bg-black-5"
    }`}
  >
    {icon && <span className="shrink-0">{icon}</span>}
    <span className="flex-1 min-w-0 truncate text-14-medium">{label}</span>
    <span className={`shrink-0 text-12-regular ${isActive ? "text-primary" : "text-black-50"}`}>
      {count}
    </span>
  </button>
);

// ─── 스켈레톤 카드 ───

const SkeletonCard = () => (
  <div className="flex flex-col gap-3 rounded-2xl border border-black-20 bg-white-100 p-3 shadow-sm">
    <div className="aspect-3/4 w-full animate-pulse rounded-xl bg-black-10" />
    <div className="flex flex-col gap-1">
      <div className="h-5 w-3/4 animate-pulse rounded bg-black-10" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-black-10" />
    </div>
  </div>
);

// ─── 메인 컴포넌트 ───

const MyDocPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [students, setStudents] = useState<SimpleTarget[]>([]);
  const [groups, setGroups] = useState<SimpleTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<DocTarget | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDuplicateDoc, setPendingDuplicateDoc] = useState<DocItem | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState<string | null>(null);
  const [isStudentsOpen, setIsStudentsOpen] = useState(true);
  const [isGroupsOpen, setIsGroupsOpen] = useState(true);
  const { isCreatingDoc, createAndOpenDocument } = useCreateDocumentNavigation();

  // 인증 체크
  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  // 1단계: 필터(학생/그룹) + 전체 개수 — 사이드바가 먼저 표시되도록
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      setIsFiltersLoading(false);
      return;
    }

    let cancelled = false;

    const loadFilters = async () => {
      setIsFiltersLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) {
        setIsFiltersLoading(false);
        return;
      }

      const [countResult, studentsResult, groupsResult] = await Promise.all([
        supabase
          .from("user_made_n")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("deleted_at", null),
        supabase
          .from("students_n")
          .select("id,name")
          .eq("user_id", user.id)
          .is("deleted_at", null),
        supabase
          .from("groups_n")
          .select("id,name")
          .eq("owner_id", user.id)
          .is("deleted_at", null),
      ]);

      if (cancelled) return;

      if (studentsResult.error) {
        Sentry.captureException(studentsResult.error);
        setErrorMessage("학습자 목록을 불러오지 못했어요.");
      }
      if (groupsResult.error) {
        Sentry.captureException(groupsResult.error);
        setErrorMessage("그룹 목록을 불러오지 못했어요.");
      }

      setStudents((studentsResult.data as SimpleTarget[] | null) ?? []);
      setGroups((groupsResult.data as SimpleTarget[] | null) ?? []);
      setTotalCount(countResult.count ?? 0);
      setIsFiltersLoading(false);
    };

    void loadFilters();
    return () => { cancelled = true; };
  }, [isAuthenticated, isAuthLoading]);

  // 2단계: 문서 목록 (canvas_data 제외, 페이지네이션)
  useEffect(() => {
    if (isAuthLoading) {
      setIsLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setDocs([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadDocs = async () => {
      setIsLoading(true);
      setErrorMessage(null);

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
        .limit(PAGE_SIZE + 1);

      if (cancelled) return;

      if (error) {
        Sentry.captureException(error);
        setErrorMessage("학습자료를 불러오지 못했어요.");
        setDocs([]);
        setIsLoading(false);
        return;
      }

      const rawDocs = (data as DocMeta[] | null) ?? [];
      const hasMoreDocs = rawDocs.length > PAGE_SIZE;
      const pageDocs = hasMoreDocs ? rawDocs.slice(0, PAGE_SIZE) : rawDocs;
      setHasMore(hasMoreDocs);

      if (pageDocs.length === 0) {
        setDocs([]);
        setIsLoading(false);
        return;
      }

      // 타겟 조회: 문서 ID로 필터링
      const docIds = pageDocs.map((d) => d.id);
      const { data: targetData, error: targetError } = await supabase
        .from("user_made_targets_n")
        .select("user_made_id,child_id,group_id,students_n(id,name),groups_n(id,name)")
        .in("user_made_id", docIds)
        .is("deleted_at", null);

      if (cancelled) return;
      if (targetError) {
        Sentry.captureException(targetError);
        setErrorMessage("등록 대상을 불러오지 못했어요.");
      }

      const targetsByDoc = buildTargetMap(targetData as TargetRow[] | null);

      setDocs(
        pageDocs.map((doc) => ({
          ...doc,
          targets: targetsByDoc.get(doc.id) ?? [],
          canvasData: parseCanvasData(doc.canvas_data),
        })),
      );
      setIsLoading(false);
    };

    void loadDocs();
    return () => { cancelled = true; };
  }, [isAuthenticated, isAuthLoading]);

  // 더 불러오기
  const loadMore = async () => {
    if (isLoadingMore || !hasMore || docs.length === 0) return;
    setIsLoadingMore(true);

    const lastDoc = docs[docs.length - 1];
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setIsLoadingMore(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_made_n")
      .select("id,name,created_at,canvas_data")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .lt("created_at", lastDoc.created_at!)
      .limit(PAGE_SIZE + 1);

    if (error) {
      Sentry.captureException(error);
      setErrorMessage("학습자료를 더 불러오지 못했어요.");
      setIsLoadingMore(false);
      return;
    }

    const rawDocs = (data as DocMeta[] | null) ?? [];
    const hasMoreDocs = rawDocs.length > PAGE_SIZE;
    const pageDocs = hasMoreDocs ? rawDocs.slice(0, PAGE_SIZE) : rawDocs;
    setHasMore(hasMoreDocs);

    if (pageDocs.length > 0) {
      const docIds = pageDocs.map((d) => d.id);
      const { data: targetData } = await supabase
        .from("user_made_targets_n")
        .select("user_made_id,child_id,group_id,students_n(id,name),groups_n(id,name)")
        .in("user_made_id", docIds)
        .is("deleted_at", null);

      const targetsByDoc = buildTargetMap(targetData as TargetRow[] | null);

      setDocs((prev) => [
        ...prev,
        ...pageDocs.map((doc) => ({
          ...doc,
          targets: targetsByDoc.get(doc.id) ?? [],
          canvasData: parseCanvasData(doc.canvas_data),
        })),
      ]);
    }

    setIsLoadingMore(false);
  };

  // ─── 필터링 ───

  const filteredDocs = (() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return docs;
    return docs.filter((doc) => {
      const nameMatch = (doc.name || "").toLowerCase().includes(keyword);
      const targetMatch = doc.targets.some((t) => t.name.toLowerCase().includes(keyword));
      return nameMatch || targetMatch;
    });
  })();

  const visibleDocs = selectedTarget
    ? filteredDocs.filter((doc) =>
        doc.targets.some((t) => t.type === selectedTarget.type && t.id === selectedTarget.id),
      )
    : filteredDocs;

  const countDocsForTarget = (type: "child" | "group", id: string) =>
    filteredDocs.filter((doc) => doc.targets.some((t) => t.type === type && t.id === id)).length;

  // ─── 삭제/복제 핸들러 ───

  const handleConfirmDelete = async () => {
    if (!pendingDeleteDocId) return;
    const docId = pendingDeleteDocId;
    setPendingDeleteDocId(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("로그인이 필요해요.");
      return;
    }
    const now = new Date().toISOString();
    const { error: targetError } = await supabase
      .from("user_made_targets_n")
      .update({ deleted_at: now })
      .eq("user_made_id", docId);
    if (targetError) {
      Sentry.captureException(targetError);
      setErrorMessage("학습자료를 삭제하지 못했어요.");
      return;
    }
    const { error } = await supabase
      .from("user_made_n")
      .update({ deleted_at: now })
      .eq("id", docId)
      .eq("user_id", user.id);
    if (error) {
      Sentry.captureException(error);
      setErrorMessage("학습자료를 삭제하지 못했어요.");
      return;
    }
    mp.track("문서 삭제");
    setDocs((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleDuplicateDoc = async (doc: DocItem) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("로그인이 필요해요.");
      return false;
    }

    // 복제 시 원본 canvas_data를 조회
    const { data: srcData } = await supabase
      .from("user_made_n")
      .select("canvas_data")
      .eq("id", doc.id)
      .single();

    const baseName = doc.name?.trim() || "제목 없음";
    const nextName = `${baseName}(복제본)`;
    const { data, error } = await supabase
      .from("user_made_n")
      .insert({
        user_id: user.id,
        name: nextName,
        canvas_data: srcData?.canvas_data,
      })
      .select("id,name,created_at,canvas_data")
      .single();
    if (error || !data) {
      if (error) Sentry.captureException(error);
      setErrorMessage("학습자료를 복제하지 못했어요.");
      return false;
    }

    let nextTargets = doc.targets;
    if (doc.targets.length > 0) {
      const targetPayload = doc.targets.map((target) =>
        target.type === "child"
          ? { user_made_id: data.id, child_id: target.id }
          : { user_made_id: data.id, group_id: target.id },
      );
      const { error: targetError } = await supabase
        .from("user_made_targets_n")
        .insert(targetPayload);
      if (targetError) {
        Sentry.captureException(targetError);
        setErrorMessage("학습자료를 복제하지 못했어요.");
        nextTargets = [];
      }
    }

    mp.track("문서 복제");
    setDocs((prev) => [{ ...data, targets: nextTargets, canvasData: parseCanvasData(data.canvas_data) }, ...prev]);
    return true;
  };

  const handleConfirmDuplicate = async () => {
    if (!pendingDuplicateDoc || isDuplicating) return;
    setIsDuplicating(true);
    const success = await handleDuplicateDoc(pendingDuplicateDoc);
    setIsDuplicating(false);
    if (success) setPendingDuplicateDoc(null);
  };

  const hasFilters = students.length > 0 || groups.length > 0;
  const handleCreateDoc = () => {
    void createAndOpenDocument({
      onError: () => setErrorMessage("새 학습자료를 만들지 못했어요."),
    });
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* 헤더 */}
      <header className="flex w-full items-center justify-between px-4 md:px-10 pt-6 pb-4 border-b border-black-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-black-60 transition hover:bg-black-10 cursor-pointer"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-title-20-semibold text-black-100">내 학습자료</span>
        </div>

        <button
          type="button"
          onClick={handleCreateDoc}
          disabled={isCreatingDoc}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-14-semibold text-white-100 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">새 자료 만들기</span>
        </button>
      </header>

      {/* 본문: 사이드바 + 콘텐츠 */}
      <div className="flex flex-1 min-h-0">
        {/* 좌측 사이드바 — 항상 표시, 로딩 중에는 스켈레톤 */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-black-20 p-4 gap-1 overflow-y-auto">
          {isFiltersLoading ? (
            <>
              <div className="h-10 w-full animate-pulse rounded-lg bg-black-10" />
              <div className="mt-3 flex flex-col gap-1">
                <div className="h-6 w-16 animate-pulse rounded bg-black-10" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-black-10" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-black-10" />
              </div>
            </>
          ) : (
            <>
              <FilterItem
                label="전체"
                count={searchTerm.trim() ? filteredDocs.length : totalCount}
                isActive={selectedTarget === null}
                onClick={() => setSelectedTarget(null)}
                icon={<FolderOpen className="h-4 w-4" />}
              />

              {students.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setIsStudentsOpen(!isStudentsOpen)}
                    className="flex w-full items-center gap-1 px-3 py-1.5 text-12-semibold text-black-50 cursor-pointer"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${isStudentsOpen ? "" : "-rotate-90"}`}
                    />
                    아동
                  </button>
                  {isStudentsOpen &&
                    students.map((s) => (
                      <FilterItem
                        key={s.id}
                        label={s.name}
                        count={countDocsForTarget("child", s.id)}
                        isActive={selectedTarget?.type === "child" && selectedTarget.id === s.id}
                        onClick={() =>
                          setSelectedTarget((prev) =>
                            prev?.type === "child" && prev.id === s.id
                              ? null
                              : { type: "child", id: s.id, name: s.name },
                          )
                        }
                      />
                    ))}
                </div>
              )}

              {groups.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setIsGroupsOpen(!isGroupsOpen)}
                    className="flex w-full items-center gap-1 px-3 py-1.5 text-12-semibold text-black-50 cursor-pointer"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${isGroupsOpen ? "" : "-rotate-90"}`}
                    />
                    그룹
                  </button>
                  {isGroupsOpen &&
                    groups.map((g) => (
                      <FilterItem
                        key={g.id}
                        label={g.name}
                        count={countDocsForTarget("group", g.id)}
                        isActive={selectedTarget?.type === "group" && selectedTarget.id === g.id}
                        onClick={() =>
                          setSelectedTarget((prev) =>
                            prev?.type === "group" && prev.id === g.id
                              ? null
                              : { type: "group", id: g.id, name: g.name },
                          )
                        }
                      />
                    ))}
                </div>
              )}

              {!hasFilters && (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Users className="h-5 w-5 text-black-30" />
                  <span className="text-12-regular text-black-50">등록된 아동이 없습니다</span>
                </div>
              )}
            </>
          )}
        </aside>

        {/* 콘텐츠 영역 */}
        <main className="flex flex-1 flex-col min-w-0 overflow-y-auto">
          <div className="flex flex-col gap-6 px-4 md:px-8 py-6">
            {/* 모바일 필터 드롭다운 */}
            {hasFilters && (
              <div className="md:hidden">
                <select
                  value={selectedTarget ? `${selectedTarget.type}:${selectedTarget.id}` : ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setSelectedTarget(null);
                      return;
                    }
                    const [type, id] = val.split(":");
                    const list = type === "child" ? students : groups;
                    const item = list.find((x) => x.id === id);
                    if (item) {
                      setSelectedTarget({ type: type as "child" | "group", id, name: item.name });
                    }
                  }}
                  className="w-full rounded-xl border border-black-25 px-4 py-3 text-14-regular text-black-90 focus:border-primary focus:outline-none"
                >
                  <option value="">전체 ({totalCount})</option>
                  {students.length > 0 && (
                    <optgroup label="아동">
                      {students.map((s) => (
                        <option key={s.id} value={`child:${s.id}`}>
                          {s.name} ({countDocsForTarget("child", s.id)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {groups.length > 0 && (
                    <optgroup label="그룹">
                      {groups.map((g) => (
                        <option key={g.id} value={`group:${g.id}`}>
                          {g.name} ({countDocsForTarget("group", g.id)})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* 검색 바 */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black-40" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="학습자료 이름 또는 아동 이름으로 검색..."
                className="w-full rounded-xl border border-black-25 bg-white-100 py-3 pl-11 pr-4 text-14-regular text-black-90 placeholder:text-black-50 transition focus:border-primary focus:outline-none"
              />
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-14-regular text-error-700">
                {errorMessage}
              </div>
            )}

            {/* 섹션 타이틀 */}
            <div className="flex items-center gap-2">
              <span className="text-title-18-semibold md:text-title-20-semibold text-black-90">
                {selectedTarget ? `${selectedTarget.name}의 학습자료` : "전체 학습자료"}
              </span>
              <span className="text-14-regular text-black-50">
                ({selectedTarget || searchTerm.trim() ? visibleDocs.length : totalCount}개)
              </span>
            </div>

            {/* 그리드 */}
            {isLoading ? (
              <div className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : visibleDocs.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-black-20 bg-black-5 py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50">
                    {searchTerm.trim() ? (
                      <Search className="h-7 w-7 text-primary-300" />
                    ) : (
                      <FileText className="h-7 w-7 text-primary-300" />
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-title-16-semibold text-black-80">
                      {searchTerm.trim()
                        ? "검색 결과가 없습니다"
                        : selectedTarget
                          ? `${selectedTarget.name}의 학습자료가 없습니다`
                          : "등록된 학습자료가 없습니다"}
                    </span>
                    <span className="text-14-regular text-black-50">
                      {searchTerm.trim()
                        ? "다른 키워드로 검색해보세요."
                        : "새 학습자료를 만들어보세요."}
                    </span>
                  </div>
                  {!searchTerm.trim() && (
                    <button
                      type="button"
                      onClick={handleCreateDoc}
                      disabled={isCreatingDoc}
                      className="flex items-center gap-2 rounded-xl border border-primary px-5 py-2.5 text-14-semibold text-primary transition hover:bg-primary-50 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      학습자료 만들기
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
                  {visibleDocs.map((doc) => (
                    <div
                      key={doc.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/${doc.id}/edit`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/${doc.id}/edit`);
                        }
                      }}
                      className="group flex cursor-pointer flex-col gap-2 rounded-2xl border border-black-20 bg-white-100 p-3 shadow-sm transition hover:border-primary hover:shadow-md"
                    >
                      {/* 미리보기 + 액션 */}
                      <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border border-black-10 bg-black-5">
                        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDuplicateDoc(doc);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-black-20 bg-white-100 text-black-60 shadow-sm transition hover:border-primary-300 hover:text-primary"
                            aria-label="복제"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDeleteDocId(doc.id);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-black-20 bg-white-100 text-black-60 shadow-sm transition hover:border-red-200 hover:text-red-500"
                            aria-label="삭제"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {(() => {
                          const previewPage = doc.canvasData?.pages?.[0];
                          if (!previewPage) {
                            return (
                              <div className="flex h-full w-full items-center justify-center text-12-regular text-black-40">
                                미리보기 없음
                              </div>
                            );
                          }
                          const rawO = previewPage.orientation;
                          const o = rawO === "horizontal" || rawO === "vertical" ? rawO : "vertical";
                          const bW = o === "horizontal" ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
                          const bH = o === "horizontal" ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;
                          return (
                            <div
                              className="absolute left-1/2 top-1/2"
                              style={{ width: `${bW * PREVIEW_SCALE}px`, height: `${bH * PREVIEW_SCALE}px`, transform: "translate(-50%, -50%)" }}
                            >
                              <div style={{ width: `${bW}px`, height: `${bH}px`, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left", pointerEvents: "none" }}>
                                <DesignPaper
                                  pageId={`mydoc-${doc.id}`}
                                  orientation={o}
                                  elements={Array.isArray(previewPage.elements) ? previewPage.elements : []}
                                  selectedIds={[]}
                                  editingTextId={null}
                                  readOnly
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* 문서 정보 */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="truncate text-14-semibold text-black-90">
                          {doc.name || "제목 없음"}
                        </span>
                        <span className="text-12-regular text-black-50">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>

                      {/* 대상 태그 */}
                      {doc.targets.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {doc.targets.map((target) => (
                            <span
                              key={`${target.type}-${target.id}`}
                              className={`rounded-full px-2 py-0.5 text-12-regular ${
                                target.type === "child"
                                  ? "bg-primary-50 text-primary-700"
                                  : "bg-success-50 text-success-700"
                              }`}
                            >
                              {target.type === "child" ? (
                                <span className="inline-flex items-center gap-0.5">
                                  <Users className="h-3 w-3" />{target.name}
                                </span>
                              ) : (
                                target.name
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 더 보기 */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      onClick={() => { void loadMore(); }}
                      disabled={isLoadingMore}
                      className="flex items-center gap-2 rounded-xl border border-black-25 px-6 py-3 text-14-semibold text-black-70 transition hover:bg-black-5 disabled:opacity-60 cursor-pointer"
                    >
                      {isLoadingMore ? <Spinner size="sm" /> : null}
                      {isLoadingMore ? "불러오는 중..." : "더 보기"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* 삭제 확인 */}
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteDocId)}
        onClose={() => setPendingDeleteDocId(null)}
        onConfirm={() => { void handleConfirmDelete(); }}
        title="학습자료 삭제"
        description="삭제하면 되돌릴 수 없습니다. 삭제할까요?"
        confirmLabel="삭제하기"
        cancelLabel="취소"
        variant="danger"
      />

      {/* 복제 확인 */}
      <ConfirmDialog
        isOpen={Boolean(pendingDuplicateDoc)}
        onClose={() => { if (!isDuplicating) setPendingDuplicateDoc(null); }}
        onConfirm={() => { void handleConfirmDuplicate(); }}
        title="학습자료 복제"
        description="선택한 학습자료를 복제하시겠습니까?"
        confirmLabel={isDuplicating ? "복제 중..." : "복제하기"}
        cancelLabel="취소"
        isLoading={isDuplicating}
      />
    </div>
  );
};

// ─── 헬퍼 ───

const buildTargetMap = (targetRows: TargetRow[] | null) => {
  const targetsByDoc = new Map<string, DocTarget[]>();
  const addTarget = (docId: string, target: DocTarget) => {
    const list = targetsByDoc.get(docId) ?? [];
    if (!list.some((item) => item.type === target.type && item.id === target.id)) {
      list.push(target);
    }
    targetsByDoc.set(docId, list);
  };

  targetRows?.forEach((row) => {
    if (!row.user_made_id) return;
    if (row.child_id) {
      const childName =
        row.students_n && !Array.isArray(row.students_n)
          ? (row.students_n.name ?? "아동")
          : "아동";
      addTarget(row.user_made_id, { type: "child", id: row.child_id, name: childName });
    }
    if (row.group_id) {
      const groupName =
        row.groups_n && !Array.isArray(row.groups_n)
          ? (row.groups_n.name ?? "그룹")
          : "그룹";
      addTarget(row.user_made_id, { type: "group", id: row.group_id, name: groupName });
    }
  });

  return targetsByDoc;
};

export default MyDocPage;
