import ChoiceUserSection from "../ui/sections/ChoiceUserSection";
import FirstCommentSection from "../ui/sections/FirstCommentSection";
import CalendarSection from "../ui/sections/CalendarSection";
import AddUserModal from "../ui/parts/AddUserModal";
import AddGroupModal from "../ui/parts/AddGroupModal";
import EditUserModal from "../ui/parts/EditUserModal";
import EditGroupModal from "../ui/parts/EditGroupModal";
import AddScheduleModal from "../ui/parts/AddScheduleModal";
import AuthModal from "@/shared/components/AuthModal";

const HomePage = () => {
  return (
    <>
      <div className="flex w-full px-10">
        <div className="flex flex-col w-full">
          {/* 상단 코멘트 영역 */}
          <FirstCommentSection />

          {/* 학습자 선택 영역 */}
          <ChoiceUserSection />

          {/* 주간 수업 계획표 영역 */}
          <CalendarSection />
        </div>
      </div>

      <AddUserModal />
      <AddGroupModal />
      <EditUserModal />
      <EditGroupModal />
      <AddScheduleModal />
      <AuthModal />
    </>
  );
};

export default HomePage;
