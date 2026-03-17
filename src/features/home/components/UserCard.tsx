/**
 * 학생 카드 요약 정보를 표시하고 상세/편집 액션을 제공하는 컴포넌트.
 */
import type { Student } from "../model/student.model";

interface UserCardProps {
  student: Student;
  onClick?: () => void;
}

const UserCard = ({ student, onClick }: UserCardProps) => {
  // 현재 연도와 출생 연도로 나이 계산
  const currentYear = new Date().getFullYear();
  const age = currentYear - parseInt(student.birth_year);

  return (
    <div
      className={`flex flex-col h-60 md:h-85 rounded-xl border border-black-30 p-3 md:p-4 gap-3 md:gap-4 overflow-hidden ${
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
      <div className="flex flex-col text-start gap-1 min-w-0 shrink-0">
        <span className="text-title-20-semibold text-black truncate">
          {student.name}{student.gender === "male" ? " (남)" : student.gender === "female" ? " (여)" : ""}
        </span>
        <span className="text-title-14-semibold text-black-70 truncate">
          만 {age}세 · {student.birth_year}년생
        </span>
      </div>

      <div className="hidden md:flex text-start">
        <span className="flex text-14-semibold text-black-100">
          아동 정보 카드
        </span>
      </div>

      <div className="grid grid-rows-2 gap-2 w-full flex-1 min-h-0">
        <div className="flex flex-col p-2 md:p-3 gap-1 rounded-xl w-full bg-primary-100 min-h-0 overflow-hidden">
          <div className="flex text-start items-center">
            <span className="flex text-title-14-semibold text-black-80">
              특이사항
            </span>
          </div>

          <div className="flex text-start items-center">
            <span className="flex text-12-regular text-black-100 line-clamp-2">
              {student.significant || "특이사항이 없습니다."}
            </span>
          </div>
        </div>

        <div className="flex flex-col p-2 md:p-3 gap-1 rounded-xl w-full bg-primary-100 min-h-0 overflow-hidden">
          <div className="flex text-start items-center">
            <span className="flex text-title-14-semibold text-black-80">
              학습목표
            </span>
          </div>

          <div className="flex text-start items-center">
            <span className="flex text-12-regular text-black-100 line-clamp-2">
              {student.learning_goal || "학습 목표가 없습니다."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
