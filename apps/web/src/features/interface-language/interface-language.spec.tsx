import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackLink } from '@/components/layout/back-link';
import { SkipLink } from '@/components/layout/skip-link';
import { AudienceBar } from '@/features/studio/components/audience-controls';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { InterfaceLanguageSelect } from './interface-language-select';
import { InterfaceLanguageSync } from './interface-language-sync';
import {
  INTERFACE_LOCALE_STORAGE_KEY,
  useInterfaceLanguage,
} from './interface-language-store';

const reset = () => {
  window.localStorage.clear();
  useInterfaceLanguage.setState({ locale: 'en-GB' });
  useStudioUi.setState({ ...STUDIO_UI_DEFAULTS });
  document.documentElement.lang = 'en-GB';
};

describe('interface language', () => {
  beforeEach(reset);

  it('restores the device choice and updates the document language', () => {
    window.localStorage.setItem(INTERFACE_LOCALE_STORAGE_KEY, 'fr-FR');
    render(<InterfaceLanguageSync />);

    expect(useInterfaceLanguage.getState().locale).toBe('fr-FR');
    expect(document.documentElement).toHaveAttribute('lang', 'fr-FR');
  });

  it('translates controls without changing commentary language', async () => {
    const user = userEvent.setup();
    render(
      <>
        <InterfaceLanguageSync />
        <InterfaceLanguageSelect />
        <AudienceBar />
        <SkipLink />
        <BackLink />
      </>,
    );

    await user.click(
      screen.getByRole('button', { name: /Interface language/ }),
    );
    await user.click(screen.getByRole('option', { name: 'Français' }));

    expect(useInterfaceLanguage.getState().locale).toBe('fr-FR');
    expect(useStudioUi.getState().locale).toBe('en-GB');
    expect(document.documentElement).toHaveAttribute('lang', 'fr-FR');
    expect(
      screen.getByRole('radiogroup', { name: 'Langue des commentaires' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Aller au contenu' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('link', { name: 'Retour' })).toBeInTheDocument();
    expect(window.localStorage.getItem(INTERFACE_LOCALE_STORAGE_KEY)).toBe(
      'fr-FR',
    );
  }, 10_000);

  it('changes commentary without changing the interface', async () => {
    const user = userEvent.setup();
    render(<AudienceBar />);

    await user.click(screen.getByRole('radio', { name: /Español/ }));

    expect(useStudioUi.getState().locale).toBe('es-ES');
    expect(useInterfaceLanguage.getState().locale).toBe('en-GB');
    expect(
      screen.getByRole('radiogroup', { name: 'Commentary language' }),
    ).toBeInTheDocument();
  });

  it('accepts language changes from another tab', () => {
    render(<InterfaceLanguageSync />);

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: INTERFACE_LOCALE_STORAGE_KEY,
          newValue: 'es-ES',
        }),
      );
    });

    expect(useInterfaceLanguage.getState().locale).toBe('es-ES');
    expect(document.documentElement).toHaveAttribute('lang', 'es-ES');
  });
});
