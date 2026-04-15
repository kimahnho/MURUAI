/**
 * 대시보드 — 세로 1컬럼: 인사말 → 검색 → 빠른만들기 → 최근자료 → 학습자.
 */
import { Plus } from "lucide-react";
import AddUserModal from "../AddUserModal";
import AddGroupModal from "../AddGroupModal";
import EditUserModal from "../EditUserModal";
import EditGroupModal from "../EditGroupModal";
import RecentDocumentsSection from "../RecentDocumentsSection";
import ChoiceUserSection from "../ChoiceUserSection";
import QuickCreateStrip from "./QuickCreateStrip";
import DashboardSearchBar from "./DashboardSearchBar";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";

const DashboardPage = () => {
  const { isCreatingDoc, createAndOpenDocument } = useCreateDocumentNavigation();

  const handleStart = async () => {
    await createAndOpenDocument({ replace: true });
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col px-4 pb-20 md:px-10">
        {/* 상단 인사말 + CTA */}
        <div className="flex items-start justify-between gap-4 pb-6 pt-8 md:items-center md:pb-8 md:pt-14">
          <div className="flex flex-col gap-1">
            <h1 className="text-title-22-semibold text-black-90 md:text-headline-28-bold">
              안녕하세요! 오늘은 어떤 자료를 만들어볼까요?
            </h1>
            <p className="text-14-regular text-black-55 md:text-15-regular">
              빈 문서로 시작하거나 템플릿을 선택해보세요.
            </p>
          </div>
          <button
            onClick={handleStart}
            disabled={isCreatingDoc}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-14-semibold text-white-100 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer md:text-title-16-semibold"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">새 학습자료 만들기</span>
            <span className="sm:hidden">새 자료</span>
          </button>
        </div>

        {/* 세로 1컬럼 스택 */}
        <div className="flex flex-col gap-8 md:gap-10">
          <DashboardSearchBar />
          <QuickCreateStrip />
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
