import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Copy,
  Folder,
  LayoutGrid,
  List,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/shared/supabase/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import BaseModal from "@/shared/ui/BaseModal";
import DesignPaper from "@/features/editor/ui/parts/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";

type UserMadeRow = {
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

type DocItem = UserMadeRow & {
  targets: DocTarget[];
  canvasData: CanvasDocument | null;
};

type SimpleTarget = {
  id: string;
  name: string;
};

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

const MyDocPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTargets, setIsLoadingTargets] = useState(true);
  const [students, setStudents] = useState<SimpleTarget[]>([]);
  const [groups, setGroups] = useState<SimpleTarget[]>([]);
  const [currentChildPage, setCurrentChildPage] = useState(0);
  const [currentGroupPage, setCurrentGroupPage] = useState(0);
  const [selectedTarget, setSelectedTarget] = useState<DocTarget | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDuplicateDoc, setPendingDuplicateDoc] =
    useState<DocItem | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

  useEffect(() => {
    const loadDocs = async () => {
      if (isAuthLoading) {
        setIsLoading(true);
        setIsLoadingTargets(true);
        return;
      }
      if (!isAuthenticated) {
        setDocs([]);
        setIsLoading(false);
        setIsLoadingTargets(false);
        return;
      }
      setIsLoading(true);
      setIsLoadingTargets(true);
      setErrorMessage(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setDocs([]);
        setIsLoading(false);
        setIsLoadingTargets(false);
        return;
      }
      const [docsResult, targetsResult, studentsResult, groupsResult] =
        await Promise.all([
          supabase
            .from("user_made_n")
            .select("id,name,created_at,canvas_data")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_made_targets_n")
            .select(
              "user_made_id,child_id,group_id,students_n(id,name),groups_n(id,name)",
            ),
          supabase.from("students_n").select("id,name").eq("user_id", user.id),
          supabase.from("groups_n").select("id,name").eq("owner_id", user.id),
        ]);

      if (studentsResult.error) {
        setErrorMessage("학습자 목록을 불러오지 못했어요.");
      }
      if (groupsResult.error) {
        setErrorMessage("그룹 목록을 불러오지 못했어요.");
      }

      setStudents((studentsResult.data as SimpleTarget[] | null) ?? []);
      setGroups((groupsResult.data as SimpleTarget[] | null) ?? []);
      setIsLoadingTargets(false);

      if (docsResult.error) {
        setErrorMessage("학습자료를 불러오지 못했어요.");
        setDocs([]);
        setIsLoading(false);
        return;
      }
      const nextDocs = (docsResult.data as UserMadeRow[] | null) ?? [];
      if (nextDocs.length === 0) {
        setDocs([]);
        setIsLoading(false);
        return;
      }

      const targetRows = targetsResult.data as TargetRow[] | null;
      const targetsError = targetsResult.error;

      if (targetsError) {
        setErrorMessage("등록 대상을 불러오지 못했어요.");
      }

      const targetsByDoc = new Map<string, DocTarget[]>();
      const addTarget = (docId: string, target: DocTarget) => {
        const list = targetsByDoc.get(docId) ?? [];
        if (
          !list.some(
            (item) => item.type === target.type && item.id === target.id,
          )
        ) {
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
          addTarget(row.user_made_id, {
            type: "child",
            id: row.child_id,
            name: childName,
          });
        }
        if (row.group_id) {
          const groupName =
            row.groups_n && !Array.isArray(row.groups_n)
              ? (row.groups_n.name ?? "그룹")
              : "그룹";
          addTarget(row.user_made_id, {
            type: "group",
            id: row.group_id,
            name: groupName,
          });
        }
      });

      setDocs(
        nextDocs.map((doc) => ({
          ...doc,
          targets: targetsByDoc.get(doc.id) ?? [],
          canvasData: parseCanvasData(doc.canvas_data),
        })),
      );
      setIsLoading(false);
    };

    loadDocs();
  }, [isAuthenticated, isAuthLoading]);

  const registeredChildren = students;
  const registeredGroups = groups;
  const itemsPerPage = 5;
  const totalChildPages = Math.ceil(registeredChildren.length / itemsPerPage);
  const totalGroupPages = Math.ceil(registeredGroups.length / itemsPerPage);
  const safeChildPage =
    totalChildPages === 0 ? 0 : Math.min(currentChildPage, totalChildPages - 1);
  const safeGroupPage =
    totalGroupPages === 0 ? 0 : Math.min(currentGroupPage, totalGroupPages - 1);
  const currentChildren = registeredChildren.slice(
    safeChildPage * itemsPerPage,
    (safeChildPage + 1) * itemsPerPage,
  );
  const currentGroups = registeredGroups.slice(
    safeGroupPage * itemsPerPage,
    (safeGroupPage + 1) * itemsPerPage,
  );

  const filteredDocs = (() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return docs;
    return docs.filter((doc) => {
      const nameMatch = (doc.name || "").toLowerCase().includes(keyword);
      const targetMatch = doc.targets.some((target) =>
        target.name.toLowerCase().includes(keyword),
      );
      return nameMatch || targetMatch;
    });
  })();

  const visibleDocs = selectedTarget
    ? filteredDocs.filter((doc) =>
        doc.targets.some(
          (target) =>
            target.type === selectedTarget.type &&
            target.id === selectedTarget.id,
        ),
      )
    : filteredDocs;

  const getInitial = (value: string) => value.trim().slice(0, 1) || "?";
  const handleDeleteDoc = async (docId: string) => {
    const confirmed = window.confirm("학습자료를 삭제할까요?");
    if (!confirmed) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage("로그인이 필요해요.");
      return;
    }
    const { error: targetError } = await supabase
      .from("user_made_targets_n")
      .delete()
      .eq("user_made_id", docId);
    if (targetError) {
      setErrorMessage("학습자료를 삭제하지 못했어요.");
      return;
    }
    const { error } = await supabase
      .from("user_made_n")
      .delete()
      .eq("id", docId);
    if (error) {
      setErrorMessage("학습자료를 삭제하지 못했어요.");
      return;
    }
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
    const baseName = doc.name?.trim() || "제목 없음";
    const nextName = `${baseName}(복제본)`;
    const payload = {
      user_id: user.id,
      name: nextName,
      canvas_data: doc.canvas_data ?? doc.canvasData,
    };
    const { data, error } = await supabase
      .from("user_made_n")
      .insert(payload)
      .select("id,name,created_at,canvas_data")
      .single();
    if (error || !data) {
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
        setErrorMessage("학습자료를 복제하지 못했어요.");
        nextTargets = [];
      }
    }

    setDocs((prev) => [
      {
        ...data,
        targets: nextTargets,
        canvasData: parseCanvasData(data.canvas_data),
      },
      ...prev,
    ]);
    return true;
  };
  const handleConfirmDuplicate = async () => {
    if (!pendingDuplicateDoc || isDuplicating) return;
    setIsDuplicating(true);
    const success = await handleDuplicateDoc(pendingDuplicateDoc);
    setIsDuplicating(false);
    if (success) {
      setPendingDuplicateDoc(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex w-full items-center justify-between px-10 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-black-60 transition hover:bg-black-10"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Folder className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-title-18-semibold text-black-100">
                내 보관함
              </span>
              <span className="text-12-regular text-black-50">
                바로 만들기 자료
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-40" />
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
              }}
              placeholder="내 보관함 검색"
              className="h-11 w-full rounded-xl border border-black-20 bg-black-5 pl-10 pr-4 text-14-regular text-black-90 placeholder:text-black-50 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/design")}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-14-semibold text-white-100 transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />새 자료 만들기
        </button>
      </div>

      <div className="flex w-full flex-1 flex-col gap-8 overflow-y-auto px-10 py-8">
        <section className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="text-title-16-semibold text-black-100">
              등록된 학습자
            </span>
          </div>
          {isLoadingTargets ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-10">
              <span className="text-14-regular text-black-50">
                학습자 목록을 불러오는 중입니다.
              </span>
            </div>
          ) : registeredChildren.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-10">
              <span className="text-14-regular text-black-50">
                등록된 학습자가 없습니다.
              </span>
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {currentChildren.map((target) => (
                <div
                  key={`child-${target.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedTarget((prev) =>
                      prev?.type === "child" && prev.id === target.id
                        ? null
                        : { type: "child", id: target.id, name: target.name },
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTarget((prev) =>
                        prev?.type === "child" && prev.id === target.id
                          ? null
                          : { type: "child", id: target.id, name: target.name },
                      );
                    }
                  }}
                  className={`flex h-36 flex-col items-center gap-3 rounded-2xl border bg-white-100 px-6 py-5 text-center shadow-sm transition ${
                    selectedTarget?.type === "child" &&
                    selectedTarget.id === target.id
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-black-10 hover:border-black-20"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-16-semibold text-white-100">
                    {getInitial(target.name)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-14-semibold text-black-90">
                      {target.name}
                    </span>
                    <span className="text-12-regular text-black-50">
                      개별 학습자
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex min-h-4 items-center justify-center gap-2">
            {totalChildPages > 1 &&
              Array.from({ length: totalChildPages }).map((_, index) => (
                <button
                  key={`child-page-${index}`}
                  onClick={() => {
                    setCurrentChildPage(index);
                  }}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === safeChildPage
                      ? "w-6 bg-primary"
                      : "bg-black-30 hover:bg-black-40"
                  }`}
                  aria-label={`${index + 1}페이지로 이동`}
                />
              ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-title-16-semibold text-black-100">
              등록된 그룹
            </span>
          </div>
          {isLoadingTargets ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-10">
              <span className="text-14-regular text-black-50">
                그룹 목록을 불러오는 중입니다.
              </span>
            </div>
          ) : registeredGroups.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-10">
              <span className="text-14-regular text-black-50">
                등록된 그룹이 없습니다.
              </span>
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {currentGroups.map((target) => (
                <div
                  key={`group-${target.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedTarget((prev) =>
                      prev?.type === "group" && prev.id === target.id
                        ? null
                        : { type: "group", id: target.id, name: target.name },
                    );
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedTarget((prev) =>
                        prev?.type === "group" && prev.id === target.id
                          ? null
                          : { type: "group", id: target.id, name: target.name },
                      );
                    }
                  }}
                  className={`flex h-36 flex-col items-center gap-3 rounded-2xl border bg-white-100 px-6 py-5 text-center shadow-sm transition ${
                    selectedTarget?.type === "group" &&
                    selectedTarget.id === target.id
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-black-10 hover:border-black-20"
                  }`}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-16-semibold text-white-100">
                    {getInitial(target.name)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-14-semibold text-black-90">
                      {target.name}
                    </span>
                    <span className="text-12-regular text-black-50">
                      그룹 수업
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex min-h-4 items-center justify-center gap-2">
            {totalGroupPages > 1 &&
              Array.from({ length: totalGroupPages }).map((_, index) => (
                <button
                  key={`group-page-${index}`}
                  onClick={() => {
                    setCurrentGroupPage(index);
                  }}
                  className={`h-2 w-2 rounded-full transition-all ${
                    index === safeGroupPage
                      ? "w-6 bg-primary"
                      : "bg-black-30 hover:bg-black-40"
                  }`}
                  aria-label={`${index + 1}페이지로 이동`}
                />
              ))}
          </div>
        </section>

        <div className="h-px w-full bg-black-10" />

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-title-16-semibold text-black-100">
                등록된 학습자료
              </span>
            </div>
            <div className="flex items-center gap-2 text-black-50">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-20 bg-white-100"
                aria-label="그리드 보기"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black-20 bg-white-100"
                aria-label="리스트 보기"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-14-regular text-red-600">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-14">
              <span className="text-14-regular text-black-50">
                학습자료를 불러오는 중입니다.
              </span>
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-14">
              <div className="flex flex-col items-center gap-3">
                <span className="text-14-regular text-black-50">
                  등록된 학습자료가 없습니다.
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/design")}
                  className="rounded-lg border border-primary px-4 py-2 text-14-semibold text-primary transition hover:bg-primary/5"
                >
                  학습자료 만들어보기
                </button>
              </div>
            </div>
          ) : (
            <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <button
                type="button"
                onClick={() => navigate("/design")}
                className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-black-30 bg-white-100 px-6 py-12 text-black-50 transition hover:border-primary hover:text-primary"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black-10">
                  <Plus className="h-5 w-5" />
                </div>
                <span className="text-14-semibold">새 자료 만들기</span>
              </button>
              {visibleDocs.map((doc) => {
                const previewPage = doc.canvasData?.pages?.[0];
                const pageWidthPx = 210 * 3.7795;
                const pageHeightPx = 297 * 3.7795;

                // orientation 값 검증
                const rawOrientation = previewPage?.orientation;
                const previewOrientation =
                  rawOrientation === "horizontal" ||
                  rawOrientation === "vertical"
                    ? rawOrientation
                    : "vertical";

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

                // elements 검증
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
                    className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-black-20 bg-white-100 p-3 text-left shadow-sm transition hover:border-primary hover:shadow-md"
                  >
                    <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border border-black-10 bg-black-5">
                      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPendingDuplicateDoc(doc);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-black-20 bg-white-100 text-black-60 shadow-sm transition hover:border-primary/40 hover:text-primary"
                          aria-label="학습자료 복제"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteDoc(doc.id);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-black-20 bg-white-100 text-black-60 shadow-sm transition hover:border-red-200 hover:text-red-500"
                          aria-label="학습자료 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
                              pageId={`mydoc-${doc.id}`}
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
                    <div className="flex flex-col gap-1">
                      <span className="text-14-semibold text-black-90">
                        {doc.name || "제목 없음"}
                      </span>
                      <span className="text-12-regular text-black-50">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {doc.targets.map((target) => (
                        <span
                          key={`${target.type}-${target.id}`}
                          className="rounded-full bg-black-10 px-2 py-1 text-12-regular text-black-70"
                        >
                          {target.type === "child" ? "아동" : "그룹"}:{" "}
                          {target.name}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
      <BaseModal
        isOpen={Boolean(pendingDuplicateDoc)}
        onClose={() => {
          if (!isDuplicating) {
            setPendingDuplicateDoc(null);
          }
        }}
        title="학습자료 복제"
      >
        <div className="flex flex-col gap-6">
          <p className="text-14-regular text-black-70">복제하시겠습니까?</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (!isDuplicating) {
                  setPendingDuplicateDoc(null);
                }
              }}
              className="flex-1 rounded-lg border border-black-30 px-4 py-3 text-title-14-semibold text-black-70 transition hover:bg-black-10"
              disabled={isDuplicating}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirmDuplicate}
              disabled={isDuplicating}
              className={`flex-1 rounded-lg px-4 py-3 text-title-14-semibold text-white-100 transition ${
                isDuplicating
                  ? "bg-black-40 cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90"
              }`}
            >
              {isDuplicating ? "복제 중..." : "복제하기"}
            </button>
          </div>
        </div>
      </BaseModal>
    </div>
  );
};

export default MyDocPage;
