/**
 * 대시보드 — 상단 인사말 + 좌우 스플릿 (만들기 | 내 자료).
 */
import { Plus } from "lucide-react";
import AddUserModal from "../AddUserModal";
import AddGroupModal from "../AddGroupModal";
import EditUserModal from "../EditUserModal";
import EditGroupModal from "../EditGroupModal";
import RecentDocumentsSection from "../RecentDocumentsSection";
import ChoiceUserSection from "../ChoiceUserSection";
import QuickStartSection from "./QuickStartSection";
import AiFeatureSection from "./AiFeatureSection";
import { useCreateDocumentNavigation } from "@/features/editor/hooks/useCreateDocumentNavigation";

const DashboardPage = () => {
  const { isCreatingDoc, createAndOpenDocument } = useCreateDocumentNavigation();

  const handleStart = async () => {
    await createAndOpenDocument({ replace: true });
  };

  return (
    <>
      <div className="flex w-full flex-col px-4 md:px-10 pb-20">
        {/* 상단 인사말 + CTA */}
        <div className="flex items-start md:items-center justify-between gap-4 pt-8 md:pt-14 pb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-title-22-semibold md:text-headline-28-bold text-black-90">
              안녕하세요! 오늘은 어떤 자료를 만들어볼까요?
            </h1>
            <p className="text-15-regular md:text-16-regular text-black-60">
              빈 문서로 시작하거나 템플릿을 선택해보세요.
            </p>
          </div>
          <button
            onClick={handleStart}
            disabled={isCreatingDoc}
            className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-14-semibold md:text-title-16-semibold text-white-100 shadow-md transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            style={{ background: "linear-gradient(135deg, #7C3AED, #8b5cf6)" }}
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">새 학습자료 만들기</span>
            <span className="sm:hidden">새 자료</span>
          </button>
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
