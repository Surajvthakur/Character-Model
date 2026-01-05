import { create } from "zustand";

type PoseState = {
  landmarks: any[] | null;
  setLandmarks: (l: any[]) => void;
};

export const usePoseStore = create<PoseState>((set) => ({
  landmarks: null,
  setLandmarks: (landmarks) => set({ landmarks }),
}));
