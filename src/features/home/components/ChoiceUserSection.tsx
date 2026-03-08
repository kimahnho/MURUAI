/**
 * 학생 선택 목록과 선택 상태 전환 UI를 제공하는 컴포넌트.
 */
import {
  PlusCircleIcon,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import UserCard from "./UserCard";
import GroupCard from "./GroupCard";
import { useModalStore } from "@/shared/store/useModalStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useStudentStore } from "../store/useStudentStore";

const ChoiceUserSection = () => {
  const [lessonType, setLessonType] = useState<"individual" | "group">(
    "individual"
  );
  const [currentStudentPage, setCurrentStudentPage] = useState(0);
  const [currentGroupPage, setCurrentGroupPage] = useState(0);
  const {
    openAddUserModal,
    openAddGroupModal,
    openEditUserModal,
    openEditGroupModal,
    openAuthModal,
  } = useModalStore();
  const { isAuthenticated } = useAuthStore();

  // Store에서 데이터 가져오기
  const { students, groups, fetchAll, clear } = useStudentStore();

  // 인증 상태에 따라 데이터 로드
  useEffect(() => {
    if (!isAuthenticated) {
      clear();
      return;
    }

    // 캐시된 데이터가 있으면 즉시 표시되고, 백그라운드에서 새로고침
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleAddClick = () => {
    if (!isAuthenticated) {
      openAuthModal();
      return;
    }
    if (lessonType === "individual") {
      openAddUserModal();
    } else {
      openAddGroupModal();
    }
  };

  // 캐러셀 로직 (개별 아동/그룹 모드 공통)
  const itemsPerPage = 4; // grid-cols-5에서 추가 버튼 1개를 제외한 4개
  const totalStudentPages = Math.ceil(students.length / itemsPerPage);
  const totalGroupPages = Math.ceil(groups.length / itemsPerPage);
  const currentStudents = students.slice(
    currentStudentPage * itemsPerPage,
    (currentStudentPage + 1) * itemsPerPage
  );
  const currentGroups = groups.slice(
    currentGroupPage * itemsPerPage,
    (currentGroupPage + 1) * itemsPerPage
  );

  const handleStudentPrev = () => {
    setCurrentStudentPage((prev) =>
      prev > 0 ? prev - 1 : totalStudentPages - 1
    );
  };

  const handleStudentNext = () => {
    setCurrentStudentPage((prev) =>
      prev < totalStudentPages - 1 ? prev + 1 : 0
    );
  };

  const handleStudentPageChange = (page: number) => {
    setCurrentStudentPage(page);
  };

  const handleGroupPrev = () => {
    setCurrentGroupPage((prev) => (prev > 0 ? prev - 1 : totalGroupPages - 1));
  };

  const handleGroupNext = () => {
    setCurrentGroupPage((prev) => (prev < totalGroupPages - 1 ? prev + 1 : 0));
  };

  const handleGroupPageChange = (page: number) => {
    setCurrentGroupPage(page);
  };

  const showCarousel = lessonType === "individual" && students.length > 4;
  const showGroupCarousel = lessonType === "group" && groups.length > 4;

  if (!isAuthenticated) return null;

  return (
    <section className="flex flex-col w-full px-10 gap-10">
      <div className="flex flex-col w-full gap-10 items-center justify-center">
        <div className="flex flex-col itme-center justify-center">
          <span className="flex text-title-22-semibold items-center justify-center text-center">
            개별 아동 또는 그룹 수업을 선택하여 맞춤형 수업 자료를 만들어보세요.
          </span>
        </div>

        <div className="flex w-full items-center justify-center">
          <div className="flex items-center gap-1 rounded-full border border-black-20 bg-black-10 p-1">
            <button
              type="button"
              aria-pressed={lessonType === "individual"}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2 text-title-16-semibold cursor-pointer transition ${
                lessonType === "individual"
                  ? "bg-white-100 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
              onClick={() => { setLessonType("individual"); }}
            >
              <User className="h-4 w-4" aria-hidden="true" />
              개별 아동
            </button>
            <button
              type="button"
              aria-pressed={lessonType === "group"}
              className={`flex items-center justify-center gap-2 rounded-full px-5 py-2 text-title-16-semibold cursor-pointer transition ${
                lessonType === "group"
                  ? "bg-white-100 text-black-100 shadow-sm"
                  : "text-black-70 hover:bg-black-15"
              }`}
              onClick={() => { setLessonType("group"); }}
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              그룹 수업
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col w-full gap-3" key={lessonType}>
        {showCarousel ? (
          // 캐러셀 모드 (학생이 5명 이상일 때)
          <>
            <div className="grid w-full h-auto grid-cols-5 gap-5 overflow-hidden">
              {/* 추가하기 버튼 */}
              <button
                type="button"
                onClick={handleAddClick}
                className="group relative flex flex-col h-85 rounded-xl items-center justify-center border-2 border-dashed border-black-30 bg-black-5 p-6 transition hover:border-primary hover:shadow-sm cursor-pointer"
              >
                <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-black-10 opacity-60 blur-2xl" />
                <div className="flex flex-col gap-4 items-center justify-center">
                  <PlusCircleIcon className="icon-xl text-black-70 transition group-hover:text-primary" />
                  <span className="flex text-title-16-semibold text-black-60 transition group-hover:text-primary">
                    아동 추가하기
                  </span>
                </div>
              </button>

              {currentStudents.map((student, index) => (
                <div key={student.id} className="relative">
                  <UserCard
                    student={student}
                    onClick={() => {
                      if (!student.id) return;
                      openEditUserModal(student.id);
                    }}
                  />

                  {/* 첫 번째 학생 카드에 좌측 화살표 */}
                  {index === 0 && currentStudentPage > 0 && (
                    <button
                      onClick={handleStudentPrev}
                      className="absolute left-2 top-[calc(50%-1rem)] -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white-100/90 hover:bg-white-100 shadow-md transition-all"
                      aria-label="이전 아동"
                    >
                      <ChevronLeft className="icon-xs text-black-90" />
                    </button>
                  )}

                  {/* 마지막 학생 카드에 우측 화살표 */}
                  {index === currentStudents.length - 1 &&
                    currentStudentPage < totalStudentPages - 1 && (
                      <button
                        onClick={handleStudentNext}
                        className="absolute right-2 top-[calc(50%-1rem)] -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white-100/90 hover:bg-white-100 shadow-md transition-all"
                        aria-label="다음 아동"
                      >
                        <ChevronRight className="icon-xs text-black-90" />
                      </button>
                    )}
                </div>
              ))}
            </div>

            {/* 페이지 인디케이터 */}
            <div className="flex min-h-4 items-center justify-center gap-2">
              {Array.from({ length: totalStudentPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => { handleStudentPageChange(index); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStudentPage
                      ? "bg-primary w-6"
                      : "bg-black-30 hover:bg-black-40"
                  }`}
                  aria-label={`${index + 1}페이지로 이동`}
                />
              ))}
            </div>
          </>
        ) : showGroupCarousel ? (
          // 캐러셀 모드 (그룹이 5개 이상일 때)
          <>
            <div className="grid w-full h-auto grid-cols-5 gap-5 overflow-hidden">
              {/* 추가하기 버튼 */}
              <button
                type="button"
                onClick={handleAddClick}
                className="group relative flex flex-col h-85 rounded-xl items-center justify-center border-2 border-dashed border-black-30 bg-black-5 p-6 transition hover:border-primary hover:shadow-sm cursor-pointer"
              >
                <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-black-10 opacity-60 blur-2xl" />
                <div className="flex flex-col gap-4 items-center justify-center">
                  <PlusCircleIcon className="icon-xl text-black-70 transition group-hover:text-primary" />
                  <span className="flex text-title-16-semibold text-black-60 transition group-hover:text-primary">
                    그룹 추가하기
                  </span>
                </div>
              </button>

              {currentGroups.map((group, index) => (
                <div key={group.id} className="relative">
                  <GroupCard
                    group={group}
                    onClick={() => { openEditGroupModal(group.id); }}
                  />

                  {/* 첫 번째 그룹 카드에 좌측 화살표 */}
                  {index === 0 && currentGroupPage > 0 && (
                    <button
                      onClick={handleGroupPrev}
                      className="absolute left-2 top-[calc(50%-1rem)] -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white-100/90 hover:bg-white-100 shadow-md transition-all"
                      aria-label="이전 그룹"
                    >
                      <ChevronLeft className="icon-xs text-black-90" />
                    </button>
                  )}

                  {/* 마지막 그룹 카드에 우측 화살표 */}
                  {index === currentGroups.length - 1 &&
                    currentGroupPage < totalGroupPages - 1 && (
                      <button
                        onClick={handleGroupNext}
                        className="absolute right-2 top-[calc(50%-1rem)] -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-white-100/90 hover:bg-white-100 shadow-md transition-all"
                        aria-label="다음 그룹"
                      >
                        <ChevronRight className="icon-xs text-black-90" />
                      </button>
                    )}
                </div>
              ))}
            </div>

            {/* 페이지 인디케이터 */}
            <div className="flex min-h-4 items-center justify-center gap-2">
              {Array.from({ length: totalGroupPages }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => { handleGroupPageChange(index); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentGroupPage
                      ? "bg-primary w-6"
                      : "bg-black-30 hover:bg-black-40"
                  }`}
                  aria-label={`${index + 1}페이지로 이동`}
                />
              ))}
            </div>
          </>
        ) : (
          // 일반 모드 (학생이 4명 이하이거나 그룹 모드일 때)
          <>
            <div className="grid w-full h-auto grid-cols-5 gap-5">
              {/* 추가하기 버튼 */}
              <button
                type="button"
                onClick={handleAddClick}
                className="group relative flex flex-col h-85 rounded-xl items-center justify-center border-2 border-dashed border-black-30 bg-black-5 p-6 transition hover:border-primary hover:shadow-sm cursor-pointer"
              >
                <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-black-10 opacity-60 blur-2xl" />
                <div className="flex flex-col gap-4 items-center justify-center">
                  <PlusCircleIcon className="icon-xl text-black-70 transition group-hover:text-primary" />
                  <span className="flex text-title-16-semibold text-black-60 transition group-hover:text-primary">
                    {lessonType === "individual"
                      ? "아동 추가하기"
                      : "그룹 추가하기"}
                  </span>
                </div>
              </button>

              {lessonType === "individual" ? (
                <>
                  {students.map((student) => (
                    <UserCard
                      key={student.id}
                      student={student}
                      onClick={() => {
                        if (!student.id) return;
                        openEditUserModal(student.id);
                      }}
                    />
                  ))}
                </>
              ) : (
                <>
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onClick={() => { openEditGroupModal(group.id); }}
                    />
                  ))}
                </>
              )}
            </div>
            <div
              className="flex min-h-4 items-center justify-center gap-2"
              aria-hidden="true"
            />
          </>
        )}
      </div>
    </section>
  );
};

export default ChoiceUserSection;
