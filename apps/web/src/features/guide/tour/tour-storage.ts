import { TOUR_STORAGE_KEY } from '@/constants/guide';

const DISMISSED = 'dismissed';

/** Storage can be blocked (private mode, quotas): every access is guarded. */
export const readTourDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(TOUR_STORAGE_KEY) === DISMISSED;
  } catch {
    return false;
  }
};

export const writeTourDismissed = (): void => {
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, DISMISSED);
  } catch {
    /* The tour still closes for this page view. */
  }
};
