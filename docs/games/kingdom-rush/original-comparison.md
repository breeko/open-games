# Pagras: original Flash comparison

Comparison date: November 7, 2026. Target: **original Kingdom Rush, Armor Games Flash v1.13, Pagras campaign, Normal, no hero, no purchased star upgrades**. This replaces the community desktop export as the authority for verified gameplay differences; desktop-scaled geometry/art remain in use.

## Reference and method

- Played the publisher-hosted [original on Armor Games](https://armorgames.com/play/12141/kingdom-rush) through its Ruffle embed. Started a clean local save. Southport was completed on Normal; Farmlands was eventually completed on Easy to unlock Pagras. **Pagras was explicitly switched back to Normal** before the comparison runs. No upgrade stars were spent and no hero was selected.
- Inspected the same publisher-served [SWF](https://cache.armorgames.com/files/games/kingdom-rush-12141.swf?v=1379178890), SHA-256 `7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23`, using JPEXS 26.4.0. The binary and exported ActionScript remain in temporary research storage. Neither is bundled or committed.
- Transcribed factual wave parameters into `src/games/kingdom-rush/reference/flash-pagras.json`. `extract-flash-waves.py` reproduces this from a local script export and verifies the publisher binary's hash. It does not execute the exported source.
- Used the same initial three towers in the original and local browser: barracks at holder 12, artillery at 10, archers at 11. Both charge 265 gold, leaving 35, with twenty lives and eleven waves. Subsequent human commands and random outcomes were not synchronized frame by frame.

## Confirmed differences and fixes

| Area | Previous prototype | Original evidence and current behavior |
| --- | --- | --- |
| Spawn spacing | Desktop intervals: first chunks 26 / 32 / 6 frames. | Flash `Level3.loadCampaign`: 20 / 25 / 5 frames. All eleven groups now use Flash spacing; composition remains 329 enemies. |
| Chunk completion | No bookkeeping frames between chunks. | `Wave` / `WaveSpawn`: completion and transition frames retained. First group's last spawn is tick 604; spawner finishes at 606. |
| Wave breathing room | Empty road immediately started another wave. Flags were available immediately after spawning. | `Level` retains the countdown and reveals flags after fifty ticks. The prototype now does both. |
| Early-call reward | Extra gold only. | `Level` → `MenuBottom` → power controller: same remaining frame count also advances power recharge. Both spells now receive this benefit. |
| Damage distribution | Inclusive uniform integer rolls, including the displayed minimum. | `Arrow.getDamage`, `Bolt.getDamage`, `Soldier.getDamage`, `Enemy.getDamage`, `Fireball`: minimum + ceil(random × span). In particular, unupgraded farmers almost always deal 2, not an average of 1.5. All corresponding rolls now follow Flash. |
| Wind-ups / flights | Archer 5-frame wind-up, 22-frame flight; mage 8-frame wind-up; artillery 12-frame wind-up, 31-frame flight. | Flash archer fires at 7 / arrow travels 17; mage fires at 5; artillery fires at 24 / bomb travels 27. |
| Artillery damage | Tier two 20–40, uniform splash damage. | `GameSettings` / `Bomb`: tier two 15–30; maximum at blast center, minimum at edge. Same horizontal radius, flatter 2:3 ellipse. |
| Artillery aim | Current target position at firing time. | `TowerEngineer` / `Enemy.getNodesSpeed`: predicts ahead along path nodes, uses blocked enemy position, retains charge-time aim. Implemented. |
| Arrows | Always damage a still-living target at impact. | `Arrow`: velocity prediction, aim error and collision can produce misses. Added lead/error and approximate collision bounds. |
| Shamans | Could not heal themselves; resumed moving at heal impact; recharged from cast start. | `EnemyShaman`: self-heal allowed, healing at frame 14, stationary 28-frame cast, then eight-second recharge. Implemented; target iteration order remains approximate. |
| Melee timing | Shaman 1.6s attack cycle; footman 41 frames. | Flash shaman has a 30-frame combined cycle; footman has 30 reload + 20 charge frames. Updated. |
| Construction / soldiers | Immediate activity and replacement; regeneration too soon after combat. | `GameSettings`, `TowerSoldier`, `Soldier`: thirty-frame construction, twelve-frame door delay, idle delay before periodic regeneration. Modeled; full door queues and melee state machines remain approximate. |
| Rain of Fire | Three balls five frames apart, fixed one-second diagonal flight. | `FireballControler` / `Fireball`: balls launch at frames 10, 20, 30 from the top edge; travel depends on height and acceleration. Launch spacing, spread, scaled radius and height-dependent impact implemented. |
| Pre-battle powers | Could be used before starting. | Original unlocks powers when the battle starts. The prototype now gates them and explains this in the controls. |

Desktop coordinates use a 1.28 scale: Flash range fields are often ellipse **diameters**, whereas our helpers use radii. Bomb area additionally expands horizontally by 1.5. The blast-width check therefore did **not** justify shrinking the existing horizontal radius; the correction is its vertical aspect and falloff.

## Play observations and limits

The first original Normal run reached wave nine and lost. It began with the matched three-tower opening, added magic and an archer, upgraded the rear archer, mage and barracks, and used reinforcements/fire intermittently. It had spare gold at defeat. This is a useful pressure observation, not a controlled balance score: late purchases and missed opportunities affected the result.

A second original Normal run completed all eleven waves with **10 lives remaining**, two stars and 352 gold. It used more timely reinforcements, three fire casts, archers at holders 11/5/2 (upgraded), mages at 6/4 (upgraded), upgraded barracks 12 and upgraded artillery 10. The wave-nine mass rush caused most of the leaks; all three ogres across waves ten and eleven were defeated. A proposed final tower purchase was unnecessary because victory had already occurred. This was human play with pauses for inspection, not a synchronized replay.

The local browser run verified the same opening economy, visible two-road rush, tower purchases and power gating. Automated seeded runs exercise complete corrected eleven-wave campaigns. A paced mixed defense with reinforcements and fire against shamans/ogres currently wins with **16 lives, 325 kills, four leaks, about 570 simulated seconds** for seed `0xc0ffee`. Earlier aggressive call/purchase choices can still lose. These numbers are regression observations for our simulation, not an original-game RNG or outcome match.

Exact outcome parity remains unproven. Differences still include Flash dictionary target order, melee collision/formation and interruptions, path/terrain validation, bolt acceleration, sprite collision bounds, minor tick ordering, and the desktop-scaled background/viewport. No arbitrary HP or cash multiplier was added to force equal win rates. Physical iPad performance remains untested.

## Reproduction and checks

```sh
python3 scripts/games/kingdom-rush/extract-flash-waves.py /path/to/decompiled/scripts /path/to/original.swf
bun run test:kingdom-rush
bun test tests/library-boundaries.test.ts
bun run build
```

Changes are confined to Kingdom Rush source, tests, preparation tooling and documentation. The independent Garden Guard work is outside this change.
