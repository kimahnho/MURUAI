import type { Group } from "../model/group.model";

interface GroupCardProps {
  group: Group;
  onClick?: () => void;
}

const GroupCard = ({ group, onClick }: GroupCardProps) => {
  const members =
    group.groups_members_n?.flatMap((member) => {
      const students = member.students_n;
      if (!students) return [];
      return Array.isArray(students) ? students : [students];
    }) ?? [];
  const visibleMembers = members.slice(0, 4);

  return (
    <div
      className={`flex flex-col h-85 rounded-xl border border-black-30 p-3 gap-2 ${
        onClick ? "cursor-pointer transition hover:border-primary" : ""
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex min-w-0 flex-col text-start gap-0.5 shrink-0">
        <span className="w-full overflow-hidden text-ellipsis text-title-18-semibold text-black-100 line-clamp-2">
          {group.name}
        </span>
        <span className="w-full overflow-hidden text-ellipsis text-14-semibold text-black-70 line-clamp-2">
          {group.description?.trim() || "그룹 설명이 없습니다."}
        </span>
      </div>

      <div className="flex text-start shrink-0">
        <span className="flex text-title-16-semibold text-black-100">
          멤버 (총 {members.length}명)
        </span>
      </div>

      <div className="flex w-full flex-1 min-h-0 rounded-xl bg-[#5500ff]/10 p-2">
        <div className="flex flex-col w-full h-full gap-1.5">
          {visibleMembers.length > 0 ? (
            visibleMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-lg border border-black-20 bg-white-100 px-2 py-1.5 shadow-sm min-h-0"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span className="text-13-regular text-black-100">
                  {member.name}
                </span>
              </div>
            ))
          ) : (
            <div className="flex h-full items-center justify-center text-13-regular text-black-60">
              등록된 아동이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupCard;
