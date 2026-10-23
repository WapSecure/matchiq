# Language readiness

Reviewed 23 October 2026. The product owner selected independent interface and commentary languages. Operator navigation must not change when an operator prepares commentary in another language.

## Current behavior

- The interface remains English. The studio picker selects commentary in English, French, Spanish or Nigerian Pidgin; it does not promise a translated interface.
- Native language names carry their BCP 47 tags. French, Spanish and Pidgin commentary are tagged with the language actually served. English source labels and fallback notices are tagged separately.
- Live announcements keep text and its language together through the throttle window. Only the latest pending moment is spoken; clearing the eligible moment or unmounting cancels pending work.
- A narrative with `localeFallback: true` contains the original English text even when its requested `locale` is French, Spanish or Pidgin. The live studio and announcer use the flag to select English pronunciation. A missing variant that resolves to the English narrative also remains English.
- Overlay text uses its cue's locale. This does not imply that the worker produces graphics in every commentary language; the existing English broadcast fallback remains explicit.
- These checks establish DOM language metadata and timing behavior. They do not establish translation quality, native pronunciation quality or screen-reader compatibility on every device.

## MQ-047: Independent interface localization (E, with A for architectural approval)

Deliver a separate operator preference rather than reusing `useStudioUi.locale`. Keep interface locale, commentary locale and display timezone distinct. Maintain translated interface catalogs for navigation, controls, errors, empty/loading states, accessibility names and plural forms; narrative model output is not interface copy.

Render the selected interface locale on the server, using an allowlisted preference. Set the document language to that locale before hydration and tag commentary with its actual language. Never infer a user's preference from their organization, territory, name or commentary audience. English fallback must be explicit at untranslated boundaries rather than silently applying another language's pronunciation.

Release evidence: complete catalog keys checked by TypeScript; independent preference behavior through navigation and refresh; English fallback; translated error states and dialogs; long-label layout at 320/390/768/1440px; keyboard and screen-reader checks; locale-aware interface number/date formatting with explicit audit timezone. Canonical facts, IDs, evidence exports and stored numeric values remain unchanged. Review architectural changes with the platform owner before introducing routing or a new shared library.

## MQ-048: Preserve recap fallback provenance (A and C, then E)

The agent's `serve_original` keeps the requested locale and sets `localeFallback: true`. `apps/worker/src/app/pipeline/recap-builder.ts` currently copies commentary without this flag; `RecapNarrative` in `libs/contracts/src/lib/reads.ts` and the web's local recap schema also omit it. Therefore a recap may contain English text filed under another language without sufficient metadata to identify the fallback.

Proposed acceptance: add a compatible fallback indicator to the canonical read contract; regenerate dependent schemas; preserve it in recap construction and storage; define behavior for existing stored recaps; update the web recap selector and language tag. Prove that a rejected French translation is displayed and announced as English with a visible fallback notice in both the live studio and recap. Include contract, worker and frontend regression coverage. Do not guess language by comparing or classifying text. No changes to these owned contract/backend paths were made in MQ-046.

## MQ-049: Native editorial qualification (product and D)

Review the existing French, Spanish and Pidgin templates, generated examples and failure notices with fluent football editors. ADR-0014 explicitly leaves Pidgin native-speaker review outstanding. Record reviewer, locale, terminology decisions, reviewed prompt/template versions, examples, failures and approval date. Check factual preservation separately from idiom, register, offensiveness and football terminology. Do not label translations as editorially approved until this review exists.

## MQ-046 validation

Web lint and typecheck passed. All 210 tests across 33 frontend files passed, including 13 new language and announcement regressions. Formatting and diff whitespace checks passed. The webpack production build completed compilation, type checking and page generation, with the existing standalone tracing limitation from dependencies reused outside the isolated worktree. Browser results are recorded in the implementation log. The standard Turbopack packaging limitation remains unresolved; there is no deployment claim.
