import ChoiceUserSection from "@/features/home/components/ChoiceUserSection";
import FirstCommentSection from "@/features/home/components/FirstCommentSection";
import RecentDocumentsSection from "@/features/home/components/RecentDocumentsSection";
import AddUserModal from "@/features/home/components/AddUserModal";
import AddGroupModal from "@/features/home/components/AddGroupModal";
import EditUserModal from "@/features/home/components/EditUserModal";
import EditGroupModal from "@/features/home/components/EditGroupModal";
import AuthModal from "@/shared/ui/AuthModal";

const HomePage = () => {
  return (
    <>
      <div className="flex w-full px-10">
        <div className="flex flex-col w-full gap-10 pb-20">
          {/* 상단 코멘트 영역 */}
          <FirstCommentSection />

          {/* 최근 작업한 학습자료 */}
          <RecentDocumentsSection />

          {/* 개별 아동 / 그룹 수업 선택 영역 */}
          <ChoiceUserSection />
        </div>
      </div>

      <AddUserModal />
      <AddGroupModal />
      <EditUserModal />
      <EditGroupModal />
      <AuthModal />
    </>
  );
};

export default HomePage;
