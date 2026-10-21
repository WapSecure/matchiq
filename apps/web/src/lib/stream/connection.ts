export const CONNECTION_STATES = [
  'connecting',
  'live',
  'reconnecting',
  'stale',
  'offline',
] as const;

export type ConnectionState = (typeof CONNECTION_STATES)[number];

export type ConnectionStatus = {
  state: ConnectionState;
  /** Consecutive failed connection attempts since the last healthy message. */
  attempt: number;
  /** Delay before the next reconnect, when one is scheduled. */
  retryInMs: number | null;
  lastMessageAt: number | null;
  lastStreamSequence: number | null;
};

export const INITIAL_CONNECTION: ConnectionStatus = {
  state: 'connecting',
  attempt: 0,
  retryInMs: null,
  lastMessageAt: null,
  lastStreamSequence: null,
};

export type NetworkMonitor = {
  isOnline: () => boolean;
  subscribe: (onChange: (online: boolean) => void) => () => void;
};

const noop = (): void => undefined;

export const browserNetworkMonitor: NetworkMonitor = {
  isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  subscribe: (onChange) => {
    if (typeof window === 'undefined') return noop;
    const online = () => onChange(true);
    const offline = () => onChange(false);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  },
};
