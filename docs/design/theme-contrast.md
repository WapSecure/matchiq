# Theme tokens and contrast audit

Tokens live in `apps/web/src/app/global.css` as `light-dark(light, dark)` pairs. The document follows `prefers-color-scheme` until the user picks Light or Dark in the header toggle (stored as `matchiq.theme`, applied to `<html data-theme>` by an inline script before first paint). Any subtree can pin a scheme with `scheme-dark`; the 16:9 broadcast preview does this, because it stands in for on-air video and must look the same in both themes.

Ratios are WCAG 2.x relative-luminance contrast, computed (not eyeballed) for every text token on every surface. Text tokens need 4.5:1; marks and control boundaries need 3:1 (WCAG 1.4.11). `line` and `line-strong` are decorative separators and are not used to identify controls.

## Dark

| token                          | canvas `#080a0e` | surface `#0e1218` | raised `#151b24` | sunken `#05070a` |
| ------------------------------ | ---------------- | ----------------- | ---------------- | ---------------- |
| ink `#eaeef4` (≥4.5)           | 17.01            | 16.13             | 14.85            | 17.32            |
| ink-muted `#a4afbd` (≥4.5)     | 8.91             | 8.45              | 7.78             | 9.07             |
| ink-subtle `#828e9e` (≥4.5)    | 5.95             | 5.64              | 5.20             | 6.06             |
| accent-strong `#6fdcf2` (≥4.5) | 12.45            | 11.80             | 10.87            | 12.67            |
| accent `#2ccbe8` (text, ≥4.5)  | 10.20            | 9.67              | 8.91             | 10.39            |
| positive `#4ade9b` (≥4.5)      | 11.52            | 10.92             | 10.06            | 11.73            |
| warning `#f5c451` (≥4.5)       | 12.17            | 11.53             | 10.62            | 12.39            |
| critical `#ff8a8a` (≥4.5)      | 8.73             | 8.27              | 7.62             | 8.89             |
| synthetic `#c8b9ff` (≥4.5)     | 11.17            | 10.59             | 9.75             | 11.37            |
| home `#4d8dff` (mark, ≥3)      | 6.20             | 5.87              | 5.41             | 6.31             |
| away `#c98500` (mark, ≥3)      | 6.45             | 6.11              | 5.63             | 6.57             |
| control `#5f6b7c` (≥3)         | 3.66             | 3.47              | 3.20             | 3.73             |

Accent-ink `#03161b` on accent: 9.53.

## Light

| token                          | canvas `#f3f5f8` | surface `#ffffff` | raised `#f6f8fa` | sunken `#eaedf1` |
| ------------------------------ | ---------------- | ----------------- | ---------------- | ---------------- |
| ink `#0c1320` (≥4.5)           | 17.02            | 18.59             | 17.46            | 15.83            |
| ink-muted `#465163` (≥4.5)     | 7.35             | 8.02              | 7.54             | 6.83             |
| ink-subtle `#5b6779` (≥4.5)    | 5.25             | 5.74              | 5.39             | 4.88             |
| accent-strong `#05667d` (≥4.5) | 6.00             | 6.56              | 6.16             | 5.58             |
| accent `#08738b` (text, ≥4.5)  | 5.01             | 5.48              | 5.14             | 4.66             |
| positive `#0b6e45` (≥4.5)      | 5.77             | 6.31              | 5.92             | 5.37             |
| warning `#875400` (≥4.5)       | 5.83             | 6.37              | 5.98             | 5.42             |
| critical `#b4232c` (≥4.5)      | 5.98             | 6.53              | 6.13             | 5.56             |
| synthetic `#5b3fc4` (≥4.5)     | 6.51             | 7.11              | 6.68             | 6.06             |
| home `#2563eb` (mark, ≥3)      | 4.73             | 5.17              | 4.85             | 4.40             |
| away `#b45a09` (mark, ≥3)      | 4.36             | 4.77              | 4.48             | 4.06             |
| control `#7b8697` (≥3)         | 3.37             | 3.68              | 3.46             | 3.14             |

Accent-ink `#ffffff` on accent: 5.48.

## Tinted badges (worst case: tint at 12–14 % over surface or raised)

| pair                         | dark      | light     |
| ---------------------------- | --------- | --------- |
| accent-strong on accent-soft | 8.24–9.18 | 5.07–5.36 |
| synthetic on synthetic-soft  | 7.60–8.45 | 5.57–5.90 |
| warning on warning tint      | 8.24–9.16 | 5.03–5.33 |
| critical on critical tint    | 6.27–6.92 | 5.03–5.37 |
| positive on positive tint    | 7.88–8.76 | 4.96–5.30 |

## Team colours

Home and away are a two-slot categorical pair, validated per theme with the dataviz palette validator (lightness band, chroma, CVD and normal-vision separation, contrast): light `#2563eb`/`#b45a09` against `#ffffff`, dark `#4d8dff`/`#c98500` against `#0e1218`, all checks pass (worst CVD ΔE 29.8). Team identity is never colour-only: monograms differ in shape (home square, away pill), swatches differ in shape, the pitch map gives each team its own attacking direction, and every chart has a table.

Axe (WCAG 2.2 AA tags) runs on every screen in both themes in Playwright and reports no serious or critical violations.

## Automated gate threshold

The axe helper (`apps/web-e2e/src/support/a11y.ts`) fails on WCAG 2.x A and AA rule violations at moderate impact and above (`BLOCKING_IMPACT_THRESHOLD` in `a11y-constants.ts`). Colour contrast was already blocking because axe rates it serious. A second pass runs the `best-practice` rules (landmarks, heading order, region) and records each finding as an `axe-advisory` annotation in the Playwright report instead of failing, because those rules have not yet been confirmed against every screen. No rule is disabled. Manual checks are in [`ACCESSIBILITY_CHECKLIST.md`](ACCESSIBILITY_CHECKLIST.md).
