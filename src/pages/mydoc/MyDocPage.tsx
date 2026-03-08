import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Copy, Folder, Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/shared/api/supabase";
import { useAuthStore } from "@/shared/store/useAuthStore";
import BaseModal from "@/shared/ui/BaseModal";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";

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

const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;
const PREVIEW_SCALE = 0.18;
const SKELETON_COUNT = 5;

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

// 필터 칩: 학습자/그룹별 문서 필터링
interface FilterChipProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const FilterChip = ({ label, isActive, onClick }: FilterChipProps) => (
  <button
    type="button"
    onClick={onClick}
    className={`shrink-0 rounded-full px-4 py-2 text-14-semibold transition cursor-pointer ${
      isActive
        ? "bg-primary text-white-100"
        : "bg-black-5 text-black-70 hover:bg-black-10"
    }`}
  >
    {label}
  </button>
);

const SkeletonCard = () => (
  <div className="flex flex-col gap-3 rounded-2xl border border-black-20 bg-white-100 p-3 shadow-sm">
    <div className="aspect-3/4 w-full animate-pulse rounded-xl bg-black-10" />
    <div className="flex flex-col gap-1">
      <div className="h-5 w-3/4 animate-pulse rounded bg-black-10" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-black-10" />
    </div>
  </div>
);

const MyDocPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<SimpleTarget[]>([]);
  const [groups, setGroups] = useState<SimpleTarget[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<DocTarget | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingDuplicateDoc, setPendingDuplicateDoc] =
    useState<DocItem | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const { isCreatingDoc, createAndOpenDocument } = useCreateDocumentNavigation();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthLoading, isAuthenticated, navigate]);

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

      const [docsResult, targetsResult, studentsResult, groupsResult] =
        await Promise.all([
          supabase
            .from("user_made_n")
            .select("id,name,created_at,canvas_data")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          supabase
            .from("user_made_targets_n")
            .select(
              "user_made_id,child_id,group_id,students_n(id,name),groups_n(id,name)",
            )
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
        setErrorMessage("학습자 목록을 불러오지 못했어요.");
      }
      if (groupsResult.error) {
        setErrorMessage("그룹 목록을 불러오지 못했어요.");
      }

      setStudents((studentsResult.data as SimpleTarget[] | null) ?? []);
      setGroups((groupsResult.data as SimpleTarget[] | null) ?? []);

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
      if (targetsResult.error) {
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

    void loadDocs();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading]);

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

  // 소프트 삭제 처리
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
    const now = new Date().toISOString();
    const { error: targetError } = await supabase
      .from("user_made_targets_n")
      .update({ deleted_at: now })
      .eq("user_made_id", docId);
    if (targetError) {
      setErrorMessage("학습자료를 삭제하지 못했어요.");
      return;
    }
    const { error } = await supabase
      .from("user_made_n")
      .update({ deleted_at: now })
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

  const hasFilters = students.length > 0 || groups.length > 0;

  return (
    <div className="flex h-full w-full flex-col">
      {/* 헤더: 뒤로가기 + 제목 + 검색 + 새 자료 버튼 */}
      <header className="flex w-full items-center justify-between px-10 pt-8 pb-4">
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
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="내 보관함 검색"
              className="h-11 w-full rounded-xl border border-black-20 bg-black-5 pl-10 pr-4 text-14-regular text-black-90 placeholder:text-black-50 focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void createAndOpenDocument({
              onError: () => setErrorMessage("새 학습자료를 만들지 못했어요."),
            });
          }}
          disabled={isCreatingDoc}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-14-semibold text-white-100 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />새 자료 만들기
        </button>
      </header>

      {/* 스크롤 콘텐츠 */}
      <div className="flex w-full flex-1 flex-col gap-10 overflow-y-auto px-10 pb-20">
        {/* 필터 칩 바: 학습자/그룹별 필터링 */}
        {hasFilters && (
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <FilterChip
              label="전체"
              isActive={selectedTarget === null}
              onClick={() => setSelectedTarget(null)}
            />
            {students.map((s) => (
              <FilterChip
                key={`child-${s.id}`}
                label={`아동: ${s.name}`}
                isActive={
                  selectedTarget?.type === "child" &&
                  selectedTarget.id === s.id
                }
                onClick={() =>
                  setSelectedTarget((prev) =>
                    prev?.type === "child" && prev.id === s.id
                      ? null
                      : { type: "child", id: s.id, name: s.name },
                  )
                }
              />
            ))}
            {groups.map((g) => (
              <FilterChip
                key={`group-${g.id}`}
                label={`그룹: ${g.name}`}
                isActive={
                  selectedTarget?.type === "group" &&
                  selectedTarget.id === g.id
                }
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

        {errorMessage && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-14-regular text-red-600">
            {errorMessage}
          </div>
        )}

        {/* 문서 그리드 섹션 */}
        <section className="flex flex-col gap-6">
          <span className="text-title-22-semibold text-black-90">
            {selectedTarget
              ? `${selectedTarget.name}의 학습자료`
              : "전체 학습자료"}
          </span>

          {isLoading ? (
            <div className="grid w-full grid-cols-5 gap-5">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-black-10 bg-black-5 py-14">
              <div className="flex flex-col items-center gap-3">
                <span className="text-14-regular text-black-50">
                  {searchTerm.trim()
                    ? "검색 결과가 없습니다."
                    : "등록된 학습자료가 없습니다."}
                </span>
                {!searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      void createAndOpenDocument({
                        onError: () =>
                          setErrorMessage("새 학습자료를 만들지 못했어요."),
                      });
                    }}
                    disabled={isCreatingDoc}
                    className="rounded-lg border border-primary px-4 py-2 text-14-semibold text-primary transition hover:bg-primary/5"
                  >
                    학습자료 만들어보기
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid w-full grid-cols-5 gap-5">
              {/* 새 자료 만들기 카드 */}
              <button
                type="button"
                onClick={() => {
                  void createAndOpenDocument({
                    onError: () =>
                      setErrorMessage("새 학습자료를 만들지 못했어요."),
                  });
                }}
                disabled={isCreatingDoc}
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black-20 bg-white-100 p-3 text-black-50 transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex aspect-3/4 w-full items-center justify-center rounded-xl">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black-5">
                    <Plus className="h-6 w-6" />
                  </div>
                </div>
                <span className="text-14-semibold">새 자료 만들기</span>
              </button>

              {/* 문서 카드 */}
              {visibleDocs.map((doc) => {
                const previewPage = doc.canvasData?.pages?.[0];
                const rawOrientation = previewPage?.orientation;
                const orientation =
                  rawOrientation === "horizontal" ||
                  rawOrientation === "vertical"
                    ? rawOrientation
                    : "vertical";
                const baseW =
                  orientation === "horizontal" ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
                const baseH =
                  orientation === "horizontal" ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;
                const scaledW = baseW * PREVIEW_SCALE;
                const scaledH = baseH * PREVIEW_SCALE;
                const elements = Array.isArray(previewPage?.elements)
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
                    className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-black-20 bg-white-100 p-3 shadow-sm transition hover:border-primary hover:shadow-md"
                  >
                    {/* 미리보기 + 액션 버튼 */}
                    <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl border border-black-10 bg-black-5">
                      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
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
                            void handleDeleteDoc(doc.id);
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
                            width: `${scaledW}px`,
                            height: `${scaledH}px`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div
                            style={{
                              width: `${baseW}px`,
                              height: `${baseH}px`,
                              transform: `scale(${PREVIEW_SCALE})`,
                              transformOrigin: "top left",
                              pointerEvents: "none",
                            }}
                          >
                            <DesignPaper
                              pageId={`mydoc-${doc.id}`}
                              orientation={orientation}
                              elements={elements}
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
                            className="rounded-full bg-black-5 px-2 py-0.5 text-12-regular text-black-60"
                          >
                            {target.type === "child" ? "아동" : "그룹"}:{" "}
                            {target.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 복제 확인 모달 */}
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
                  ? "cursor-not-allowed bg-black-40"
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
