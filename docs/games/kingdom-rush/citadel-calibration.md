# Citadel campaign calibration — November 8, 2026

The Citadel now has a reproducible full seventeen-wave **simulation victory**, including the Juggernaut, with ordinary campaign money and an achievable fourteen-star power loadout. A manual browser victory and a matched original Citadel comparison remain unverified. No enemy, tower, money, or wave values were changed in this pass.

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

The Armor Games reference remains at six earned stars, with Twin Rivers unfinished and Silveroak/Citadel locked. Purchased Fire 3 and reinforcements 1 there to retain an explicit six-star comparison loadout. No original Citadel playthrough or matched fourteen-star comparison occurred in this pass.

Before adding Coldstep Mines: complete the manual local defense with a clearly recorded campaign budget, unlock the original Citadel through its campaign, and compare matched purchases/powers. Investigate the existing earlier-map parity gap using that evidence. Do not weaken enemies simply because a low-budget authored defense or a manual attempt loses.

## Verification

105 Kingdom Rush tests and four library-boundary checks pass, along with the production build. The two new checks cover the full restored campaign and replay of the actual browser attempt. Only Kingdom Rush scripts, tests and documentation changed; production gameplay and assets were unchanged.

```sh
bun scripts/games/kingdom-rush/calibrate-citadel.ts
bun test tests/games/kingdom-rush tests/library-boundaries.test.ts
bun run build
```
