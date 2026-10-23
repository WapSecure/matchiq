import {
  COMPETITION_SUFFIX,
  SCENARIO_LABELS,
  SCENARIO_PREVIEWS,
  SCENARIO_WORD_SEPARATOR,
} from '@/constants/lobby';

const capitalise = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export const scenarioLabel = (scenario: string): string =>
  SCENARIO_LABELS[scenario] ??
  capitalise(scenario.replace(SCENARIO_WORD_SEPARATOR, ' ').trim());

export const scenarioPreview = (scenario: string): string | undefined =>
  SCENARIO_PREVIEWS[scenario];

export const competitionName = (label: string): string =>
  label.replace(COMPETITION_SUFFIX, '');
