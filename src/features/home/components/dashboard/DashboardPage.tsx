/**
 * 대시보드 — 인증된 사용자의 작업 허브 (빠른 시작, AI 기능, 최근 자료, 아동/그룹 관리).
 */
import AddUserModal from "../AddUserModal";
import AddGroupModal from "../AddGroupModal";
import EditUserModal from "../EditUserModal";
import EditGroupModal from "../EditGroupModal";
import RecentDocumentsSection from "../RecentDocumentsSection";
import ChoiceUserSection from "../ChoiceUserSection";
import QuickStartSection from "./QuickStartSection";
import AiFeatureSection from "./AiFeatureSection";

const DashboardPage = () => {
  return (
    <>
      <div className="flex w-full px-4 md:px-10">
        <div className="flex flex-col w-full gap-6 md:gap-10 pb-20">
          <QuickStartSection />
          <AiFeatureSection />
          <RecentDocumentsSection />
          <ChoiceUserSection />
        </div>
      </div>

      <AddUserModal />
      <AddGroupModal />
      <EditUserModal />
      <EditGroupModal />
    </>
  );
};

export default DashboardPage;
