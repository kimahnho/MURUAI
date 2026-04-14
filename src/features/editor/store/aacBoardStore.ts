/**
 * AAC 보드 생성 요청과 관련 설정 상태를 관리하는 스토어 모듈.
 */
import { create } from "zustand";
import type { AacBoardConfig } from "../utils/aacBoardUtils";
import { mp } from "@/shared/utils/mixpanel";
import { trackInteraction } from "@/shared/utils/trackInteraction";

interface AacBoardStore {
  requestId: number;
  config: AacBoardConfig | null;
  requestBoard: (config: AacBoardConfig) => void;
}

export const useAacBoardStore = create<AacBoardStore>((set) => ({
  requestId: 0,
  config: null,
  requestBoard: (config) =>
    { mp.track("AAC 보드 생성", { rows: config.rows, columns: config.columns });
      trackInteraction({ category: "template", action: "aac_board_apply", metadata: { rows: config.rows, columns: config.columns } });
      set((state) => ({
      requestId: state.requestId + 1,
      config,
    })); },
}));
