/**
 * 폴더 만들기/이름 변경 모달.
 */
import { useState } from "react";

import BaseModal from "@/shared/ui/BaseModal";
import Button from "@/shared/ui/Button";
import Input from "@/shared/ui/Input";

import type { FolderNode } from "../model/folderTypes";

interface FolderCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, parentId: string | null) => Promise<void>;
  /** 수정 모드일 때 기존 이름 */
  editingName?: string;
  /** 상위폴더 자동 선택 */
  defaultParentId?: string | null;
  /** 상위폴더 선택용 목록 (최상위 폴더만) */
  topLevelFolders: FolderNode[];
}

const MAX_NAME_LENGTH = 100;

const FolderCreateModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingName,
  defaultParentId = null,
  topLevelFolders,
}: FolderCreateModalProps) => {
  const isEditing = !!editingName;
  const [name, setName] = useState(editingName ?? "");
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("폴더 이름을 입력해주세요.");
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`폴더 이름은 ${MAX_NAME_LENGTH}자 이내로 입력해주세요.`);
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      await onSubmit(trimmed, parentId);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "폴더 처리에 실패했어요.";
      if (msg.includes("idx_unique_folder_name")) {
        setError("같은 위치에 같은 이름의 폴더가 이미 있어요.");
      } else if (msg.includes("nested 2 levels")) {
        setError("폴더는 2단계까지만 만들 수 있어요.");
      } else if (msg.includes("folder limit")) {
        setError("폴더는 최대 100개까지 만들 수 있어요.");
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "폴더 이름 변경" : "새 폴더 만들기"}
      size="sm"
    >
      <div className="flex flex-col gap-4 p-5">
        <Input
          label="폴더 이름"
          placeholder="예: 1반 수업자료"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSubmitting) handleSubmit();
          }}
        />

        {/* 상위폴더 선택 (만들기 모드 + 상위폴더 미지정일 때만) */}
        {!isEditing && defaultParentId === null && topLevelFolders.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="text-13-semibold text-black-70">
              상위 폴더 (선택)
            </label>
            <select
              value={parentId ?? ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="rounded-lg border border-black-20 px-3 py-2 text-14-regular text-black-80"
            >
              <option value="">없음 (최상위 폴더)</option>
              {topLevelFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={!name.trim()}
          >
            {isEditing ? "변경" : "만들기"}
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default FolderCreateModal;
