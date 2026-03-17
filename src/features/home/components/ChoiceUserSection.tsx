/**
 * 아동/그룹 관리 섹션 — 탭 전환 + 페이지네이션 리스트.
 */
import { ChevronLeft, ChevronRight, Plus, User, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useModalStore } from "@/shared/store/useModalStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useStudentStore } from "../store/useStudentStore";
import type { Student } from "../model/student.model";
import type { Group } from "../model/group.model";

const PAGE_SIZE = 4;

const ChoiceUserSection = () => {
  const [lessonType, setLessonType] = useState<"individual" | "group">("individual");
  const [page, setPage] = useState(0);
  const {
    openAddUserModal,
    openAddGroupModal,
    openEditUserModal,
    openEditGroupModal,
    openAuthModal,
  } = useModalStore();
  const { isAuthenticated } = useAuthStore();
  const { students, groups, fetchAll, clear } = useStudentStore();

  useEffect(() => {
    if (!isAuthenticated) {
      clear();
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // 탭 전환 시 페이지 리셋
  useEffect(() => { setPage(0); }, [lessonType]);

  const handleAddClick = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (lessonType === "individual") openAddUserModal();
    else openAddGroupModal();
  };

  const items = lessonType === "individual" ? students : groups;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visibleItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <section className={`flex flex-col w-full gap-4 rounded-2xl border bg-white-100 p-3 md:p-5 shadow-sm transition-colors ${
      lessonType === "individual" ? "border-primary-200" : "border-emerald-200"
    }`}>
      {/* 블록 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="icon-s text-primary" />
          <span className="text-title-22-semibold text-black-90">내 학습자</span>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-13-semibold text-white-100 transition cursor-pointer shadow-sm hover:opacity-90"
          style={{
            background: lessonType === "individual"
              ? "linear-gradient(135deg, #7C3AED, #8b5cf6)"
              : "linear-gradient(135deg, #059669, #10b981)",
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          추가
        </button>
      </div>

      {/* 탭 전환 */}
      <div className="flex items-center gap-1 rounded-full border border-black-20 bg-black-10 p-0.5 self-start">
        <TabButton
          isActive={lessonType === "individual"}
          onClick={() => setLessonType("individual")}
          icon={<User className="h-3.5 w-3.5" />}
          label={`아동 ${students.length}`}
          variant="primary"
        />
        <TabButton
          isActive={lessonType === "group"}
          onClick={() => setLessonType("group")}
          icon={<Users className="h-3.5 w-3.5" />}
          label={`그룹 ${groups.length}`}
          variant="success"
        />
      </div>

      {/* 리스트 — 고정 높이 */}
      <div className="flex flex-col gap-2 min-h-70">
        {items.length === 0 ? (
          <EmptyState
            label={lessonType === "individual" ? "등록된 아동이 없습니다" : "등록된 그룹이 없습니다"}
            ctaLabel={lessonType === "individual" ? "아동 추가하기" : "그룹 추가하기"}
            onCtaClick={handleAddClick}
          />
        ) : (
          visibleItems.map((item) =>
            lessonType === "individual" ? (
              <StudentRow
                key={item.id}
                student={item as Student}
                onClick={() => openEditUserModal(item.id!)}
              />
            ) : (
              <GroupRow
                key={item.id}
                group={item as Group}
                onClick={() => openEditGroupModal(item.id!)}
              />
            ),
          )
        )}
      </div>

      {/* 페이지네이션 — 항상 공간 유지, 1페이지면 숨김 */}
      <div className={`flex items-center justify-center gap-3 ${items.length <= PAGE_SIZE ? "invisible" : ""}`}>
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="flex h-7 w-7 items-center justify-center rounded-full text-black-50 hover:bg-black-10 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-13-regular text-black-50 tabular-nums min-w-10 text-center">
          {page + 1} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className="flex h-7 w-7 items-center justify-center rounded-full text-black-50 hover:bg-black-10 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
};

// ─── 서브 컴포넌트 ───

const TAB_ACTIVE_CLASS = {
  primary: "bg-primary-50 text-primary shadow-sm",
  success: "bg-emerald-50 text-emerald-700 shadow-sm",
};

const TabButton = ({
  isActive,
  onClick,
  icon,
  label,
  variant = "primary",
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant?: "primary" | "success";
}) => (
  <button
    type="button"
    aria-pressed={isActive}
    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-13-bold cursor-pointer transition ${
      isActive
        ? TAB_ACTIVE_CLASS[variant]
        : "text-black-60 hover:bg-black-15"
    }`}
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);

const StudentRow = ({
  student,
  onClick,
}: {
  student: Student;
  onClick: () => void;
}) => {
  const age = new Date().getFullYear() - parseInt(student.birth_year);
  const genderLabel = student.gender === "male" ? "남" : student.gender === "female" ? "여" : "";
  const meta = [
    `만 ${age}세`,
    genderLabel,
  ].filter(Boolean).join(" · ");

  const details = [
    student.significant ? `특이사항: ${student.significant}` : null,
    student.learning_goal ? `목표: ${student.learning_goal}` : null,
  ].filter(Boolean);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-black-20 bg-white-100 px-4 py-3 shadow-sm text-left transition hover:border-primary-200 hover:bg-primary-50 hover:shadow-md cursor-pointer"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
        <User className="h-4 w-4" />
      </div>
      <div className="flex flex-col min-w-0 gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-14-semibold text-black-90 truncate">{student.name}</span>
          <span className="text-12-regular text-black-50 shrink-0">{meta}</span>
        </div>
        {details.length > 0 && (
          <span className="text-12-regular text-black-50 truncate">
            {details.join(" | ")}
          </span>
        )}
      </div>
    </button>
  );
};

const GroupRow = ({
  group,
  onClick,
}: {
  group: Group;
  onClick: () => void;
}) => {
  const members =
    group.groups_members_n?.flatMap((m) => {
      const s = m.students_n;
      if (!s) return [];
      return Array.isArray(s) ? s : [s];
    }) ?? [];
  const memberNames = members.map((m) => m.name).join(", ");

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-start gap-3 rounded-xl border border-black-20 bg-white-100 px-4 py-3 shadow-sm text-left transition hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-md cursor-pointer"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mt-0.5">
        <Users className="h-4 w-4" />
      </div>
      <div className="flex flex-col min-w-0 gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="text-14-semibold text-black-90 truncate">{group.name}</span>
          <span className="text-12-regular text-black-50 shrink-0">멤버 {members.length}명</span>
        </div>
        {memberNames && (
          <span className="text-12-regular text-black-50 truncate">{memberNames}</span>
        )}
        {group.description && (
          <span className="text-12-regular text-black-40 truncate">{group.description}</span>
        )}
      </div>
    </button>
  );
};

const EmptyState = ({
  label,
  ctaLabel,
  onCtaClick,
}: {
  label: string;
  ctaLabel: string;
  onCtaClick: () => void;
}) => (
  <div className="flex items-center justify-center rounded-xl border border-dashed border-black-20 bg-black-5 py-10">
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50">
        <User className="h-5 w-5 text-primary-300" />
      </div>
      <span className="text-14-regular text-black-50">{label}</span>
      <button
        type="button"
        onClick={onCtaClick}
        className="flex items-center gap-1 text-14-semibold text-primary hover:text-primary-700 transition cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        {ctaLabel}
      </button>
    </div>
  </div>
);

export default ChoiceUserSection;
