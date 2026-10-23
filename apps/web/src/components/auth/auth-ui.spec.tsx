import { act, render, screen } from '@testing-library/react';
import { AccessDenied } from '@/components/auth/access-denied';
import { RequirePermission } from '@/components/auth/require-permission';
import { SessionExpiredNotice } from '@/components/auth/session-expired-notice';
import { UserMenu } from '@/components/auth/user-menu';
import { permissionsOf, useSession } from '@/lib/auth/session-store';
import type { SessionView } from '@/lib/auth/session-view';

const viewer: SessionView = {
  status: 'authenticated',
  ssoEnabled: true,
  user: {
    sub: 'u1',
    name: 'Vic Viewer',
    orgId: 'org_demo',
    orgName: 'Harbour Media',
    roles: ['viewer'],
  },
  permissions: ['fixtures:read', 'insights:read', 'overlays:read'],
};

vi.mock('next/navigation', () => ({ usePathname: () => '/studio/fx_1' }));

const setView = (view: SessionView | null) => useSession.setState({ view });

describe('role-aware UI', () => {
  afterEach(() => setView(null));

  it('falls back to the public demo permissions when signed out', () => {
    expect(permissionsOf(null)).toContain('agents:traces:read');
    expect(permissionsOf(null)).not.toContain('fixtures:write');
    expect(permissionsOf(viewer)).not.toContain('agents:traces:read');
  });

  it('hides a control the role lacks and names the roles that grant it', () => {
    setView(viewer);
    render(
      <RequirePermission permission="editorial:publish">
        <button type="button">Retract</button>
      </RequirePermission>,
    );
    expect(screen.queryByRole('button', { name: 'Retract' })).toBeNull();
    expect(screen.getByText('Requires Producer')).toBeTruthy();
  });

  it('renders the control when the role grants it', () => {
    setView({ ...viewer, permissions: ['editorial:publish'] });
    render(
      <RequirePermission permission="editorial:publish">
        <button type="button">Retract</button>
      </RequirePermission>,
    );
    expect(screen.getByRole('button', { name: 'Retract' })).toBeTruthy();
  });

  it('labels the 403 state as a region with the caller’s role', () => {
    setView(viewer);
    render(<AccessDenied />);
    const region = screen.getByRole('region', {
      name: "You don't have access to this",
    });
    expect(region.textContent).toContain('Viewer');
  });

  it('shows a sign-in link only when single sign-on is configured', () => {
    setView({ status: 'anonymous', ssoEnabled: false });
    const { rerender } = render(<UserMenu />);
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
    setView({ status: 'anonymous', ssoEnabled: true });
    rerender(<UserMenu />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeTruthy();
  });

  it('names the signed-in user, organisation and role in the menu button', () => {
    setView(viewer);
    render(<UserMenu />);
    expect(
      screen.getByRole('button', { name: 'Account: Vic Viewer, Viewer' }),
    ).toBeTruthy();
  });

  it('turns a 401 from the BFF into a visible session-expired alert', () => {
    setView(viewer);
    render(<SessionExpiredNotice />);
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => useSession.getState().markExpired());
    expect(screen.getByRole('alert').textContent).toContain(
      "You've been signed out for security",
    );
    expect(
      screen.getByRole('link', { name: 'Sign in again' }).getAttribute('href'),
    ).toBe('/sign-in?returnTo=%2Fstudio%2Ffx_1&error=expired');
  });

  it('does not mark a signed-out visitor as expired', () => {
    setView({ status: 'anonymous', ssoEnabled: true });
    useSession.getState().markExpired();
    expect(useSession.getState().view?.status).toBe('anonymous');
  });
});
