import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '@/constants/theme';

/**
 * Runs in `<head>` before first paint. It is a literal, not a serialised
 * function, so every bundle emits identical bytes and the CSP hash in
 * `lib/security/csp.ts` always matches. Storage may throw in private modes;
 * the OS preference then applies through CSS.
 */
export const THEME_INIT_SCRIPT = `(function(k,a){try{var s=window.localStorage.getItem(k),r=document.documentElement;if(s==="light"||s==="dark")r.setAttribute(a,s);else r.removeAttribute(a)}catch(e){}})(${JSON.stringify(THEME_STORAGE_KEY)},${JSON.stringify(THEME_ATTRIBUTE)})`;
