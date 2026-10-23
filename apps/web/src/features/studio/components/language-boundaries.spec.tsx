import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OverlayCue } from '@/components/overlay/overlay-cue';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { RecapMomentItem } from '@/features/recap/recap-moment';
import { cue, insight, narrative } from '@/test/factories';
import { moment } from '@/test/session-factories';
import { AudienceBar } from './audience-controls';
import { NarrativePanel } from './narrative-panel';

const languageOf = (element: HTMLElement) =>
  element.closest('[lang]')?.getAttribute('lang');

describe('commentary language boundaries', () => {
  beforeEach(() => useStudioUi.setState({ ...STUDIO_UI_DEFAULTS }));

  it('tags translated commentary separately from English source labels', () => {
    render(
      <NarrativePanel
        insight={insight()}
        locale="fr-FR"
        view={{
          narrative: narrative({
            locale: 'fr-FR',
            headline: 'La pression monte',
            body: 'Trois tirs en cinq minutes.',
          }),
          localeFallback: false,
        }}
      />,
    );
    expect(languageOf(screen.getByText('La pression monte'))).toBe('fr-FR');
    expect(languageOf(screen.getByText('Trois tirs en cinq minutes.'))).toBe(
      'fr-FR',
    );
    expect(languageOf(screen.getByText('Written by AI · fact-checked'))).toBe(
      'en-GB',
    );
  });

  it('tags provider fallback text as English even when filed under French', () => {
    render(
      <NarrativePanel
        insight={insight()}
        locale="fr-FR"
        view={{
          narrative: narrative({ locale: 'fr-FR', localeFallback: true }),
          localeFallback: true,
        }}
      />,
    );
    expect(languageOf(screen.getByText('Home pile on the pressure'))).toBe(
      'en-GB',
    );
    expect(
      languageOf(
        screen.getByText(
          "The French version isn't ready yet, so you're seeing English.",
        ),
      ),
    ).toBe('en-GB');
  });

  it('tags the actual English variant when Spanish commentary is unavailable', () => {
    render(
      <NarrativePanel
        insight={insight()}
        locale="es-ES"
        view={{ narrative: narrative(), localeFallback: true }}
      />,
    );
    expect(languageOf(screen.getByText('Home pile on the pressure'))).toBe(
      'en-GB',
    );
  });

  it('keeps recap source labels in English inside French commentary', () => {
    render(
      <ul>
        <RecapMomentItem
          moment={moment()}
          team={null}
          persona="BROADCAST"
          locale="fr-FR"
        />
      </ul>,
    );
    expect(languageOf(screen.getByText('Home United égalise'))).toBe('fr-FR');
    expect(languageOf(screen.getByText('Standard wording'))).toBe('en-GB');
  });

  it('tags overlay text with the cue locale', () => {
    render(
      <OverlayCue
        cue={cue({
          locale: 'es-ES',
          headline: 'Aumenta la presión',
          body: 'Tres tiros en cinco minutos.',
        })}
      />,
    );
    expect(languageOf(screen.getByText('Aumenta la presión'))).toBe('es-ES');
    expect(languageOf(screen.getByText('Tres tiros en cinco minutos.'))).toBe(
      'es-ES',
    );
  });

  it('gives language options their native tags without changing controls', async () => {
    const user = userEvent.setup();
    render(<AudienceBar />);
    const group = screen.getByRole('radiogroup', { name: 'Language' });
    const french = within(group).getByRole('radio', { name: /Français/ });
    expect(languageOf(french)).toBe('fr-FR');
    expect(
      languageOf(within(group).getByRole('radio', { name: /Naijá/ })),
    ).toBe('pcm-NG');
    await user.click(french);
    expect(useStudioUi.getState().locale).toBe('fr-FR');
    expect(
      screen.getByRole('radiogroup', { name: 'Audience' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Language changes the commentary only/),
    ).toBeInTheDocument();
  });
});
