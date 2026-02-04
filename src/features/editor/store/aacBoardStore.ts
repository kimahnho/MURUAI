import { create } from "zustand";
import type { AacBoardConfig } from "../utils/aacBoardUtils";
import { mp } from "@/shared/lib/mixpanel";

interface AacBoardStore {
  requestId: number;
  config: AacBoardConfig | null;
  requestBoard: (config: AacBoardConfig) => void;
}

export const useAacBoardStore = create<AacBoardStore>((set) => ({
  requestId: 0,
  config: null,
  requestBoard: (config) =>
    { mp.track("aac_board_created", { rows: config.rows, columns: config.columns });
      set((state) => ({
      requestId: state.requestId + 1,
      config,
    })); },
}));
