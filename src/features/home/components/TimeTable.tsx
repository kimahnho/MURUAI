import { useState, useEffect } from "react";
import { getWeekDays } from "../utils/dateUtils";
import { scheduleModel, type Schedule } from "../model/schedule.model";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useModalStore } from "@/shared/store/useModalStore";
import { useScheduleStore } from "../store/useScheduleStore";

interface TimeTableProps {
  weekOffset: number;
}

const TimeTable = ({ weekOffset }: TimeTableProps) => {
  const days = getWeekDays(weekOffset);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const { isAuthenticated } = useAuthStore();
  const { openModal, openAddScheduleModal } = useModalStore();
  const { setEditingSchedule } = useScheduleStore();

  const handleScheduleClick = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    openAddScheduleModal();
  };

  // 주간 시작일과 종료일 계산
  const getWeekDateRange = (offset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset + offset * 7);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    return {
      startDate: formatDate(monday),
      endDate: formatDate(sunday),
    };
  };

  // 일정 불러오기
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!isAuthenticated) {
        setSchedules([]);
        return;
      }

      const { startDate, endDate } = getWeekDateRange(weekOffset);
      console.log("📅 주간 범위:", { startDate, endDate });

      const { data, error } = await scheduleModel.getByDateRange(startDate, endDate);

      if (error) {
        console.error("❌ 일정 불러오기 실패:", error);
      }

      if (data) {
        console.log("✅ 불러온 일정:", data);
        setSchedules(data);
      } else {
        console.log("⚠️ 일정 없음");
        setSchedules([]);
      }
    };

    fetchSchedules();
  }, [isAuthenticated, weekOffset, openModal]); // openModal이 변경될 때마다 다시 불러오기

  // 시간 라벨 (08:00 ~ 20:00)
  const timeLabels = Array.from({ length: 13 }, (_, i) => {
    const hour = 8 + i;
    return `${hour.toString().padStart(2, "0")}:00`;
  });

  // 타임 슬롯 박스 (12개)
  const timeSlots = Array.from({ length: 12 }, (_, i) => i);

  // 일정의 위치와 높이 계산
  const getScheduleStyle = (schedule: Schedule, columnIndex: number, totalColumns: number) => {
    const startHour = parseInt(schedule.start_time.split(":")[0]);
    const startMinute = parseInt(schedule.start_time.split(":")[1]);
    const endHour = parseInt(schedule.end_time.split(":")[0]);
    const endMinute = parseInt(schedule.end_time.split(":")[1]);

    // 8시를 기준(0)으로 한 시간 오프셋
    const startOffset = (startHour - 8) + (startMinute / 60);
    const endOffset = (endHour - 8) + (endMinute / 60);
    const duration = endOffset - startOffset;

    // 픽셀 단위로 변환 (1시간 = 64px)
    const top = startOffset * 64;
    const height = duration * 64;

    // 겹치는 일정이 있을 때 너비와 위치 계산
    const widthPercent = 100 / totalColumns;
    const leftPercent = (100 / totalColumns) * columnIndex;

    return {
      top: `${top}px`,
      height: `${height}px`,
      width: `${widthPercent}%`,
      left: `${leftPercent}%`,
    };
  };

  // 시간이 겹치는지 확인하는 함수
  const isTimeOverlapping = (schedule1: Schedule, schedule2: Schedule) => {
    const start1 = schedule1.start_time;
    const end1 = schedule1.end_time;
    const start2 = schedule2.start_time;
    const end2 = schedule2.end_time;

    // 시간 범위가 겹치는지 확인
    return start1 < end2 && start2 < end1;
  };

  // 겹치는 일정들을 그룹화하는 함수
  const groupOverlappingSchedules = (schedules: Schedule[]) => {
    if (schedules.length === 0) return [];

    const groups: Schedule[][] = [];
    const used = new Set<string>();

    schedules.forEach((schedule) => {
      if (used.has(schedule.id!)) return;

      const group = [schedule];
      used.add(schedule.id!);

      // 현재 일정과 겹치는 다른 일정들 찾기
      schedules.forEach((other) => {
        if (used.has(other.id!)) return;
        if (isTimeOverlapping(schedule, other)) {
          group.push(other);
          used.add(other.id!);
        }
      });

      groups.push(group);
    });

    return groups;
  };

  return (
    <div className="flex w-full overflow-auto rounded-2xl border border-black-30 bg-white-100">
      {/* 시간 레이블 영역 */}
      <div className="sticky left-0 z-10 flex w-20 shrink-0 flex-col border-r border-black-20 bg-white-100">
        {/* 헤더 (빈 공간) */}
        <div className="h-14" />
        {/* 상단 여백 */}
        <div className="h-4" />
        {/* 시간 라벨 (12개 박스의 시작점) */}
        {timeSlots.map((_, timeIndex) => (
          <div key={timeIndex} className="relative h-16">
            <span className="absolute top-0 right-2 -translate-y-1/2 text-title-16-semibold text-black-60 tabular-nums">
              {timeLabels[timeIndex]}
            </span>
          </div>
        ))}
        {/* 마지막 시간 라벨 (20:00) */}
        <div className="relative h-0">
          <span className="absolute top-0 right-2 -translate-y-1/2 text-title-16-semibold text-black-60 tabular-nums">
            {timeLabels[12]}
          </span>
        </div>
        {/* 하단 여백 */}
        <div className="h-8" />
      </div>

      {/* 요일 및 타임 그리드 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 헤더 (요일 및 날짜) */}
        <div className="grid grid-cols-7 border-b border-black-20">
          {days.map((day, index) => (
            <div
              key={index}
              className="flex h-14 items-center justify-center border-r border-black-20 last:border-r-0"
            >
              <span className="text-title-16-semibold text-black-100 tabular-nums">
                {day.day} {day.date}
              </span>
            </div>
          ))}
        </div>

        {/* 상단 여백 */}
        <div className="grid grid-cols-7 h-4 border-b border-black-20">
          {days.map((_, dayIndex) => (
            <div
              key={dayIndex}
              className="border-r border-black-20 last:border-r-0"
            />
          ))}
        </div>

        {/* 타임 슬롯 박스 (12개) */}
        <div className="relative">
          {/* 그리드 배경 */}
          {timeSlots.map((_, timeIndex) => (
            <div
              key={timeIndex}
              className="grid grid-cols-7 h-16 border-b border-black-20"
            >
              {days.map((_, dayIndex) => (
                <div
                  key={dayIndex}
                  className="cursor-pointer border-r border-black-20 transition hover:bg-black-5 last:border-r-0"
                />
              ))}
            </div>
          ))}

          {/* 일정 오버레이 */}
          <div className="absolute inset-0 grid grid-cols-7">
            {days.map((day, dayIndex) => {
              const { startDate } = getWeekDateRange(weekOffset);
              const monday = new Date(startDate);
              const currentDate = new Date(monday);
              currentDate.setDate(monday.getDate() + dayIndex);
              const dateStr = currentDate.toISOString().split("T")[0];

              // 해당 날짜의 일정 필터링
              const daySchedules = schedules.filter(
                (schedule) =>
                  schedule.start_date <= dateStr && schedule.end_date >= dateStr
              );

              if (daySchedules.length > 0) {
                console.log(`📌 ${dateStr} (${day.day})의 일정:`, daySchedules);
              }

              return (
                <div key={dayIndex} className="relative border-r border-black-20 last:border-r-0">
                  {(() => {
                    // 겹치는 일정들을 그룹화
                    const overlappingGroups = groupOverlappingSchedules(daySchedules);

                    return overlappingGroups.flatMap((group) => {
                      const totalColumns = group.length;

                      return group.map((schedule, columnIndex) => {
                        const style = getScheduleStyle(schedule, columnIndex, totalColumns);
                        console.log(`🎨 일정 스타일 (${schedule.title}):`, style);

                        // 학생 또는 그룹 이름 가져오기
                        const targetName = schedule.target_type === "individual"
                          ? schedule.students_n?.name
                          : schedule.groups_n?.name;

                        return (
                          <div
                            key={schedule.id}
                            className="absolute rounded-lg bg-blue-500 p-2 text-white-100 shadow-md cursor-pointer transition hover:bg-blue-600 overflow-hidden"
                            style={style}
                            onClick={() => { handleScheduleClick(schedule); }}
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-title-12-semibold truncate">
                                {schedule.title}
                              </span>
                              {targetName && (
                                <span className="text-10-regular opacity-90 truncate">
                                  {targetName}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    });
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* 하단 여백 */}
        <div className="grid grid-cols-7 h-8">
          {days.map((_, dayIndex) => (
            <div
              key={dayIndex}
              className="border-r border-black-20 last:border-r-0"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimeTable;
