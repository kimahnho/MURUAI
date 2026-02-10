import MainSection, { type OutletContext } from "@/features/editor/components/MainSection";
import SideBar from "@/features/editor/components/SideBar";
import { useOutletContext } from "react-router-dom";

const DesignPage = () => {
  const { loadedDocumentId } = useOutletContext<OutletContext>();
  return (
    <div className="flex h-full w-full overflow-hidden">
      <SideBar />
      <MainSection key={loadedDocumentId ?? "new"} />
    </div>
  );
};

export default DesignPage;
