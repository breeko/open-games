# Southport and The Farmlands: original difficulty comparison

Compared November 7, 2026 against the publisher-hosted [Kingdom Rush Flash v1.13 on Armor Games](https://armorgames.com/play/12141/kingdom-rush), through its Ruffle embed. Both original stages were explicitly set to **Normal**, campaign mode, with no hero or purchased star upgrades. The Farmlands selection still displayed its previous Easy completion badge, but the selected difficulty for this run was visibly Normal.

## Method

Played all seven waves through the actual browser UI in each game. Waves arrived naturally; no early calls. Pauses were used for inspection and purchases. Local Southport used 2× playback; this changes elapsed real time, not the fixed 30 Hz rules. Original notification screens were dismissed without using their powers during Southport.

Southport used only the opening three tier-one towers: barracks at site 7, artillery at 5, archers at 2. Both spent all 265 starting gold. No later purchases, rally moves, upgrades or powers.

Farmlands opened with barracks 4 and artillery 7 (195 gold, leaving 25). Archers 3 and mage 2 were added in that order around waves 3 and 4. Barracks 4 and archers 3 were upgraded around waves 6 and 7. Three reinforcement casts supported the central road during the first wulf group and the later rushes; no fire or extra towers. Human purchase/cast timing was comparable by wave and spending order, not synchronized to exact source frames. In particular, original reinforcement targeting required a second click after its cursor followed the pointer; failed placement attempts are not treated as extra successful casts.

## Verified corrections

1. **Leaked enemies still award gold in the original.** `Enemy.reachNode` calls `looseLive(cost)` and `updateCash(gold)` when removing an escaped enemy. Our simulation previously removed lives but withheld that income. Corrected for every enemy, including three-life ogres; gold is awarded once and escaped enemies do not count as kills. This materially affects recovery after leaks.
2. **The opening maps used different desktop path nodes.** Numeric `Level1` / `Level2` path arrays and tower/rally coordinates now override the community geometry for those maps. Southport has 203 source nodes and Farmlands 272. Enemies start at node zero, become targetable at ten, stop being targetable eleven nodes before the end, and escape seven nodes before the end. The old Farmlands goal near its desktop defend marker ended the route early. The original source endpoint restores the remaining travel/defense opportunity.
3. **Mage and artillery wind-ups were previously misread.** The original archer releases at counter 7. Mage releases at `15 - 5`, artillery at `34 - 24`: both **10 frames**, not the previously recorded 5 and 24. Corrected. Total base shot-cycle settings remain unchanged. The earlier Pagras comparison's wind-up row is superseded by this audit.
4. **Charged artillery shots must survive target loss.** The original fires at the retained aim point even if its target dies and no replacement is in range. Ours cancelled that shot, withholding splash damage from following groups. Corrected. The original diagonal falloff also samples a directional ellipse boundary at an integer angle; our normalized elliptical distance was a different formula. Replaced it with the source calculation.
5. **Magic bolts accelerate and home.** The original starts at speed one, immediately moves at two, increases by `ceil(speed × .05)` up to ten source units/frame and tracks the active target's current aim point. Added this movement, initial upward nudge, target-loss behavior and persisted position/speed. Archer/mage/artillery launch offsets now follow their original tier-one/tier-two positions, including the first archer firing from the right shooter.

Path extraction is factual numeric data only, reproduced by `extract-flash-paths.py` from a local JPEXS export and the pinned publisher binary. SHA-256: `7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23`. Coordinates use scale 1.28 and x offset 62.4 to fit the current reference-art board. The original executable and ActionScript remain outside the repository.

## Browser results

| Stage | Original | Corrected local browser |
| --- | --- | --- |
| Southport | Victory, **13 lives, 216 gold**, two stars | Victory, **15 lives, 216 gold**, 51 kills / 5 leaks |
| The Farmlands | Victory, **6 lives, 297 gold**, two stars | First local attempt: defeat in wave 7, 99 gold. Corrected second browser attempt: defeat late in wave 7, 270 gold, 131 kills. |

Southport's same fixed defense wins in both games, with late armored/rush leaks. Matching final gold also confirms the restored leak income and the resolved enemy totals. It does not independently prove damage or difficulty equivalence.

The Farmlands manual result remains more punishing than the original reference; **exact difficulty parity is not established**. The first local trace records its mage purchase after wave five had already begun, despite selecting the intended action during wave four. The corrected browser run bought it during wave four, but reinforcement and upgrade timings still differed. Its later defeat must not be presented as a victory or replaced by an automated score.

For a controlled check of the code changes, replaying the **first failed local run's exact command ticks** under the completed fixes now wins with **5 lives, 297 gold, 139 kills at tick 8,921**. Before those final projectile fixes, that actual browser attempt lost at tick 7,239. This isolates the rule changes from new purchase decisions, but it is a simulation replay, not another browser victory and not an identical-input original replay.

A [diagnostic replay](playtests/2026-11-07-farmlands-seed-diagnostic.json) of that same schedule with local seeds 1–20 produced eight wins and twelve losses (all commands valid), with surviving lives from one to eight. That schedule is close to the limit and is sensitive to lane/damage randomness. A single original six-life win does not establish its win rate. The next calibration step should control original purchase/cast timing more tightly and gather repeated original runs, before any numeric balance changes.

These are paired human runs, not shared-RNG replays. Remaining differences include dictionary/tie order, precise per-frame movement and attack ordering, runtime display transforms/filters, and terrain validation. Homing bolt movement is now modeled; its visual effects remain simplified. No health, damage, gold or spawn multiplier was tuned to force equal scores. Physical-device performance remains untested.

## Saves and regression evidence

- The opening maps use compatibility `opening-flash-v1.13-r1` because old desktop-node positions cannot safely resume on the original node arrays. Older unfinished opening-map sessions are retained but require Restart. Completed best results are preserved. Pagras keeps its existing path/save marker.
- The historical Pagras five-life browser trace is preserved as recorded. Replaying those same commands under the completed corrections now wins with **13 lives, 361 gold, 322 kills at tick 16,538**. It is not a new Pagras browser playthrough. The source fix changes outcomes; the earlier exact five-life replay claim applies to the older rules.
- Opening-map browser exports, including both Farmlands losses, are retained under `playtests/`. The corrected Farmlands browser trace reproduces its exact defeat under current rules. Southport retains the same 15-life / 216-gold / 51-kill outcome after the final projectile corrections, finishing eight ticks earlier in replay (8,370 rather than the recorded 8,378). The historical records are preserved unchanged.

```sh
python3 scripts/games/kingdom-rush/extract-flash-paths.py /path/to/decompiled/scripts /path/to/original.swf
bun run test:kingdom-rush
bun test tests/library-boundaries.test.ts
bun run build
```

Validation: **49 Kingdom Rush tests**, **4 game-boundary tests**, production build and whitespace checks pass. All changes are within Kingdom Rush folders.
