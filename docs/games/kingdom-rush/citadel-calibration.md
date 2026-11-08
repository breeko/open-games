# Citadel campaign calibration — November 8, 2026

The Citadel now has both a reproducible full seventeen-wave **simulation victory** and a complete **browser practice victory**, including the Juggernaut, with normal starting money and a fourteen-star power loadout. The browser run saved ten lives. Its power budget was selected temporarily for practice, not earned in that browser's campaign. A matched original Citadel comparison and a clear using that browser's earned campaign upgrades remain unverified. No enemy, tower, money, or wave values were changed.

## Fixed defense and upgrade budget

The same authored policy, default seed 12,648,430, starts from wave one with 700 gold and twenty lives. It never uses practice income. The [script](../../../scripts/games/kingdom-rush/calibrate-citadel.ts) contains the full purchase order, target rules and early-call condition. Its [per-wave results](playtests/2026-11-08-citadel-calibration.jsonl) are retained.

| Power loadout | Stars spent | Result | Tick | Gold | Kills |
| --- | ---: | --- | ---: | ---: | ---: |
| No upgrades | 0 | Defeat, wave 8 | 8,421 | 220 | 110 |
| Fire 3, reinforcements 1 | 6 | Defeat, wave 10 | 12,411 | 73 | 234 |
| Fire 5, reinforcements 2 | 14 | Victory, 13 lives | 24,954 | 3,393 | 562 |

Five previous maps can award up to fifteen stars. Fourteen is a near-complete prior campaign budget, **not a fresh-player budget** or a claim that lower budgets cannot win. Spending all of it on powers also differs from a player investing stars in tower branches, which this implementation still omits.

Opening: mages at foundations 3, 4, 9, 7, 6, 10 and 14. Add mage 12, promote 9 and 10, then add/upgrade barracks 5. Continue the fixed promotion sequence through Arcane Wizards 9/10 and Rangers 8/11. Reinforcements hold enemies covered by at least two ranged towers. Fire targets the largest nearby HP cluster, and early calls wait until at most two active enemies remain.

This automated policy sees exact enemy HP, checks powers every second, and buys the next tower as soon as affordable. It establishes a viable implementation path; it does not measure human win rate or reproduce an original player.

The same fourteen-star policy also won all four predetermined seeds tested:

| Seed | Lives | Kills | Final tick |
| ---: | ---: | ---: | ---: |
| 1 | 10 | 575 | 26,214 |
| 2 | 5 | 543 | 25,939 |
| 42 | 11 | 567 | 25,044 |
| 12,648,430 | 13 | 562 | 24,954 |

These four samples are not a statistical difficulty estimate. Two other purchase-order variants at the default seed won with nine and five lives; their outcomes are exploratory, not the retained regression policy.

## Actual browser attempt and restoration

Played the local campaign from wave one using the device's existing **Fire 2 / reinforcements 0** loadout. Seven initial mages, an eighth mage, central mage promotions and a barracks with promotion were bought manually. Two fire casts, three reinforcement casts and one early call were used. This was an active attempt, with pauses while inspecting and recording the game; it was not synchronized with the automated policy.

It ended in **wave-six defeat: tick 10,083, 274 gold, 87 kills, zero lives**. The [complete command export](playtests/2026-11-08-citadel-campaign-browser.json) reproduces those terminal values exactly. The [final screenshot](playtests/2026-11-08-citadel-campaign-browser.jpg) is preserved. Preparation accounts for the first 2,475 ticks; terminal ticks are not pure combat duration.

Reloaded the page during wave two. The game restored paused at 27 gold, sixteen lives, wave 2/17, with the same 68-second fire cooldown. Resuming continued the battle. Separately, the full fourteen-star simulation was JSON-saved/restored at ticks 6,000, 15,000 and 21,000, spanning midgame and the boss. Every restored snapshot and the terminal outcome matched uninterrupted play.

## Original comparison and next milestone

