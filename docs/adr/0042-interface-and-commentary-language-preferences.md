# ADR-0042: Interface and commentary languages are independent

- Status: Accepted (2026-10-25). Supersedes the interface-localization part of ADR-0035. Spec §27 and §47.

## Context

MatchIQ already localizes commentary and graphics in `en-GB`, `fr-FR`, `es-ES` and `pcm-NG`. ADR-0035 deferred interface localization and kept all controls in English. That coupling no longer meets the product requirement: an operator may need English commentary for a broadcast while using a French interface, or the reverse.

The Nigerian Pidgin commentary locale remains pending native-speaker glossary review under ADR-0014. Presenting unreviewed Pidgin interface copy as production-ready would overstate its quality.

## Decision

Interface language and commentary language are separate preferences.

- Interface language controls shared navigation, account actions, disclosures, theme controls, studio navigation and audience-control labels.
- Commentary language continues to control narratives and on-air graphics only.
- The initial interface catalogue supports `en-GB`, `fr-FR` and `es-ES`. Commentary continues to support all four existing locales, including `pcm-NG`.
- Interface language is a device preference stored under its own versioned browser key. It does not update the viewer commentary profile.
- The application updates the document `lang` attribute when the interface language changes and follows changes made in another browser tab.
- The server-rendered default is `en-GB`; the stored device preference is restored before paint.

## Consequences

- Operators can choose interface and commentary languages independently without changing match facts, calculations or generated narratives.
- Shared chrome has one typed catalogue and can add locales without changing feature state.
- Feature-specific page content outside shared chrome remains English until it is moved into reviewed catalogues.
- Nigerian Pidgin can be added to the interface catalogue after native-speaker review without changing commentary contracts.
- Locale-prefixed routes are unnecessary for this device preference. Public, indexable localized pages would require a separate routing decision.
