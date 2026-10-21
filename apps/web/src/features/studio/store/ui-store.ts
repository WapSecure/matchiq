import type { Locale, Persona, ReplaySpeed } from '@matchiq/contracts';
import { create } from 'zustand';
import type { CueHold } from '@/constants/overlay';

/** Ephemeral presentation state; never holds server data. */
export type StudioUiState = {
  persona: Persona;
  locale: Locale;
  selectedInsightId: string | null;
  speed: ReplaySpeed;
  cueHold: CueHold;
  setPersona: (persona: Persona) => void;
  setLocale: (locale: Locale) => void;
  openEvidence: (insightId: string) => void;
  closeEvidence: () => void;
  setSpeed: (speed: ReplaySpeed) => void;
  setCueHold: (cueHold: CueHold) => void;
};

export const STUDIO_UI_DEFAULTS = {
  persona: 'BROADCAST',
  locale: 'en-GB',
  selectedInsightId: null,
  speed: 20,
  cueHold: 'standard',
} as const satisfies Partial<StudioUiState>;

export const useStudioUi = create<StudioUiState>()((set) => ({
  ...STUDIO_UI_DEFAULTS,
  setPersona: (persona) => set({ persona }),
  setLocale: (locale) => set({ locale }),
  openEvidence: (selectedInsightId) => set({ selectedInsightId }),
  closeEvidence: () => set({ selectedInsightId: null }),
  setSpeed: (speed) => set({ speed }),
  setCueHold: (cueHold) => set({ cueHold }),
}));