Continued the [Armor Games original](https://armorgames.com/play/12141/kingdom-rush) on Normal, with Fire 3 and reinforcements 1, using six earned stars and no tower star upgrades. The Twin Rivers run is paused in wave 5/13, with eleven lives and 124 gold; [checkpoint screenshot](playtests/2026-11-08-original-twin-rivers-progress.jpg). Its opening was barracks 13/5, artillery 14/6, mages 12/4 and archer 9; later promoted mages 12/4 and artillery 14 to tier two. Powers were placed through the original UI. This is an unfinished unlock run, not a completed control or a Citadel comparison. Silveroak/Citadel remain locked.

Before adding Coldstep Mines: finish unlocking the original Citadel and compare matched purchases/powers, including a lower campaign budget. The full local browser practice milestone is complete; original difficulty parity is still open. Investigate the existing earlier-map parity gap using evidence. Do not weaken enemies simply because a low-budget authored defense or a manual attempt loses.

## Full browser practice victory

Added temporary practice power selection under **About this test level & tools**. Campaign powers remain the default. Custom ranks show their total star cost and the maximum from earlier maps on a first visit, flagging larger budgets. Practice never changes the earned-star profile or completed records. Restart now restarts practice instead of replacing the saved campaign battle. Return to campaign is available in tools, the terminal controls, and the current map's card in Maps. Campaign power purchases are disabled during practice, including wave-one preparation.

Two actual browser attempts used the same seed and temporary Fire 5 / reinforcements 2 budget:

| Attempt | Result | Tick | Gold | Kills |
| --- | --- | ---: | ---: | ---: |
| First practice run | Defeat, wave 8 | 10,082 | 123 | 118 |
| Retry from wave one | Victory, 10 lives | 21,062 | 203 | 530 |

The first [complete trace](playtests/2026-11-08-citadel-practice-first-browser.json) is retained alongside the successful [complete trace](playtests/2026-11-08-citadel-practice-victory-browser.json) and [victory screenshot](playtests/2026-11-08-citadel-practice-victory-browser.jpg). Both start with normal 700 gold; wave-one practice supplies no prior-wave income. Neither used injected gold, lives or damage. Preparation occupied 166 ticks in the winning run. Pauses were used to inspect and plan; this is an agent-controlled browser playtest, not a human win-rate measurement.

The retry bought the same seven opening mages and mage 12, promoted the central mages and barracks, then added Rangers at 8/11. Arcane Wizards at 9/10 were followed by 4/6; 14/12 became Arcane Wizards during the boss fight. Teleport ranks 1–2 were bought at 9 in wave thirteen, and Thorns ranks 1–3 at 11 during wave fourteen/the boss. Fifteen Fire casts and twenty-nine reinforcement casts were placed through the actual UI. All sixteen subsequent waves were called early. Every purchase, placement and call is in the trace.

| Start of wave | Lives |
| ---: | ---: |
| 1–6 | 20 |
| 7–8 | 18 |
| 9 | 13 |
| 10–11 | 11 |
| 12–17 | 10 |
| Victory | 10 |

The ten escapes were **five Worgs, three Shamans and two Bandits**. There were no Gargoyle, Dark Knight or boss escapes. Teleport fired thirty portals, moving sixty-three enemies; Thorns applied twenty-six roots. Sixteen Golem launches were observed. The final result includes summoned enemies and the original-style army cleanup on boss death.

The successful trace replays to the exact phase/tick/gold/lives/kills after the practice UI changes, which did not alter combat. Reloading after the win restored campaign preparation at 700 gold, twenty lives and wave zero. Guide still showed three earned stars, two spent, Fire 2 / reinforcements 0; the map still showed Citadel as not yet defended. The new practice Restart and Maps → Return to The Citadel campaign were also exercised through the UI and preserved that campaign state. A 24-star selection correctly flagged that it exceeds the fifteen-star first-visit budget.

The victory screenshot predates the subsequent practice-only terminal wording cleanup: its two-star result indicator did not award a campaign record. Current practice completion explicitly says no stars are awarded. Desktop controls were checked. A requested browser viewport override did not change the local tab's measured 1280×720 viewport, so this pass does not add a new phone-size validation; earlier landscape evidence and the physical-device limitation remain as recorded.

## Verification

108 Kingdom Rush tests and four library-boundary checks pass, along with the production build. Checks now include exact replay of the full browser victory, campaign isolation for custom practice, and default later-wave practice behavior. Changes are confined to Kingdom Rush UI, practice setup, tests and documentation. Combat values, schedules, save formats and assets were unchanged.

```sh
bun scripts/games/kingdom-rush/calibrate-citadel.ts
bun test tests/games/kingdom-rush tests/library-boundaries.test.ts
bun run build
```
