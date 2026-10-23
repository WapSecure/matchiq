import { act, render } from '@testing-library/react';
import { FX, insight, message, narrative } from '@/test/factories';
import {
  createMatchStore,
  MatchStoreProvider,
  STUDIO_UI_DEFAULTS,
  useStudioUi,
} from '../store';
import { LiveAnnouncer } from './live-announcer';

const setup = () => {
  const store = createMatchStore(FX);
  store.getState().applyMessages([
    message('insight.detected', insight(), 1),
    message('narrative.ready', narrative(), 2),
    message(
      'narrative.ready',
      narrative({
        narrativeId: 'nr_fr',
        locale: 'fr-FR',
        headline: 'La pression monte',
      }),
      3,
    ),
  ]);
  const { container } = render(
    <MatchStoreProvider fixtureId={FX} store={store}>
      <LiveAnnouncer />
    </MatchStoreProvider>,
  );
  return { store, live: container.querySelector('[aria-live]') };
};

describe('LiveAnnouncer language', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    useStudioUi.setState({ ...STUDIO_UI_DEFAULTS });
  });
  afterEach(() => vi.useRealTimers());

  it('changes the live-region language only when the translated message airs', () => {
    const { live } = setup();
    act(() => vi.advanceTimersByTime(0));
    expect(live).toHaveTextContent('Home pile on the pressure');
    expect(live).toHaveAttribute('lang', 'en-GB');
    act(() => useStudioUi.getState().setLocale('fr-FR'));
    expect(live).toHaveAttribute('lang', 'en-GB');
    act(() => vi.advanceTimersByTime(5_000));
    expect(live).toHaveTextContent('La pression monte');
    expect(live).toHaveAttribute('lang', 'fr-FR');
  });

  it('uses English for a provider fallback filed under the requested locale', () => {
    const { store, live } = setup();
    act(() => {
      useStudioUi.getState().setLocale('fr-FR');
      store.getState().applyMessages([
        message(
          'narrative.ready',
          narrative({
            narrativeId: 'nr_fr_fallback',
            locale: 'fr-FR',
            localeFallback: true,
            createdAt: '2026-10-24T14:10:02Z',
          }),
          4,
        ),
      ]);
    });
    act(() => vi.advanceTimersByTime(0));
    expect(live).toHaveTextContent('Home pile on the pressure');
    expect(live).toHaveAttribute('lang', 'en-GB');
  });
});
