/**
 * 문서 카드 우클릭 컨텍스트 메뉴.
 * 아동 목록을 체크박스로 보여주고, 체크/해제로 즉시 배정/해제.
 *
 * 엣지케이스 대응:
 * - 해제: soft delete UPDATE가 0행이면 hard delete 시도
 * - 중복 배정: 이미 active 행 있으면 INSERT 스킵
 * - 빠른 연타: isUpdating 플래그로 차단
 * - 메뉴 밖 클릭/ESC/다른 우클릭: 즉시 닫힘
 */
import { useEffect, useState } from "react";
import { Check, User } from "lucide-react";
import { createPortal } from "react-dom";

import { supabase } from "@/shared/api/supabase";

interface SimpleTarget {
  id: string;
  name: string;
}

interface DocContextMenuProps {
  docId: string;
  docTargets: { type: "child" | "group"; id: string; name: string }[];
  students: SimpleTarget[];
  position: { x: number; y: number };
  onClose: () => void;
  onTargetsChanged: () => void;
}

const DocContextMenu = ({
  docId,
  docTargets,
  students,
  position,
  onClose,
  onTargetsChanged,
}: DocContextMenuProps) => {
  // DB에서 현재 배정 상태를 직접 로드 (stale props 방지)
  const [assignedChildIds, setAssignedChildIds] = useState<Set<string>>(
    new Set(docTargets.filter((t) => t.type === "child").map((t) => t.id)),
  );
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // 메뉴 열릴 때 최신 배정 상태 DB에서 조회
  useEffect(() => {
    const loadTargets = async () => {
      const { data } = await supabase
        .from("user_made_targets_n")
        .select("child_id")
        .eq("user_made_id", docId)
        .is("deleted_at", null)
        .not("child_id", "is", null);

      if (data) {
        setAssignedChildIds(
          new Set(data.map((r: { child_id: string }) => r.child_id)),
        );
      }
    };
    void loadTargets();
  }, [docId]);

  // 바깥 클릭/ESC/다른 우클릭 시 닫기
  useEffect(() => {
    const handleClose = () => onClose();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const timer = setTimeout(() => {
      document.addEventListener("click", handleClose);
      document.addEventListener("contextmenu", handleClose);
      document.addEventListener("keydown", handleEsc);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleClose);
      document.removeEventListener("contextmenu", handleClose);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  const toggleChild = async (childId: string) => {
    if (isUpdating) return; // 연타 방지
    setIsUpdating(childId);
    const isAssigned = assignedChildIds.has(childId);

    if (isAssigned) {
      // 해제: DELETE로 변경 (soft delete UPDATE가 RLS 때문에 실패할 수 있음)
      const { error } = await supabase
        .from("user_made_targets_n")
        .delete()
        .eq("user_made_id", docId)
        .eq("child_id", childId);

      if (!error) {
        setAssignedChildIds((prev) => {
          const next = new Set(prev);
          next.delete(childId);
          return next;
        });
        onTargetsChanged();
      }
    } else {
      // 배정: 이미 active 행이 있는지 확인 후 INSERT
      const { data: existing } = await supabase
        .from("user_made_targets_n")
        .select("user_made_id")
        .eq("user_made_id", docId)
        .eq("child_id", childId)
        .is("deleted_at", null)
        .limit(1);

      if (existing && existing.length > 0) {
        // 이미 배정됨 — UI만 동기화
        setAssignedChildIds((prev) => new Set(prev).add(childId));
      } else {
        const { error } = await supabase
          .from("user_made_targets_n")
          .insert({ user_made_id: docId, child_id: childId });

        if (!error) {
          setAssignedChildIds((prev) => new Set(prev).add(childId));
          onTargetsChanged();
        }
      }
    }
    setIsUpdating(null);
  };

  // 화면 밖 나가지 않도록 위치 보정
  const menuWidth = 200;
  const menuMaxHeight = 300;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 16);
  const adjustedY = Math.min(position.y, window.innerHeight - menuMaxHeight - 16);

  return createPortal(
    <div
      className="fixed z-50 flex flex-col rounded-xl border border-black-15 bg-white py-2 shadow-xl"
      style={{
        left: adjustedX,
        top: adjustedY,
        width: menuWidth,
        maxHeight: menuMaxHeight,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-1">
        <User className="h-3.5 w-3.5 text-black-50" />
        <span className="text-12-semibold text-black-60">아동에게 배정</span>
      </div>

      <div className="border-t border-black-10" />

      {/* 아동 목록 */}
      {students.length === 0 ? (
        <div className="px-3 py-4 text-center text-13-regular text-black-40">
          등록된 아동이 없어요
        </div>
      ) : (
        <div className="max-h-52 overflow-y-auto py-1">
          {students.map((student) => {
            const isAssigned = assignedChildIds.has(student.id);
            const isLoading = isUpdating === student.id;

            return (
              <button
                key={student.id}
                onClick={() => void toggleChild(student.id)}
                disabled={!!isUpdating}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${
                  isAssigned
                    ? "bg-primary-50 text-primary"
                    : "text-black-70 hover:bg-black-5"
                } ${isUpdating ? "opacity-50 cursor-wait" : ""}`}
              >
                <div
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition ${
                    isAssigned
                      ? "border-primary bg-primary"
                      : "border-black-30"
                  }`}
                >
                  {isAssigned && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <span className="min-w-0 truncate text-13-regular">
                  {student.name}
                </span>
                {isLoading && (
                  <span className="ml-auto shrink-0 text-11-regular text-black-40">
                    ...
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>,
    document.body,
  );
};

export default DocContextMenu;
