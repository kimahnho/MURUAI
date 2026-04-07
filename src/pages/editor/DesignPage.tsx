import { lazy, Suspense } from "react";
import type { OutletContext } from "@/features/editor/shared/MainSection";
import { useOutletContext } from "react-router-dom";
import { useAuthStore } from "@/shared/store/useAuthStore";
import "@/features/editor/styles/editor-fonts.css";

const MainSection = lazy(
  () => import("@/features/editor/shared/MainSection"),
);
const SideBar = lazy(() => import("@/features/editor/sections/sidebar/SideBar"));
const WorksheetRightPanel = lazy(
  () => import("@/features/editor/sections/rightpanel/WorksheetRightPanel"),
);
const StudioRecordingSection = lazy(
  () => import("./StudioRecordingSection"),
);

const DesignPage = () => {
  const { loadedDocumentId } = useOutletContext<OutletContext>();
  const role = useAuthStore((s) => s.role);

  const isTester = role === "tester" || role === "admin";

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Suspense fallback={<div className="w-20 shrink-0" />}>
        <SideBar />
      </Suspense>
      <Suspense fallback={<div className="flex-1" />}>
        <MainSection key={loadedDocumentId ?? "new"} />
      </Suspense>

      {/* 학습자료 컴포넌트 편집 오른쪽 패널 */}
      <Suspense fallback={null}>
        <WorksheetRightPanel />
      </Suspense>

      {/* tester 녹화 종료 후 평가 패널 — 캔버스 우측 하단 */}
      {isTester && (
        <Suspense fallback={null}>
          <StudioRecordingSection />
        </Suspense>
      )}
    </div>
  );
};

export default DesignPage;
