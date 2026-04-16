/**
 * 폴더에 자료 추가 모달.
 * 썸네일 그리드 12개씩 페이지네이션으로 보여주고, 클릭으로 선택/해제.
 */
import { useEffect, useState } from "react";
import { ArrowDownUp, Check, ChevronLeft, ChevronRight, Search } from "lucide-react";

import { supabase } from "@/shared/api/supabase";
import BaseModal from "@/shared/ui/BaseModal";
import Button from "@/shared/ui/Button";
import Spinner from "@/shared/ui/Spinner";
import DesignPaper from "@/features/editor/sections/canvas/DesignPaper";
import type { CanvasDocument } from "@/features/editor/model/pageTypes";
import { decompressCanvasData } from "@/shared/utils/canvasDataCompression";

interface DocPreview {
  id: string;
  name: string | null;
  folder_id: string | null;
  canvas_data: unknown | null;
  created_at: string | null;
  updated_at: string | null;
}

type SortOption = "updated" | "created" | "name";
const SORT_LABELS: Record<SortOption, string> = {
  updated: "최근 수정순",
  created: "최근 생성순",
  name: "이름순",
};

const PAGE_WIDTH_PX = 210 * 3.7795;
const PAGE_HEIGHT_PX = 297 * 3.7795;
const THUMB_SCALE = 0.12;
const ITEMS_PER_PAGE = 12;

// canvas_data 파싱은 decompressCanvasData로 통합 (gzip 압축/비압축 자동 감지)

interface AddDocsToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (docIds: string[]) => Promise<void>;
  folderId: string;
  folderName: string;
}

const AddDocsToFolderModal = ({
  isOpen,
  onClose,
  onAdd,
  folderId,
  folderName,
}: AddDocsToFolderModalProps) => {
  const [docs, setDocs] = useState<DocPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [sortOption, setSortOption] = useState<SortOption>("updated");
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedIds(new Set());
    setSearchTerm("");
    setCurrentPage(0);

    const load = async () => {
      setIsLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_made_n")
        .select("id,name,folder_id,canvas_data,created_at,updated_at")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (!error && data) {
        setDocs(
          (data as DocPreview[]).filter((d) => d.folder_id !== folderId),
        );
      }
      setIsLoading(false);
    };

    void load();
  }, [isOpen, folderId]);

  const toggleDoc = (docId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setIsAdding(true);
    try {
      await onAdd([...selectedIds]);
      onClose();
    } catch {
      // 에러는 호출처에서 토스트
    } finally {
      setIsAdding(false);
    }
  };

  // 검색 + 정렬
  const keyword = searchTerm.trim().toLowerCase();
  const searched = keyword
    ? docs.filter((d) => (d.name || "").toLowerCase().includes(keyword))
    : docs;

  const filteredDocs = [...searched].sort((a, b) => {
    if (sortOption === "name") {
      return (a.name || "").localeCompare(b.name || "", "ko");
    }
    const field = sortOption === "created" ? "created_at" : "updated_at";
    return (b[field] || "").localeCompare(a[field] || "");
  });

  // 페이지네이션
  const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, Math.max(totalPages - 1, 0));
  const pagedDocs = filteredDocs.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE,
  );

  // 검색어/정렬 변경 시 첫 페이지로
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, sortOption]);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`"${folderName}" 폴더에 자료 추가`}
      size="xl"
    >
      <div className="flex flex-col gap-4 p-5">
        {/* 검색 + 선택 개수 */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black-40" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="자료 이름으로 검색..."
              className="w-full rounded-lg border border-black-20 py-2.5 pl-10 pr-4 text-14-regular text-black-80 placeholder:text-black-40 focus:border-primary focus:outline-none"
            />
          </div>
          {/* 정렬 */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsSortOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg border border-black-20 px-2.5 py-2.5 text-13-regular text-black-60 transition hover:bg-black-5"
            >
              <ArrowDownUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{SORT_LABELS[sortOption]}</span>
            </button>
            {isSortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsSortOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-32 rounded-lg border border-black-20 bg-white py-1 shadow-lg">
                  {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => { setSortOption(key); setIsSortOpen(false); }}
                      className={`flex w-full px-3 py-2 text-left text-13-regular transition ${
                        sortOption === key ? "text-primary bg-primary-50" : "text-black-70 hover:bg-black-5"
                      }`}
                    >
                      {SORT_LABELS[key]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {selectedIds.size > 0 && (
            <span className="shrink-0 text-13-semibold text-primary">
              {selectedIds.size}개 선택
            </span>
          )}
        </div>

        {/* 썸네일 그리드 */}
        <div className="min-h-64 rounded-lg border border-black-15 p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-14-regular text-black-50">
              {keyword ? "검색 결과가 없어요" : "추가할 자료가 없어요"}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {pagedDocs.map((doc) => {
                const isSelected = selectedIds.has(doc.id);
                const canvasData = decompressCanvasData(doc.canvas_data);
                const firstPage = canvasData?.pages?.[0];
                const orientation =
                  firstPage?.orientation === "horizontal"
                    ? "horizontal"
                    : "vertical";
                const bW =
                  orientation === "horizontal" ? PAGE_HEIGHT_PX : PAGE_WIDTH_PX;
                const bH =
                  orientation === "horizontal" ? PAGE_WIDTH_PX : PAGE_HEIGHT_PX;

                return (
                  <button
                    key={doc.id}
                    onClick={() => toggleDoc(doc.id)}
                    className={`group relative flex flex-col gap-1.5 rounded-xl border-2 p-2 transition ${
                      isSelected
                        ? "border-primary bg-primary-50"
                        : "border-transparent hover:border-black-20"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}

                    <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg border border-black-10 bg-black-5">
                      {firstPage ? (
                        <div
                          className="absolute left-1/2 top-1/2"
                          style={{
                            width: `${bW * THUMB_SCALE}px`,
                            height: `${bH * THUMB_SCALE}px`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <div
                            style={{
                              width: `${bW}px`,
                              height: `${bH}px`,
                              transform: `scale(${THUMB_SCALE})`,
                              transformOrigin: "top left",
                              pointerEvents: "none",
                            }}
                          >
                            <DesignPaper
                              pageId={`folder-modal-${doc.id}`}
                              orientation={orientation}
                              elements={
                                Array.isArray(firstPage.elements)
                                  ? firstPage.elements
                                  : []
                              }
                              selectedIds={[]}
                              editingTextId={null}
                              background={firstPage.background}
                              readOnly
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-11-regular text-black-40">
                          미리보기 없음
                        </div>
                      )}
                    </div>

                    <span className="truncate text-12-semibold text-black-80">
                      {doc.name || "제목 없음"}
                    </span>

                    {doc.folder_id && (
                      <span className="truncate text-11-regular text-warning-700">
                        다른 폴더에서 이동됨
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black-20 text-black-60 transition hover:bg-black-5 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-13-regular text-black-60">
              {safePage + 1} / {totalPages}
            </span>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
              }
              disabled={safePage >= totalPages - 1}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-black-20 text-black-60 transition hover:bg-black-5 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            isLoading={isAdding}
            disabled={selectedIds.size === 0}
          >
            {selectedIds.size > 0
              ? `${selectedIds.size}개 추가하기`
              : "자료를 선택해주세요"}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default AddDocsToFolderModal;
