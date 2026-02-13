import { lazy, Suspense } from "react";
import type { OutletContext } from "@/features/editor/shared/MainSection";
import { useOutletContext } from "react-router-dom";
import "@/features/editor/styles/editor-fonts.css";

const MainSection = lazy(
  () => import("@/features/editor/shared/MainSection"),
);
const SideBar = lazy(() => import("@/features/editor/sections/sidebar/SideBar"));

const DesignPage = () => {
  const { loadedDocumentId } = useOutletContext<OutletContext>();
  return (
    <div className="flex h-full w-full overflow-hidden">
      <Suspense fallback={<div className="w-20 shrink-0" />}>
        <SideBar />
      </Suspense>
      <Suspense fallback={<div className="flex-1" />}>
        <MainSection key={loadedDocumentId ?? "new"} />
      </Suspense>
    </div>
  );
};

export default DesignPage;
