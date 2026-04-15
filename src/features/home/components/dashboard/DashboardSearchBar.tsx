/**
 * 대시보드 통합 검색바 — 자료/아동/템플릿 검색 + 드롭다운 결과.
 */
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, User, LayoutTemplate, X } from "lucide-react";

import { useModalStore } from "@/shared/store/useModalStore";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";
import { buildTemplatePages } from "@/features/editor/utils/pageFactory";
import type { TemplateId } from "@/features/editor/templates/templateRegistry";
import { mp } from "@/shared/utils/mixpanel";

import { useDashboardSearch } from "../../hooks/useDashboardSearch";
import type { SearchResultItem } from "../../hooks/useDashboardSearch";

const TYPE_CONFIG = {
  document: { icon: FileText, label: "내 자료", color: "text-primary" },
  student: { icon: User, label: "아동", color: "text-primary" },
  template: { icon: LayoutTemplate, label: "템플릿", color: "text-primary" },
} as const;

const DashboardSearchBar = () => {
  const navigate = useNavigate();
  const { openEditUserModal } = useModalStore();
  const { createAndOpenDocument } = useCreateDocumentNavigation();
  const { query, setQuery, results, isSearching } = useDashboardSearch();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const showDropdown = isFocused && query.trim().length > 0;

  // 카테고리별 그룹핑
  const grouped = results.reduce<Record<string, SearchResultItem[]>>(
    (acc, item) => {
      (acc[item.type] ??= []).push(item);
      return acc;
    },
    {},
  );

  const handleSelect = async (item: SearchResultItem) => {
    setQuery("");
    inputRef.current?.blur();

    if (item.type === "document") {
      mp.track("대시보드 검색 자료 클릭", { doc_id: item.id });
      navigate(`/${item.id}/edit`);
    } else if (item.type === "student") {
      openEditUserModal(item.id);
    } else if (item.type === "template") {
      mp.track("대시보드 검색 템플릿 클릭", { template_id: item.id });
      const pages = buildTemplatePages(item.id as TemplateId);
      await createAndOpenDocument({ replace: false, pages });
    }
  };

  return (
    <div className="relative w-full">
      {/* 검색 입력 */}
      <div
        className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition ${
          isFocused ? "border-primary shadow-[0_0_0_2px_rgba(85,0,255,0.08)]" : "border-black-20"
        }`}
      >
        <Search className="h-4.5 w-4.5 shrink-0 text-black-40" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder="학습자료, 아동, 템플릿 검색..."
          className="flex-1 text-14-regular text-black-90 outline-none placeholder:text-black-40"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="shrink-0 cursor-pointer text-black-40 hover:text-black-70 transition"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 드롭다운 결과 */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-black-15 bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          {isSearching ? (
            <div className="flex items-center justify-center py-6 text-14-regular text-black-40">
              검색 중...
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <span className="text-14-regular text-black-40">
                &quot;{query}&quot;에 대한 결과가 없어요
              </span>
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
              return (
                <div key={type}>
                  <div className="px-4 pb-1 pt-3 text-12-semibold text-black-40">
                    {config.label}
                  </div>
                  {items.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelect(item)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-black-5 cursor-pointer"
                    >
                      <config.icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                      <div className="flex min-w-0 flex-col">
                        <span className="text-14-regular text-black-90 truncate">
                          {item.label}
                        </span>
                        {item.sub && (
                          <span className="text-12-regular text-black-40">
                            {item.sub}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardSearchBar;
