import { create } from "zustand";

export type Emotion = "neutral" | "happy" | "sad" | "angry";

type EmotionState = {
  emotion: Emotion;
  setEmotion: (e: Emotion) => void;
};

export const useEmotionStore = create<EmotionState>((set) => ({
  emotion: "neutral",
  setEmotion: (emotion) => set({ emotion }),
}));
