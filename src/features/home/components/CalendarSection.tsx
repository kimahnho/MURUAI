/**
 * 달력 기반 일정 조회와 날짜 선택 상호작용을 제공하는 컴포넌트.
 */
import { Calendar, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { getWeekRange } from "../utils/dateUtils";
import { useModalStore } from "@/shared/store/useModalStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import TimeTable from "./TimeTable";

const CalendarSection = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const { openAddScheduleModal, openAuthModal } = useModalStore();
  const { isAuthenticated } = useAuthStore();

  const handleAddScheduleClick = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    openAddScheduleModal();
  };

  return (
    <div className="flex flex-col w-full p-10 gap-10">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <div className="flex p-3 items-center justify-center bg-[#5500ff]/10 rounded-xl">
            <Calendar className="icons-m text-primary" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="flex text-headline-22-bold items-center text-black-100">
              주간 수업 계획표
            </span>
            <span className="flex text-title-18-semibold items-center text-black-80 tabular-nums">
              {getWeekRange(weekOffset)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 주 변경 버튼 */}
          <div className="flex items-center shadow-sm rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => { setWeekOffset((prev) => prev - 1); }}
              className="flex items-center justify-center px-3 py-2 border border-black-30 text-black-70 bg-white-100 transition hover:bg-black-10 hover:text-black-100"
              aria-label="이전 주"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => { setWeekOffset(0); }}
              className="px-4 py-2 border-t border-b border-black-30 text-title-14-semibold text-black-70 bg-white-100 transition hover:bg-black-10 hover:text-black-100"
            >
              오늘
            </button>
            <button
              type="button"
              onClick={() => { setWeekOffset((prev) => prev + 1); }}
              className="flex items-center justify-center px-3 py-2 border border-black-30 text-black-70 bg-white-100 transition hover:bg-black-10 hover:text-black-100"
              aria-label="다음 주"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* 일정 등록 버튼 */}
          <button
            type="button"
            onClick={handleAddScheduleClick}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white-100 text-title-14-semibold shadow-md transition hover:bg-primary/90 hover:shadow-lg"
          >
            <Plus className="h-5 w-5" />
            일정 등록
          </button>
        </div>
      </div>

      <TimeTable weekOffset={weekOffset} />
    </div>
  );
};

export default CalendarSection;
