# Nigerian Pidgin (pcm-NG) football glossary

> **Status: pending native-speaker review by the product owner.**
> Corrections here must be applied to both template sets:
> `apps/worker/src/app/pipeline/templates/copy-pcm.ts` and
> `apps/agents/src/matchiq_agents/templates/phrases_pcm.py` (plus `metric_labels.py`).

## Conventions

- Spelling follows BBC Pidgin: "di" (the), "dey" (is/are -ing), "don" (has/have), "wey" (who/which), "dem" (they), "na" (it is), "dis" (this), "for" (at/in/for, always spelled in full).
- Football terms stay in English, the way Nigerian fans and radio commentators say them.
- Numbers are always written as digits and use the decimal point (`1.37`). Spelled-out numbers, in English or Pidgin spelling, are treated as claims and must be cited.
- Team and player names are copied exactly.
- Keep sentences short. No slang that could offend, no caricature, and no exaggeration beyond the facts.

## Terms

| English                          | Pidgin rendering used                                   | Notes                                          |
| -------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| Goal                             | Goal                                                    | "Goal! {team} don score"                       |
| scores / has scored              | don score                                               | "{player} don score for {team}"                |
| finds the net                    | don find di net                                         |                                                |
| the score is now 3-2             | na 3-2 now                                              | Digits only                                    |
| shot / shots                     | shot / shots                                            | "{team} don fire 3 shots inside short time"    |
| shots on target                  | shots on target                                         |                                                |
| burst of shots                   | dey rain shots, dey fire shots back to back             |                                                |
| pressure / pressing              | pressure / dey press well well                          | "well well" = a lot, strongly                  |
| pressures (metric)               | pressures                                               |                                                |
| pressure swing                   | pressure don swing, di pressure don turn go {team} side |                                                |
| high recoveries / win ball high  | ball win for up, dey win ball (back) for up             | "for up" = high up the pitch                   |
| recoveries                       | ball recoveries                                         |                                                |
| possession                       | possession                                              |                                                |
| passes                           | passes                                                  |                                                |
| expected goals (xG)              | expected goals                                          |                                                |
| corners / fouls                  | corners / fouls                                         |                                                |
| momentum                         | momentum, momentum don shift go {team} side             |                                                |
| momentum index                   | momentum index                                          | Descriptive, "e no be prediction"              |
| red card / sent off              | red card, don collect red card                          |                                                |
| lose a player to a red card      | don lose one player to red card                         |                                                |
| yellow card                      | yellow card                                             |                                                |
| substitution                     | substitution, change player                             | Reserved for future copy                       |
| milestone                        | milestone, don reach milestone                          |                                                |
| key moment                       | big moment                                              |                                                |
| in a short spell                 | inside short time                                       | Never "inside 5 minutes" unless the 5 is cited |
| in the latest spell / window     | for di latest spell / window                            |                                                |
| the window before                | di one before am                                        |                                                |
| up from 4                        | e don climb from 4                                      |                                                |
| against (comparison)             | against                                                 |                                                |
| home / away                      | home / away                                             |                                                |
| confidence: high                 | Confidence na high (analyst); confidence: high (labels) | low / medium / high kept in English            |
| counter-evidence was recorded    | Some events for dis window dey show di opposite too     |                                                |
| synthetic feed, no tracking data | Na synthetic event feed; no tracking data               |                                                |
| the team                         | di team                                                 |                                                |

## Number words read by the checks

English `two` to `twenty` and `dozen`, plus `tu` 2, `tri` 3, `fo` 4, `faiv` 5, `siks` 6, `sevin` 7, `et` 8, `nain` 9. `wan` is not read as 1 because it is also the article and the word for "want".

## Phrasings the checks block

Injury: "don wound", "don tire", "leg dey pain". Betting: "stake money", "booking code", "sure banker" (plus "bet" and "odds"). Prediction: "go win" or "go lose" (but not "go win ball"), "sure say dem go win". Managerial intent: "coach don change", "oga don switch". Prompt injection: "forget all di instructions", "ignore wetin dem tell you".
