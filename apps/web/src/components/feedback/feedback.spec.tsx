import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FORBIDDEN_COPY_PATTERNS } from '@/constants/errors';
import {
  ApiError,
  invalidResponseError,
  networkError,
  timeoutError,
} from '@/lib/api/api-error';
import { createQueryClient } from '@/lib/api/query-provider';
import { useSession } from '@/lib/auth/session-store';
import { ErrorState } from './error-state';
import { InlineProblem } from './inline-problem';
import { PageError } from './page-error';
import { RegionBoundary } from './region-boundary';
import { SessionExpiredNotice } from '@/components/auth/session-expired-notice';

vi.mock('next/navigation', () => ({ usePathname: () => '/studio/fx_1' }));

const problem = (status: number, slug: string, retryAfter?: number) =>
  new ApiError(
    'http',
    {
      type: `urn:matchiq:problem:${slug}`,
      title: 'Internal title',
      status,
      detail: 'ZodError: items.0.id Required at fetchFixtures (api.ts:12:3)',
      requestId: 'req_support_1',
    },
    retryAfter ?? null,
  );

const expectNoLeaks = (root: HTMLElement) => {
  const text = root.textContent ?? '';
  for (const pattern of FORBIDDEN_COPY_PATTERNS)
    expect(text).not.toMatch(pattern);
  expect(text).not.toMatch(/Internal title|ZodError|api\.ts/);
};

afterEach(() => {
  vi.useRealTimers();
  useSession.setState({ view: null });
});

describe('ErrorState', () => {
  it.each([
    ['network', networkError('Failed to fetch')],
    ['timeout', timeoutError()],
    ['contract', invalidResponseError('items.0: Required')],
    ['server', problem(500, 'internal-error')],
    ['validation', problem(422, 'validation-failed')],
    ['conflict', problem(409, 'replay-state-conflict')],
    ['not found', problem(404, 'fixture-not-found')],
    ['expired', problem(401, 'unauthorized')],
    ['unknown', new Error('Cannot read properties of undefined')],
  ])('explains a %s failure without technical text', (_, error) => {
    const { container } = render(
      <ErrorState title="We couldn't load the matches" error={error} />,
    );
    expect(screen.getByTestId('error-state')).toBeTruthy();
    expectNoLeaks(container);
  });

  it('offers Try again and calls the retry', () => {
    const retry = vi.fn();
    render(<ErrorState error={networkError()} onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows a copyable reference only for errors support can trace', () => {
    render(<ErrorState error={problem(500, 'internal-error')} />);
    expect(screen.getByTestId('support-reference').textContent).toContain(
      'req_support_1',
    );
  });

  it('hides the reference for problems the user can fix', () => {
    render(<ErrorState error={problem(404, 'fixture-not-found')} />);
    expect(screen.queryByTestId('support-reference')).toBeNull();
    expect(
      screen.getByRole('link', { name: 'Go to matches' }).getAttribute('href'),
    ).toBe('/fixtures');
  });

  it('counts down Retry-After before allowing a retry', () => {
    vi.useFakeTimers();
    const retry = vi.fn();
    render(
      <ErrorState error={problem(503, 'replay-capacity', 3)} onRetry={retry} />,
    );
    const button = screen.getByRole('button', { name: 'Try again in 3 s' });
    expect(button).toHaveProperty('disabled', true);
    act(() => void vi.advanceTimersByTime(3_000));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('waits 30 s when a 429 carries no Retry-After', () => {
    render(
      <ErrorState error={problem(429, 'rate-limited')} onRetry={vi.fn()} />,
    );
    expect(
      screen.getByRole('button', { name: 'Try again in 30 s' }),
    ).toBeTruthy();
  });

  it('links a signed-out user back to sign-in, returning here', () => {
    window.history.pushState({}, '', '/studio/fx_1?tab=2');
    render(<ErrorState error={problem(401, 'unauthorized')} />);
    expect(
      screen.getByRole('link', { name: 'Sign in again' }).getAttribute('href'),
    ).toBe('/sign-in?returnTo=%2Fstudio%2Ffx_1%3Ftab%3D2');
  });
});

describe('InlineProblem', () => {
  it('leads with what was attempted for a generic failure', () => {
    render(
      <InlineProblem
        error={networkError()}
        lead="We couldn't start the replay."
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain(
      "We couldn't start the replay. This is usually a brief connection problem.",
    );
  });
});

function Boom(): never {
  throw new Error('render exploded at Boom (boom.tsx:1:1)');
}

describe('RegionBoundary', () => {
  it('contains a crash to its region and recovers on Try again', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let explode = true;
    function Maybe() {
      return explode ? <Boom /> : <p>Panel back</p>;
    }
    const { container } = render(
      <>
        <RegionBoundary region="Key moments">
          <Maybe />
        </RegionBoundary>
        <p>Scoreboard still here</p>
      </>,
    );
    expect(screen.getByText("Key moments couldn't load")).toBeTruthy();
    expect(screen.getByText('Scoreboard still here')).toBeTruthy();
    expectNoLeaks(container);
    explode = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Panel back')).toBeTruthy();
  });
});

describe('PageError', () => {
  it('offers a retry, a way home and the digest as a reference', () => {
    const retry = vi.fn();
    render(<PageError digest="d1g35t" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Go to matches' })).toBeTruthy();
    expect(screen.getByTestId('support-reference').textContent).toContain(
      'd1g35t',
    );
    expect(screen.getByRole('note').textContent).toMatch(/fictional/);
  });
});

function Probe({ error }: { error: unknown }) {
  useQuery({
    queryKey: ['probe'],
    queryFn: () => Promise.reject(error),
    retry: false,
  });
  return null;
}

describe('session expiry', () => {
  it('asks a signed-in user to sign in again after any 401 query', async () => {
    useSession.setState({
      view: {
        status: 'authenticated',
        ssoEnabled: true,
        user: {
          sub: 'u1',
          name: 'Pat Producer',
          orgId: 'org_1',
          orgName: 'Harbour Media',
          roles: ['producer'],
        },
        permissions: [],
      },
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SessionExpiredNotice />
        <Probe error={problem(401, 'unauthorized')} />
      </QueryClientProvider>,
    );
    expect(
      (await screen.findByTestId('session-expired')).textContent,
    ).toContain("You've been signed out for security");
    expect(screen.getByRole('link', { name: 'Sign in again' })).toBeTruthy();
  });

  it('stays quiet for signed-out visitors', async () => {
    render(
      <QueryClientProvider client={createQueryClient()}>
        <SessionExpiredNotice />
        <Probe error={problem(401, 'unauthorized')} />
      </QueryClientProvider>,
    );
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId('session-expired')).toBeNull();
  });
});
