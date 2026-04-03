/** JSON 내보내기 유틸 */
import type { WorksheetComponent } from "../model/types";

export const buildExportJson = (components: WorksheetComponent[]) => {
  const pid = `page_${crypto.randomUUID().slice(0, 8)}`;
  return {
    pages: [
      {
        page_id: pid,
        page_type: "activity",
        components: components.map((c, i) => ({
          component_type: c.type,
          config: c.config,
          layout_position: i === 0 ? "top" : i === components.length - 1 ? "bottom" : "center",
        })),
      },
    ],
  };
};
