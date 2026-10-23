import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserMenu } from './user-menu';
import { useSession } from '@/lib/auth/session-store';
import type { SessionViewUser } from '@/lib/auth/session-view';

const account: SessionViewUser = {
  sub: 'user_1',
  name: 'Alex Producer',
  orgId: 'org_internal_123',
  orgName: 'Harbour Media',
  roles: ['producer'],
};

const signIn = (user = account) =>
  act(() =>
    useSession.setState({
      view: {
        status: 'authenticated',
        ssoEnabled: true,
        user,
        permissions: ['editorial:publish'],
      },
    }),
  );

const accountButton = () =>
  screen.getByRole('button', { name: 'Account: Alex Producer, Producer' });

describe('account popover', () => {
  beforeEach(() => signIn());
  afterEach(() => act(() => useSession.setState({ view: null })));

  it('opens by keyboard and restores focus to the account button on Escape', async () => {
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.tab();
    expect(accountButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Account' });
    expect(within(dialog).getByText('Harbour Media')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(accountButton()).toHaveFocus();
  });

  it('closes when the user presses outside the panel', async () => {
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(accountButton());
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it.each([undefined, '', '   '])(
    'uses plain language when the organisation name is %s',
    async (orgName) => {
      signIn({ ...account, orgName });
      const user = userEvent.setup();
      render(<UserMenu />);
      await user.click(accountButton());
      const dialog = await screen.findByRole('dialog');
      expect(
        within(dialog).getByText('Organisation name unavailable'),
      ).toBeInTheDocument();
      expect(within(dialog).queryByText(account.orgId)).not.toBeInTheDocument();
    },
  );

  it('keeps sign-out as a same-origin POST and removes account details on expiry', async () => {
    const user = userEvent.setup();
    render(<UserMenu />);
    await user.click(accountButton());
    const dialog = await screen.findByRole('dialog');
    const form = within(dialog)
      .getByRole('button', { name: 'Sign out' })
      .closest('form');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('action', '/auth/sign-out');
    act(() => useSession.getState().markExpired());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });
});
