# Manual accessibility checklist

The automated gate (axe, WCAG 2.x A and AA tags, moderate impact and above fails the build) cannot judge announcement quality, reading order or real keyboard feel. This checklist is the manual pass that fills that gap. Every row is **not yet performed**; record the date, browser, OS version and tester in the Result column when it is done. MatchIQ does not claim WCAG conformance until this pass is complete and its findings are closed.

Setup: run the stack in the README, sign in with a local development account, and start a replay at 1× so announcements are not throttled away. Turn VoiceOver on with Cmd+F5 and use Safari on macOS.

## VoiceOver on macOS

| #   | Screen         | Step                                                           | Expected                                                                                                                                    | Result            |
| --- | -------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| V1  | Sign-in        | Open the sign-in page and read the page top to bottom          | The heading "Sign in to MatchIQ" is announced first, then the organisation-account lead and the "Continue to sign in" button                | not yet performed |
| V2  | Sign-in        | Move to the demo accounts group                                | The "Demo accounts" heading and the "Development only" badge are read, and each account is reachable and named                              | not yet performed |
| V3  | Lobby          | Open the lobby and read the page heading                       | "Choose a match to replay" is a heading; match cards are in a list                                                                          | not yet performed |
| V4  | Lobby          | Move to a card's start and speed controls                      | Buttons read "Start replay of {match title}" and "Replay speed for {match title}"                                                           | not yet performed |
| V5  | Studio         | Open a match and use the rotor to list landmarks and headings  | One main landmark; headings follow a sensible order; the replay controls are a region named "Replay controls"                               | not yet performed |
| V6  | Studio         | Start a replay and wait for a P0 or P1 moment                  | The polite live region reads the moment headline once (at most one announcement every 5 seconds); P2 moments stay silent                    | not yet performed |
| V7  | Studio         | Disconnect the network, then reconnect                         | A status message reads "Reconnecting… The score and stats will catch up by themselves.", then the banner clears                             | not yet performed |
| V8  | Studio         | Move to the seek slider                                        | The slider is named "Jump ahead" and its value reads "{n}% through the replay"                                                              | not yet performed |
| V9  | Approval queue | Switch the publish policy to Manual and wait for a cue         | The panel "Waiting for your OK" shows a count such as "1 waiting"; each cue shows "Send within {n} s"                                       | not yet performed |
| V10 | Approval queue | Move to a cue's buttons                                        | Buttons read "Send to air: {headline}" and "Don't air: {headline}"; the empty queue reads "Nothing waiting"                                 | not yet performed |
| V11 | Recap          | Open the recap after full time (or before it, for the waiting) | Before full time: "The recap is ready at full time" is announced as a status. After: the "{match}: match report" heading and moments follow | not yet performed |
| V12 | Any screen     | Trigger an error (stop the API) and reload                     | Plain wording is read, with no codes or stack text, and a retry or way back is reachable                                                    | not yet performed |

## Keyboard only (no mouse, no screen reader)

| #   | Step                                                                             | Expected                                                                              | Result            |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------- |
| K1  | Tab through sign-in, lobby, studio and recap from the top of each page           | Every control is reachable in reading order; the focus ring is always visible         | not yet performed |
| K2  | Open and close every popover, select, dialog and menu with Enter, Space and Esc  | Esc closes; focus returns to the control that opened it; focus never lands off-screen | not yet performed |
| K3  | Use arrow keys on the segmented controls, speed picker and seek slider           | Arrow keys move the selection; Home and End jump to the ends                          | not yet performed |
| K4  | Approve and drop a waiting cue in Manual mode                                    | Both can be done with Enter or Space, and focus moves to a sensible next control      | not yet performed |
| K5  | Check for keyboard traps in the evidence drawer and the correction and kill flow | Tab and Shift+Tab always leave; modal content is the only reachable content           | not yet performed |

## Reduced motion

| #   | Step                                                                                        | Expected                                                                | Result            |
| --- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------- |
| M1  | Turn on System Settings > Accessibility > Display > Reduce motion, reload, and run a replay | Cue entrances, toasts and pulses stop moving; information still appears | not yet performed |
| M2  | Turn the in-app reduced-motion preference on with the OS setting off                        | The same animations stop; the preference survives a reload              | not yet performed |

## 200% zoom and reflow

| #   | Step                                                                                    | Expected                                                                          | Result            |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------- |
| Z1  | Zoom the browser to 200% on lobby, studio, recap and sign-in                            | No text is clipped or overlaps; no control becomes unreachable                    | not yet performed |
| Z2  | At 200% and again at 400% (a 320 px wide layout), scroll each page                      | Content reflows to one column with no sideways scroll except the pitch and tables | not yet performed |
| Z3  | Increase text size only (Safari > Settings > Advanced > minimum font size) and re-check | Labels stay readable and buttons keep their names                                 | not yet performed |

## Recording results

Add a dated line under the table you ran, naming the tester, OS and browser versions, and link any defect to a ticket. See also [`theme-contrast.md`](theme-contrast.md) for the colour-contrast audit and [`CONTENT_STYLE_GUIDE.md`](../product/CONTENT_STYLE_GUIDE.md) for the wording rules behind the announced labels.
