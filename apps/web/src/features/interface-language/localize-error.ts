import type { HumanError } from '@/lib/errors';
import type { InterfaceMessages } from './interface-messages';

export const localizeError = (
  error: HumanError,
  messages: InterfaceMessages['feedback']['errors'],
): HumanError => {
  if (error.specific) return error;
  return { ...error, ...messages[error.kind] };
};
