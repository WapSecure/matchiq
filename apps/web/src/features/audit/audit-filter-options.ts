import type { ChoiceOption, ChoiceSection } from '@/components/ui';
import {
  ANY,
  AUDIT_ACTION_LABELS,
  AUDIT_FILTER_OPTIONS,
} from '@/constants/audit';
import { describeAction } from '@/lib/describe-reason';
import {
  ANY_KEY,
  AUDIT_ACTION_GROUPS,
  AUDIT_FILTER_COPY,
} from '@/constants/audit-filters';

type ValueOption = { readonly value: string; readonly label: string };

export const toKey = (value: string): string =>
  value === ANY ? ANY_KEY : value;
export const fromKey = (key: string | null): string =>
  key === null || key === ANY_KEY ? ANY : key;

const toChoices = (options: readonly ValueOption[]): ChoiceOption[] =>
  options.map((o) => ({ id: toKey(o.value), label: o.label }));

const anyAction = AUDIT_FILTER_OPTIONS.action[0];

export const ACTION_SECTIONS: ChoiceSection[] = [
  {
    title: anyAction.label,
    options: [{ id: ANY_KEY, label: anyAction.label }],
  },
  ...(['editorial', 'platform'] as const).map((group) => ({
    title: AUDIT_FILTER_COPY.groups[group],
    options: AUDIT_ACTION_GROUPS[group].map((action) => ({
      id: action,
      label: describeAction(action, AUDIT_ACTION_LABELS),
    })),
  })),
];

export const ACTOR_OPTIONS = toChoices(AUDIT_FILTER_OPTIONS.actorType);
export const TARGET_OPTIONS = toChoices(AUDIT_FILTER_OPTIONS.targetType);
export const SCOPE_OPTIONS: ChoiceOption[] = AUDIT_FILTER_OPTIONS.scope.map(
  (o) => ({
    id: o.value,
    label: o.label,
    description: AUDIT_FILTER_COPY.scopeHints[o.value],
  }),
);
