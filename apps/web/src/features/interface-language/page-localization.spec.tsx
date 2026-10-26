import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { SignInContent } from '@/features/auth/sign-in-content';
import { GuidePage } from '@/features/guide/guide-page';
import { HeroSection } from '@/features/landing/hero-section';
import { TemplateLobby } from '@/features/lobby/template-lobby';
import { OfflineContent } from '@/features/pwa/offline-content';
import { STUDIO_UI_DEFAULTS, useStudioUi } from '@/features/studio/store';
import { createQueryClient } from '@/lib/api/query-provider';
import { template } from '@/test/session-factories';
import { stubApi } from '@/test/stub-api';
import { useInterfaceLanguage } from './interface-language-store';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('page interface language', () => {
  beforeEach(() => {
    useInterfaceLanguage.setState({ locale: 'en-GB' });
    useStudioUi.setState({ ...STUDIO_UI_DEFAULTS });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('localizes public page content without changing commentary language', () => {
    useInterfaceLanguage.setState({ locale: 'fr-FR' });
    render(
      <>
        <HeroSection />
        <GuidePage />
        <OfflineContent />
        <SignInContent
          sso={false}
          ssoHref="/auth/sign-in"
          returnTo="/fixtures"
          showDemoAccounts={false}
        />
      </>,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Un flux de match fiable. Pour chaque public, dans chaque langue.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Une visite de trois minutes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Vous êtes hors connexion' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Se connecter à MatchIQ' }),
    ).toBeInTheDocument();
    expect(useStudioUi.getState().locale).toBe('en-GB');
  });

  it('localizes match choices, scenario guidance and replay controls', async () => {
    useInterfaceLanguage.setState({ locale: 'es-ES' });
    stubApi({
      'GET /fixture-templates': { body: { items: [template()] } },
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <TemplateLobby />
      </QueryClientProvider>,
    );

    const list = await screen.findByRole('list', { name: 'Partidos' });
    const card = within(list).getByRole('article');
    expect(card).toHaveTextContent('Remontada tardía');
    expect(card).toHaveTextContent('Repetición recomendada');
    expect(
      within(card).getByRole('button', { name: /Iniciar repetición de/ }),
    ).toBeInTheDocument();
  });
});
