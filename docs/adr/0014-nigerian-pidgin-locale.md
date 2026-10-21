# ADR-0014: Nigerian Pidgin (pcm-NG) audience locale

- Status: Accepted (2026-10-21). Extends spec §27 (localization) and ADR-0011, ADR-0013.

## Context

The product owner is Nigerian and asked for narratives in Nigerian Pidgin (Naijá), the language most Nigerian football fans hear on radio commentary. Spec §27 lists `en-GB`, `fr-FR`, `es-ES` and an optional `en-NG`. The localization rule still holds: canonical facts in, localized narrative out, with numbers, times and proper nouns preserved and checked.

## Decision

- `Locale` in `libs/contracts` gains `pcm-NG`, ordered `en-GB`, `fr-FR`, `es-ES`, `pcm-NG`. JSON Schema and Pydantic models are regenerated. Every insight now has 3 personas × 4 locales = 12 narratives.
- **Locale code.** `pcm` is the ISO 639-3 code for Nigerian Pidgin and `NG` the region, giving the valid BCP 47 tag `pcm-NG`. We did not use `en-NG`: that tag means Nigerian English, which is a different language variety, and using it for Pidgin would mislabel content for screen readers, search and the `lang` attribute.
- **Spelling and register.** Copy follows BBC Pidgin spelling ("di", "dey", "don", "wey") and the register of Nigerian football radio commentary. Football terms stay in English as fans say them (goal, shots, pressure, momentum, red card). Numbers are always digits and the decimal separator is `.`. Team and player names are never changed. Terms are listed in `docs/localization/PIDGIN_GLOSSARY.md`.
- **Templates.** The worker has `copy-pcm.ts` and the agents service has `templates/phrases_pcm.py` and Pidgin metric labels. Both go through the same deterministic gate as every other locale, and tests run every Pidgin variant through the gate for all five golden fixtures.
- **Number words.** The gate and the Fact Checker read English number words plus Pidgin spellings (`tu`, `tri`, `fo`, `faiv`, `siks`, `sevin`, `et`, `nain`) as numeric claims that must be cited. `wan` is excluded, like "one"/"un"/"uno", because it is also the article and the word for "want". `fo` is included even though some Naijá orthographies use it for "for". Copy and prompts spell "for" in full, so a model that writes "fo" is rejected and the template is served instead. A false positive here only ever costs a fallback, never an unsupported number.
- **Forbidden claims.** The lexicon covers Pidgin phrasings of injury ("don wound", "don tire"), betting ("stake money", "booking code", "sure banker"), prediction ("go win", except "go win ball/possession") and managerial intent ("coach don change").
- **Agents.** The Localization prompt (version 1.1.0) names `pcm-NG` and gives explicit guidance: commentator register, digits only, names and values unchanged, no caricature or exaggeration.

## Quality caveat

The Pidgin copy was written by an engineer, not by a native-speaker linguist. It is **pending native-speaker review by the product owner**. Model output for `pcm-NG` depends on how much Pidgin the model has seen. Small local models may drift into English or into caricature. The deterministic checks protect facts, not style, so a fluent but stilted sentence can still publish. The glossary is the review surface: corrections there flow into both template sets.

## Consequences

- 33% more narratives per insight (12 instead of 9) in the database, on SSE and in agent calls.
- The web locale switcher needs a `pcm-NG` option. The web stream owns that change.
- Adding a locale now means touching the contract, worker copy and gate words, agents phrasebook, labels and lexicon, and the prompt. This ADR is the checklist.
