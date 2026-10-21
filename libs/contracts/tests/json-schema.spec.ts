import {
  CROSS_LANGUAGE_CONTRACTS,
  type CrossLanguageContractName,
  toContractJsonSchema,
} from '../src/index.js';

const names = Object.keys(
  CROSS_LANGUAGE_CONTRACTS,
) as CrossLanguageContractName[];

describe('cross-language JSON Schema export', () => {
  it.each(names)('emits a closed draft 2020-12 schema for %s', (name) => {
    const schema = toContractJsonSchema(name);
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    expect(JSON.stringify(schema)).toContain('"additionalProperties":false');
  });

  it('keeps the event discriminator as a const per variant', () => {
    const schema = toContractJsonSchema('MatchEvent') as {
      oneOf?: unknown[];
      anyOf?: unknown[];
    };
    const variants = schema.oneOf ?? schema.anyOf ?? [];
    expect(variants.length).toBe(22);
  });
});

describe('timestamp export', () => {
  it('relies on the date-time format instead of a regex pattern', () => {
    const text = JSON.stringify(toContractJsonSchema('MatchEvent'));
    expect(text).toContain('"format":"date-time"');
    expect(text).not.toMatch(/"format":"date-time","pattern"/);
  });
});
