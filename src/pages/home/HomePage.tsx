import ChoiceUserSection from "@/features/home/components/ChoiceUserSection";
import FirstCommentSection from "@/features/home/components/FirstCommentSection";
import CalendarSection from "@/features/home/components/CalendarSection";
import AddUserModal from "@/features/home/components/AddUserModal";
import AddGroupModal from "@/features/home/components/AddGroupModal";
import EditUserModal from "@/features/home/components/EditUserModal";
import EditGroupModal from "@/features/home/components/EditGroupModal";
import AddScheduleModal from "@/features/home/components/AddScheduleModal";
import AuthModal from "@/shared/ui/AuthModal";

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
