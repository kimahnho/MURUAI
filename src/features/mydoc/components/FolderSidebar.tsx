/**
 * 폴더 트리 사이드바.
 * 전체 / 폴더 트리 / 미분류 / 구분선 / 아동 / 그룹 순서.
 */
import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  Plus,
} from "lucide-react";

import type { FolderNode } from "../model/folderTypes";
import { useFolderStore } from "../store/useFolderStore";

interface FolderSidebarProps {
  totalDocCount: number;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, folderName: string) => void;
  onFolderSelected?: () => void;
}

const FolderSidebar = ({
  totalDocCount,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onFolderSelected,
}: FolderSidebarProps) => {
  const folders = useFolderStore((s) => s.folders);
  const unfiledCount = useFolderStore((s) => s.unfiledCount);
  const filter = useFolderStore((s) => s.filter);
  const setFilter = useFolderStore((s) => s.setFilter);
  const isFolderSectionOpen = useFolderStore((s) => s.isFolderSectionOpen);
  const toggleFolderSection = useFolderStore((s) => s.toggleFolderSection);

  // 폴더 선택 시 아동/그룹 필터 해제하는 래퍼
  const handleSetFilter = (f: { type: "all" } | { type: "folder"; folderId: string } | { type: "unfiled" }) => {
    setFilter(f);
    onFolderSelected?.();
  };

  return (
    <nav className="flex flex-col gap-1">
      {/* 전체 */}
      <SidebarItem
        icon={<Folder className="h-4 w-4" />}
        label="전체"
        count={totalDocCount}
        isActive={filter.type === "all"}
        onClick={() => handleSetFilter({ type: "all" })}
      />

      {/* 폴더 섹션 헤더 */}
      <button
        onClick={toggleFolderSection}
        className="mt-2 flex items-center gap-1 px-2 py-1 text-12-semibold text-black-50 hover:text-black-70"
      >
        {isFolderSectionOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        폴더
      </button>

      {isFolderSectionOpen && (
        <>
          {/* 폴더 트리 */}
          {folders.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              depth={0}
              filter={filter}
              setFilter={handleSetFilter}
              onCreateSubfolder={(parentId) => onCreateFolder(parentId)}
              onRename={onRenameFolder}
              onDelete={onDeleteFolder}
            />
          ))}

          {/* 미분류 */}
          <SidebarItem
            icon={<Folder className="h-4 w-4 text-black-40" />}
            label="미분류"
            count={unfiledCount}
            isActive={filter.type === "unfiled"}
            onClick={() => handleSetFilter({ type: "unfiled" })}
            className="pl-4"
          />

          {/* 새 폴더 버튼 */}
          <button
            onClick={() => onCreateFolder()}
            className="flex items-center gap-2 rounded-lg px-4 py-1.5 text-13-regular text-primary hover:bg-primary-50"
          >
            <Plus className="h-3.5 w-3.5" />
            새 폴더
          </button>
        </>
      )}
    </nav>
  );
};

// 폴더 트리 아이템 (재귀 — 2단계까지)
const FolderTreeItem = ({
  folder,
  depth,
  filter,
  setFilter,
  onCreateSubfolder,
  onRename,
  onDelete,
}: {
  folder: FolderNode;
  depth: number;
  filter: { type: string; folderId?: string };
  setFilter: (f: { type: "all" } | { type: "folder"; folderId: string } | { type: "unfiled" }) => void;
  onCreateSubfolder: (parentId: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const isActive = filter.type === "folder" && filter.folderId === folder.id;
  const hasChildren = folder.children.length > 0;
  const paddingLeft = 16 + depth * 16;

  return (
    <>
      <div
        className={`group flex items-center justify-between rounded-lg py-1.5 pr-1 transition ${
          isActive ? "bg-primary-50 text-primary" : "hover:bg-black-5"
        }`}
        style={{ paddingLeft }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-1.5"
          onClick={() => setFilter({ type: "folder", folderId: folder.id })}
        >
          {/* 펼치기/접기 (하위폴더 있을 때만) */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="shrink-0 rounded p-0.5 hover:bg-black-10"
            >
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {isActive ? (
            <FolderOpen className="h-4 w-4 shrink-0" />
          ) : (
            <Folder
              className="h-4 w-4 shrink-0"
              style={folder.color ? { color: folder.color } : undefined}
            />
          )}
          <span className="min-w-0 truncate text-13-regular">{folder.name}</span>
          <span className="shrink-0 text-12-regular text-black-40">
            {folder.docCount + folder.children.reduce((sum, c) => sum + c.docCount, 0)}
          </span>
        </button>

        {/* 더보기 메뉴 */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-black-10"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-black-50" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 min-w-[140px] rounded-lg border border-black-15 bg-white py-1 shadow-lg">
                {depth === 0 && (
                  <MenuButton
                    onClick={() => {
                      setShowMenu(false);
                      onCreateSubfolder(folder.id);
                    }}
                  >
                    하위폴더 추가
                  </MenuButton>
                )}
                <MenuButton
                  onClick={() => {
                    setShowMenu(false);
                    onRename(folder.id, folder.name);
                  }}
                >
                  이름 변경
                </MenuButton>
                <MenuButton
                  variant="danger"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(folder.id, folder.name);
                  }}
                >
                  삭제
                </MenuButton>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 하위폴더 */}
      {isOpen &&
        hasChildren &&
        folder.children.map((child) => (
          <FolderTreeItem
            key={child.id}
            folder={child}
            depth={depth + 1}
            filter={filter}
            setFilter={setFilter}
            onCreateSubfolder={onCreateSubfolder}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
    </>
  );
};

// 사이드바 기본 아이템
const SidebarItem = ({
  icon,
  label,
  count,
  isActive,
  onClick,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
      isActive ? "bg-primary-50 text-primary" : "hover:bg-black-5 text-black-80"
    } ${className}`}
  >
    <span className="flex items-center gap-2 text-13-semibold">
      {icon}
      {label}
    </span>
    <span className="text-12-regular text-black-40">{count}</span>
  </button>
);

// 메뉴 버튼
const MenuButton = ({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}) => (
  <button
    onClick={onClick}
    className={`w-full px-3 py-1.5 text-left text-13-regular transition ${
      variant === "danger"
        ? "text-error-700 hover:bg-error-50"
        : "text-black-80 hover:bg-black-5"
    }`}
  >
    {children}
  </button>
);

export default FolderSidebar;
