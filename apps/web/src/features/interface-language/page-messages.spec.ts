import { PAGE_MESSAGES } from './page-messages';

describe('feature state messages', () => {
  it('provides translated operational states and nouns', () => {
    expect(PAGE_MESSAGES['fr-FR'].states.audit.empty.title).toBe(
      'Aucune activité pour le moment',
    );
    expect(PAGE_MESSAGES['fr-FR'].states.studio.eventNoun.other).toBe(
      'événements',
    );
    expect(PAGE_MESSAGES['es-ES'].states.playerFocus.pickTitle).toBe(
      'Elige un jugador para seguir',
    );
    expect(PAGE_MESSAGES['es-ES'].states.observatory.momentNoun.other).toBe(
      'momentos clave',
    );
  });

  it('keeps complete English defaults for every migrated feature', () => {
    const states = PAGE_MESSAGES['en-GB'].states;
    expect(Object.keys(states)).toEqual([
      'audit',
      'observatory',
      'recap',
      'playerFocus',
      'studio',
    ]);
    expect(states.studio.approvalEmpty.AUTO.description).toBeTruthy();
    expect(states.studio.approvalEmpty.MANUAL.description).toBeTruthy();
  });
});
