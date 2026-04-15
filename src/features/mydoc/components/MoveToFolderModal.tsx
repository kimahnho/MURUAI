/**
 * 문서를 폴더로 이동하는 모달.
 * 플랫 리스트로 모든 폴더를 보여주고 클릭으로 이동.
 */
import { useState } from "react";
import { Folder, FolderOpen } from "lucide-react";

import BaseModal from "@/shared/ui/BaseModal";
import Button from "@/shared/ui/Button";

import type { FolderNode } from "../model/folderTypes";

interface MoveToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (folderId: string | null) => Promise<void>;
  folders: FolderNode[];
  currentFolderId: string | null;
  docName: string;
}

const MoveToFolderModal = ({
  isOpen,
  onClose,
  onMove,
  folders,
  currentFolderId,
  docName,
}: MoveToFolderModalProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async () => {
    if (selectedId === currentFolderId) {
      onClose();
      return;
    }
    setIsMoving(true);
    try {
      await onMove(selectedId);
      onClose();
    } catch {
      // 에러는 호출처에서 토스트
    } finally {
      setIsMoving(false);
    }
  };

  // 폴더 트리를 플랫 리스트로 변환 (들여쓰기 표시용)
  const flatList: { id: string | null; name: string; depth: number }[] = [
    { id: null, name: "미분류", depth: 0 },
  ];

  for (const folder of folders) {
    flatList.push({ id: folder.id, name: folder.name, depth: 0 });
    for (const child of folder.children) {
      flatList.push({ id: child.id, name: child.name, depth: 1 });
    }
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="폴더로 이동"
      size="sm"
    >
      <div className="flex flex-col gap-3 p-5">
        <p className="text-13-regular text-black-50 truncate">
          &quot;{docName}&quot; 이동
        </p>

        <div className="max-h-60 overflow-y-auto rounded-lg border border-black-15">
          {flatList.map((item) => {
            const isSelected = selectedId === item.id;
            const isCurrent = currentFolderId === item.id;

            return (
              <button
                key={item.id ?? "unfiled"}
                onClick={() => setSelectedId(item.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                  isSelected
                    ? "bg-primary-50 text-primary"
                    : "hover:bg-black-5 text-black-80"
                }`}
                style={{ paddingLeft: 12 + item.depth * 20 }}
              >
                {isSelected ? (
                  <FolderOpen className="h-4 w-4 shrink-0" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-black-40" />
                )}
                <span className="min-w-0 truncate text-13-regular">
                  {item.name}
                </span>
                {isCurrent && (
                  <span className="shrink-0 text-12-regular text-black-40">
                    현재
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleMove}
            isLoading={isMoving}
            disabled={selectedId === currentFolderId}
          >
            이동
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default MoveToFolderModal;
