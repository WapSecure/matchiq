import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Locale,
  NarrativeDraft,
  PipelineRequest,
  PipelineResult,
} from '../src/index.js';

const sample = (name: string): Record<string, unknown> =>
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, '..', 'samples', `${name}.json`),
      'utf8',
    ),
  );

describe('pipeline contracts', () => {
  it('requires at least one persona and locale', () => {
    const request = sample('PipelineRequest');
    expect(
      PipelineRequest.safeParse({ ...request, personas: [] }).success,
    ).toBe(false);
    expect(PipelineRequest.safeParse({ ...request, locales: [] }).success).toBe(
      false,
    );
  });

  it('allows a suppressed result with no analysis, narratives or overlay', () => {
    const result = {
      ...sample('PipelineResult'),
      status: 'REJECTED',
      analysis: null,
      verification: null,
      narratives: [],
      overlay: null,
      fallbackReason:
        'model unavailable; no verified template for this insight kind',
    };
    expect(PipelineResult.safeParse(result).success).toBe(true);
  });

  it('rejects narrative drafts without evidence', () => {
    const [draft] = sample('PipelineResult')['narratives'] as unknown[];
    expect(
      NarrativeDraft.safeParse({ ...(draft as object), evidenceEventIds: [] })
        .success,
    ).toBe(false);
  });
});

describe('model provider', () => {
  it('records local Ollama inference distinctly from Foundry and mocks', () => {
    const [run] = sample('PipelineResult')['runs'] as Record<string, unknown>[];
    expect(PipelineResult.shape.runs.element.shape.provider.options).toEqual([
      'foundry',
      'ollama',
      'recorded',
      'mock',
      'template',
    ]);
    expect(
      PipelineResult.safeParse({
        ...sample('PipelineResult'),
        runs: [{ ...run, provider: 'ollama' }],
      }).success,
    ).toBe(true);
    expect(
      PipelineResult.safeParse({
        ...sample('PipelineResult'),
        runs: [{ ...run, provider: 'recorded' }],
      }).success,
    ).toBe(true);
  });
});

describe('locale', () => {
  it('lists the audience locales in display order, Nigerian Pidgin last', () => {
    expect(Locale.options).toEqual(['en-GB', 'fr-FR', 'es-ES', 'pcm-NG']);
    expect(Locale.safeParse('en-NG').success).toBe(false);
  });

  it('accepts a Pidgin narrative draft', () => {
    const [draft] = sample('PipelineResult')['narratives'] as object[];
    expect(
      NarrativeDraft.safeParse({ ...draft, locale: 'pcm-NG' }).success,
    ).toBe(true);
  });
});
