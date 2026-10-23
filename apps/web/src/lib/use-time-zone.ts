'use client';

import { useSyncExternalStore } from 'react';
import { localTimeZone } from './date-time';

const SERVER_TIME_ZONE = 'UTC';
const noopSubscribe = () => () => undefined;

/** The viewer's IANA zone; UTC during server render so hydration matches. */
export const useTimeZone = (): string =>
  useSyncExternalStore(noopSubscribe, localTimeZone, () => SERVER_TIME_ZONE);
