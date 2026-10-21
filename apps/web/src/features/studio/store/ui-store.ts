import type { Locale, Persona, ReplaySpeed } from '@matchiq/contracts';
import { create } from 'zustand';

/** Ephemeral presentation state; never holds server data. */
export type StudioUiState = {
  persona: Persona;
  locale: Locale;
  selectedInsightId: string | null;
  speed: ReplaySpeed;
  setPersona: (persona: Persona) => void;
  setLocale: (locale: Locale) => void;
  openEvidence: (insightId: string) => void;
  closeEvidence: () => void;
  setSpeed: (speed: ReplaySpeed) => void;
};

export const STUDIO_UI_DEFAULTS = {
  persona: 'BROADCAST',
  locale: 'en-GB',
  selectedInsightId: null,
  speed: 20,
} as const satisfies Partial<StudioUiState>;

export const useStudioUi = create<StudioUiState>()((set) => ({
  ...STUDIO_UI_DEFAULTS,
  setPersona: (persona) => set({ persona }),
  setLocale: (locale) => set({ locale }),
  openEvidence: (selectedInsightId) => set({ selectedInsightId }),
  closeEvidence: () => set({ selectedInsightId: null }),
  setSpeed: (speed) => set({ speed }),
}));
