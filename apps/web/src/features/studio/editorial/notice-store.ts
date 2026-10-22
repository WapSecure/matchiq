import { create } from 'zustand';

export type Notice = { id: number; text: string; changed: boolean };

type NoticeState = {
  notice: Notice | null;
  show: (text: string, changed: boolean) => void;
  dismiss: () => void;
};

/** The latest command outcome; one at a time, so nothing stacks over the console. */
export const useEditorialNotice = create<NoticeState>()((set) => ({
  notice: null,
  show: (text, changed) =>
    set((state) => ({
      notice: { id: (state.notice?.id ?? 0) + 1, text, changed },
    })),
  dismiss: () => set({ notice: null }),
}));
