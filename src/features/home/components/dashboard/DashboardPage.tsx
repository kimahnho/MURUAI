/**
 * 대시보드 — 상단 인사말 + 좌우 스플릿 (만들기 | 내 자료).
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
      <div className="flex w-full flex-col px-4 md:px-10 pb-20">
        {/* 상단 인사말 */}
        <div className="flex flex-col gap-2 pt-8 md:pt-14 pb-8">
          <h1 className="text-title-22-semibold md:text-headline-28-bold text-black-90">
            안녕하세요! 오늘은 어떤 자료를 만들어볼까요?
          </h1>
          <p className="text-15-regular md:text-16-regular text-black-60">
            빈 문서로 시작하거나 템플릿을 선택해보세요.
          </p>
        </div>

        {/* 좌우 스플릿 (모바일: 세로 1열) */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          {/* 왼쪽: 만들기 영역 */}
          <div className="flex flex-col gap-8 lg:flex-1 min-w-0">
            <QuickStartSection />
            <AiFeatureSection />
          </div>

          {/* 오른쪽: 내 자료 영역 */}
          <div className="flex flex-col gap-8 lg:flex-1 min-w-0">
            <RecentDocumentsSection />
            <ChoiceUserSection />
          </div>
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
