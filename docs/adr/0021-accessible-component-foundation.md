# ADR-0021: React Aria Components as the accessible foundation for shared UI

- Status: Accepted (2026-10-23). Applies to `apps/web/src/components/ui`. Complements the theme tokens in `apps/web/src/app/global.css` and the contrast audit in `docs/design/theme-contrast.md`.

## Context

The web app still used browser-native controls: `<select>` in the lobby and audit filters, `datetime-local` inputs, `<details>` disclosures and `title=` tooltips. They look different in every browser, ignore the theme tokens, cannot carry option descriptions or disabled reasons, and `title=` tooltips are unreachable by keyboard and touch (WCAG 1.4.13, 2.1.1). The owner asked for a premium, consistent control set, comparable to Linear or Stripe.

Writing these controls from scratch means re-implementing listbox and combobox keyboard models, focus management, typeahead, date segment editing for each locale, calendar grids, RTL handling and screen-reader announcements. These are exactly the parts that are easy to get subtly wrong, and the hackathon has days, not months, left.

## Decision

Use **React Aria Components** (Adobe) as the headless layer, styled only with the existing semantic tokens.

- **Pins (exact, per `save-exact`):** `react-aria-components@1.21.1` (published 2026-09-04), `react-aria@3.52.1` (the version it depends on, used directly only for `UNSAFE_PortalProvider` in the gallery) and `@internationalized/date@3.12.4` (2026-09-01). All three are more than two weeks old. We did not take 1.22.x (2026-10-08 and 2026-10-09): it was about two weeks old and offers nothing we need.
- **What it provides:** ARIA patterns for listbox, combobox, menu, radio group, switch, checkbox, disclosure, tooltip, dialog, popover, date field, calendar and drop zone; keyboard and pointer normalisation (`usePress`, hover only for real mice); focus-visible detection; collision-aware positioning; locale-aware date segments and calendars through `I18nProvider` and `Intl`; RTL-aware arrow keys.
- **Styling contract:** every component reads the `data-*` states React Aria sets (`data-hovered`, `data-pressed`, `data-focus-visible`, `data-disabled`, `data-invalid`, `data-selected`, `data-entering`, `data-exiting`) through Tailwind variants. Shared class strings live in `control-styles.ts`. Sizes are `sm` (32 px) and `md` (40 px), and every target grows to 44 px under `pointer: coarse`. Motion uses the `overlay-in`, `overlay-out` and `sheet-in` keyframes, and the global reduced-motion rule clamps all of it.
- **Locales:** pickers wrap their subtree in `I18nProvider` with `dateLocaleFor(locale)`. `en-GB`, `fr-FR` and `es-ES` pass through; `pcm-NG` falls back to `en-GB`, because `Intl` has no Pidgin date data (the same choice as ADR-0014 makes for copy).
- **Time zones:** the date-range picker edits `ZonedDateTime` values in the viewer's zone, shows the zone, and echoes the window in UTC. Its parent only ever sees ISO 8601 UTC instants, which is what the API takes. `useTimeZone` returns UTC during server render so hydration matches.

### Where we deliberately differ from a default React Aria setup

- **`SegmentedControl` uses `RadioGroup`, not `ToggleButtonGroup`.** Arrow keys must move and select, like native radios. Studio specs rely on this, and it is the APG radio pattern. The theme toggle uses `ToggleButtonGroup`, because its segments need tooltips, and a `Radio` cannot be a tooltip trigger.
- **Tooltips use `Focusable` for app components.** `Focusable` is typed for intrinsic elements; our `Button` and `HintBadge` spread DOM props and `ref` onto their root element, so one documented cast in `tooltip.tsx` covers them. A tooltip never holds the only copy of a name: badges keep their hint as visually hidden text as well.
- **Toasts stay app-owned.** `UNSTABLE_Toast` is still marked unstable, so `ToastCard` is a styled surface, and each caller keeps its own live region and timing.
- **Modal and Drawer stay on native `<dialog>`** (`useNativeDialog`). The browser already supplies the focus trap, inert background and Escape handling, and switching would have changed tested behaviour for no gain. They gain the shared motion and elevation.
- **The replay seek bar stays a native `range` input.** Its forward-only, commit-on-idle behaviour and its existing specs depend on the input's attributes. It is restyled, not replaced.

### Alternatives considered

- **Radix UI primitives:** solid, but there is no date picker, calendar or drop zone, so we would still hand-roll the hardest parts, and their date handling has no locale story.
- **Headless UI:** smaller component set (no date, calendar, tooltip or drop zone).
- **Ark UI / Zag:** capable, but a state-machine runtime per component adds weight and is less proven on React 19.
- **Hand-rolled:** rejected for the reasons in Context.

## Consequences

- One dependency family owns the keyboard and screen-reader behaviour of every shared control. Upgrades must be deliberate (exact pins, release notes read, the gallery reviewed).
- The client bundle grows on pages that use pickers. React Aria is tree-shaken per component export, and the heavy date code loads only where a picker renders.
- The component gallery at `/design-system` shows every component and state in both themes, and Playwright runs axe on it in all four theme and device projects. It returns 404 when `APP_ENV=prod` unless `NEXT_PUBLIC_DEMO_MODE=true`.
- `UNSAFE_PortalProvider` is used only by the gallery, so overlays opened in a pinned-theme pane keep that pane's theme. Product pages portal to `<body>` as usual.
