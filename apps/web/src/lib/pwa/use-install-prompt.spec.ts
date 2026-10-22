import { act, renderHook } from '@testing-library/react';
import { PWA_STORAGE_KEYS } from '@/constants/pwa';
import {
  type BeforeInstallPromptEvent,
  isIos,
  useInstallPrompt,
} from './use-install-prompt';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';

const setUserAgent = (ua: string, maxTouchPoints = 0) => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua);
  // jsdom does not implement maxTouchPoints.
  Object.defineProperty(navigator, 'maxTouchPoints', {
    value: maxTouchPoints,
    configurable: true,
  });
};

const setStandalone = (matches: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as never;
};

const promptEvent = (outcome: 'accepted' | 'dismissed' = 'accepted') => {
  const event = new Event('beforeinstallprompt', {
    cancelable: true,
  }) as BeforeInstallPromptEvent;
  Object.assign(event, {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  });
  return event;
};

describe('useInstallPrompt', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUserAgent(ANDROID_UA);
    setStandalone(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stays hidden until Chromium offers an install prompt', () => {
    const { result } = renderHook(() => useInstallPrompt(true));
    expect(result.current.mode).toBe('hidden');
    const event = promptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.mode).toBe('prompt');
  });

  it('shows the deferred prompt on install and hides afterwards', async () => {
    const { result } = renderHook(() => useInstallPrompt(true));
    const event = promptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    await act(() => result.current.install());
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(result.current.mode).toBe('hidden');
  });

  it('hides once the app is installed from the browser menu', () => {
    const { result } = renderHook(() => useInstallPrompt(true));
    act(() => {
      window.dispatchEvent(promptEvent());
    });
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(result.current.mode).toBe('hidden');
  });

  it('offers Add to Home Screen guidance on iOS, where the event never fires', () => {
    setUserAgent(IPHONE_UA, 5);
    const { result } = renderHook(() => useInstallPrompt(true));
    expect(result.current.mode).toBe('ios');
  });

  it('remembers a dismissal', () => {
    setUserAgent(IPHONE_UA, 5);
    const first = renderHook(() => useInstallPrompt(true));
    act(() => first.result.current.dismiss());
    expect(first.result.current.mode).toBe('hidden');
    expect(
      window.localStorage.getItem(PWA_STORAGE_KEYS.installDismissed),
    ).not.toBeNull();
    const second = renderHook(() => useInstallPrompt(true));
    expect(second.result.current.mode).toBe('hidden');
  });

  it('stays hidden when already running as an installed app', () => {
    setUserAgent(IPHONE_UA, 5);
    setStandalone(true);
    const { result } = renderHook(() => useInstallPrompt(true));
    act(() => {
      window.dispatchEvent(promptEvent());
    });
    expect(result.current.mode).toBe('hidden');
  });

  it('does nothing when PWA features are disabled', () => {
    const { result } = renderHook(() => useInstallPrompt(false));
    act(() => {
      window.dispatchEvent(promptEvent());
    });
    expect(result.current.mode).toBe('hidden');
  });
});

describe('isIos', () => {
  it('detects iPhone, and iPadOS behind a desktop Mac user agent', () => {
    expect(
      isIos({ userAgent: IPHONE_UA, maxTouchPoints: 5 } as Navigator),
    ).toBe(true);
    expect(isIos({ userAgent: MAC_UA, maxTouchPoints: 5 } as Navigator)).toBe(
      true,
    );
    expect(isIos({ userAgent: MAC_UA, maxTouchPoints: 0 } as Navigator)).toBe(
      false,
    );
    expect(
      isIos({ userAgent: ANDROID_UA, maxTouchPoints: 5 } as Navigator),
    ).toBe(false);
  });
});
