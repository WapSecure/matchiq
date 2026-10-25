import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Locale } from '@matchiq/contracts';
import { ListenButton } from './listen-button';
import { useSpeech } from './use-speech';

const voice = (lang: string) => ({ lang, name: lang }) as SpeechSynthesisVoice;
const VOICES = [voice('en-US'), voice('fr-FR'), voice('es-ES'), voice('en-GB')];

class FakeUtterance {
  voice: SpeechSynthesisVoice | null = null;
  lang = '';
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

const install = (voices: SpeechSynthesisVoice[]) => {
  const synth = {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  return synth;
};

const uttered = (synth: ReturnType<typeof install>) =>
  synth.speak.mock.calls.at(-1)?.[0] as FakeUtterance;

afterEach(() => vi.unstubAllGlobals());

describe('voice choice', () => {
  it.each([
    ['en-GB', 'en-GB'],
    ['fr-FR', 'fr-FR'],
    ['es-ES', 'es-ES'],
  ] as const)('speaks %s with a %s voice', (locale, lang) => {
    const synth = install(VOICES);
    const { result } = renderHook(() => useSpeech(locale, 'Hello'));
    act(() => result.current.speak());
    expect(uttered(synth).voice?.lang).toBe(lang);
    expect(uttered(synth).text).toBe('Hello');
  });

  it('never reads Pidgin with another language voice', () => {
    install(VOICES);
    const { result } = renderHook(() => useSpeech('pcm-NG', 'Wetin dey'));
    expect(result.current.status).toBe('no-voice');
  });

  it('reads Pidgin with an en-NG voice when the device has one', () => {
    const synth = install([...VOICES, voice('en-NG')]);
    const { result } = renderHook(() => useSpeech('pcm-NG', 'Wetin dey'));
    act(() => result.current.speak());
    expect(uttered(synth).voice?.lang).toBe('en-NG');
  });

  it('does not crash without speechSynthesis', () => {
    const { result } = renderHook(() => useSpeech('en-GB', 'Hello'));
    expect(result.current.status).toBe('unsupported');
    expect(() => act(() => result.current.speak())).not.toThrow();
  });
});

const renderButton = (locale: Locale = 'en-GB') =>
  render(<ListenButton locale={locale} text="Goal" headline="Late winner" />);

describe('ListenButton', () => {
  it('names the action with the headline and toggles Listen and Stop', async () => {
    const synth = install(VOICES);
    renderButton();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole('button', { name: 'Listen to: Late winner' }),
    );
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const stop = screen.getByRole('button', {
      name: 'Stop listening: Late winner',
    });
    expect(stop).toHaveTextContent('Stop');
    await user.click(stop);
    expect(synth.cancel).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Listen to: Late winner' }),
    ).toHaveTextContent('Listen');
  });

  it('describes the control as using the device voice', () => {
    install(VOICES);
    renderButton();
    expect(
      screen.getByRole('button', { name: /Listen to/ }),
    ).toHaveAccessibleDescription("Uses your device's voice");
  });

  it('stops when the language changes', async () => {
    const synth = install(VOICES);
    const { rerender } = renderButton();
    await userEvent.click(screen.getByRole('button', { name: /Listen to/ }));
    rerender(<ListenButton locale="fr-FR" text="But" headline="Late winner" />);
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Listen to/ })).toBeVisible();
  });

  it('shows a plain note for Pidgin without a voice, and nothing without speech', () => {
    install(VOICES);
    const { container, unmount } = renderButton('pcm-NG');
    expect(
      screen.getByText('Audio is not available for Naijá (Pidgin)'),
    ).toBeVisible();
    expect(screen.queryByRole('button')).toBeNull();
    unmount();
    vi.unstubAllGlobals();
    const none = renderButton();
    expect(none.container).toBeEmptyDOMElement();
    expect(container).toBeDefined();
  });
});
