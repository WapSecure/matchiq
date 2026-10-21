# Definition of Done

A task is done only when **every** item below holds. Otherwise report it as _incomplete_ or _blocked_, with the reason.

| #   | Criterion                                                                              | Evidence                                  |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | Acceptance criteria from the ticket or spec are satisfied                              | Linked AC, with screenshots or output     |
| 2   | Real, functional implementation: no placeholders presented as features                 | Diff review                               |
| 3   | Required tests exist and pass at the right layers (see `TESTING_STRATEGY.md`)          | CI `verify` and `e2e`                     |
| 4   | Lint, typecheck and format pass                                                        | CI `verify`                               |
| 5   | Relevant builds succeed                                                                | CI `verify`                               |
| 6   | Contracts are compatible, and generated code is regenerated and committed              | CI drift check                            |
| 7   | Security and authorization requirements are met; no secrets in the diff                | CI `security`, review                     |
| 8   | Accessibility is considered for UI changes (axe passes, keyboard works)                | E2E                                       |
| 9   | Documentation is updated: README, ADRs, engineering docs, `.env.example` as applicable | Diff                                      |
| 10  | No known critical regression                                                           | CI and manual check of the affected flows |
| 11  | `docs/implementation-log.md` records the outcome                                       | Diff                                      |

Integrations count as done only when exercised against the real service. Mocks satisfy development and test needs, not a "done" claim for an integration.
