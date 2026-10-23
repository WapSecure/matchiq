import { AUTH_QUERY, AUTH_ROUTES } from '@/constants/auth';

/** The sign-in page, returning to where the user is now (or `path`). */
export const signInHref = (path?: string): string => {
  const here =
    path ??
    (typeof window === 'undefined'
      ? '/'
      : `${window.location.pathname}${window.location.search}`);
  const query = new URLSearchParams({ [AUTH_QUERY.returnTo]: here });
  return `${AUTH_ROUTES.signInPage}?${query.toString()}`;
};
