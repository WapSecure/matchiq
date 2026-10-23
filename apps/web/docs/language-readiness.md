# Language readiness

Reviewed 23 October 2026. The product owner selected independent interface and commentary languages. Operator navigation must not change when an operator prepares commentary in another language.

## Current behavior

- The interface remains English. The studio picker selects commentary in English, French, Spanish or Nigerian Pidgin; it does not promise a translated interface.
- Native language names carry their BCP 47 tags. French, Spanish and Pidgin commentary are tagged with the language actually served. English source labels and fallback notices are tagged separately.
- Live announcements keep text and its language together through the throttle window. Only the latest pending moment is spoken; clearing the eligible moment or unmounting cancels pending work.
- A narrative with `localeFallback: true` contains the original English text even when its requested `locale` is French, Spanish or Pidgin. The live studio and announcer use the flag to select English pronunciation. A missing variant that resolves to the English narrative also remains English.
- Overlay text uses its cue's locale. This does not imply that the worker produces graphics in every commentary language; the existing English broadcast fallback remains explicit.
- These checks establish DOM language metadata and timing behavior. They do not establish translation quality, native pronunciation quality or screen-reader compatibility on every device.

## MQ-049: Independent interface localization (E, with A for architectural approval)

Deliver a separate operator preference rather than reusing `useStudioUi.locale`. Keep interface locale, commentary locale and display timezone distinct. Maintain translated interface catalogs for navigation, controls, errors, empty/loading states, accessibility names and plural forms; narrative model output is not interface copy.

Render the selected interface locale on the server, using an allowlisted preference. Set the document language to that locale before hydration and tag commentary with its actual language. Never infer a user's preference from their organization, territory, name or commentary audience. English fallback must be explicit at untranslated boundaries rather than silently applying another language's pronunciation.

Release evidence: complete catalog keys checked by TypeScript; independent preference behavior through navigation and refresh; English fallback; translated error states and dialogs; long-label layout at 320/390/768/1440px; keyboard and screen-reader checks; locale-aware interface number/date formatting with explicit audit timezone. Canonical facts, IDs, evidence exports and stored numeric values remain unchanged. Review architectural changes with the platform owner before introducing routing or a new shared library.

## MQ-055: Preserve recap fallback provenance (PR validation)

The recap read contract now accepts optional `localeFallback`, and the worker copies it from each published narrative when building a recap. OpenAPI and the generated TypeScript client retain the field. The web reader uses the canonical recap narrative schema, so it no longer discards the indicator before display or export.

A confirmed fallback is displayed with English language metadata and the existing plain-language notice. A confirmed translation keeps its own locale. Existing stored recaps remain readable: when a non-English entry lacks the flag, its language is marked `und` and the UI says that the older recap does not record whether it was translated. Text is preserved; no classifier or text comparison guesses provenance. English entries and missing-variant fallback to English remain English.

No database schema migration or bulk rewriting of historical recap JSON is required. New recaps and the existing rebuild path preserve the flag. Older recaps are not assigned a guessed value or silently treated as confirmed translations. Native language quality remains a separate editorial qualification.

Rollout: upgrade strict schema consumers before enabling writers that emit the new field. The optional marker allows the current reader to load older records; an older reader pinned to a strict response schema may reject newly added properties. JSON export preserves a supplied flag and leaves an absent flag absent.

Validation and changes are recorded under MQ-055 in the implementation log. Local format, lint and type checks plus targeted regression specs follow the updated repository workflow. CI must run the full suites and browser checks before a PR merges. The owner has explicitly authorized branch publication, PR creation and merging after all required CI checks pass. Earlier publication-blocker notes in the implementation log describe the prior state.

## MQ-051: Native editorial qualification (product and D)

Review the existing French, Spanish and Pidgin templates, generated examples and failure notices with fluent football editors. ADR-0014 explicitly leaves Pidgin native-speaker review outstanding. Record reviewer, locale, terminology decisions, reviewed prompt/template versions, examples, failures and approval date. Check factual preservation separately from idiom, register, offensiveness and football terminology. Do not label translations as editorially approved until this review exists.

## MQ-046 validation

Web lint and typecheck passed. All 210 tests across 33 frontend files passed, including 13 new language and announcement regressions. Formatting and diff whitespace checks passed. The webpack production build completed compilation, type checking and page generation, with the existing standalone tracing limitation from dependencies reused outside the isolated worktree. Browser results are recorded in the implementation log. The standard Turbopack packaging limitation remains unresolved; there is no deployment claim.
