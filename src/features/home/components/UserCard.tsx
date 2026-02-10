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
      className={`flex flex-col h-85 rounded-xl border border-black-30 p-4 gap-4 ${
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
      <div className="flex flex-col text-start gap-1">
        <span className="flex text-title-20-semibold text-black">
          {student.name}
        </span>
        <span className="flex text-title-14-semibold text-black-70">
          만 {age}세 · {student.birth_year}년생
        </span>
      </div>

      <div className="flex text-start">
        <span className="flex text-14-semibold text-black-100">
          아동 정보 카드
        </span>
      </div>

      <div className="grid grid-rows-2 gap-2 w-full h-full">
        <div className="flex flex-col p-3 gap-1 rounded-xl w-full bg-[#5500ff]/10">
          <div className="flex text-start items-center">
            <span className="flex text-title-14-semibold text-black-80">
              특이사항
            </span>
          </div>

          <div className="flex text-start items-center">
            <span className="flex text-12-regular text-black-100">
              {student.significant || "특이사항이 없습니다."}
            </span>
          </div>
        </div>

        <div className="flex flex-col p-3 gap-1 rounded-xl w-full bg-[#5500ff]/10">
          <div className="flex text-start items-center">
            <span className="flex text-title-14-semibold text-black-80">
              학습목표
            </span>
          </div>

          <div className="flex text-start items-center">
            <span className="flex text-12-regular text-black-100">
              {student.learning_goal || "학습 목표가 없습니다."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
