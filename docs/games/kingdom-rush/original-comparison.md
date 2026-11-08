# Pagras: original Flash comparison

Comparison date: November 7, 2026. **Follow-up:** the [opening-map calibration](opening-calibration.md) supersedes this report's mage/artillery release timing and records additional projectile/economy corrections. Historical browser scores below remain as originally observed. Target: **original Kingdom Rush, Armor Games Flash v1.13, Pagras campaign, Normal, no hero, no purchased star upgrades**. This replaces the community desktop export as the authority for verified gameplay differences; desktop-scaled geometry/art remain in use.

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
| Wind-ups / flights | Archer 5-frame wind-up, 22-frame flight; mage 8-frame wind-up; artillery 12-frame wind-up, 31-frame flight. | Archer fires at 7 / arrow travels 17; later audit corrected mage/artillery release to 10 frames each (their source expressions subtract counters). Bomb travel remains 27. |
| Artillery damage | Tier two 20–40, uniform splash damage. | `GameSettings` / `Bomb`: tier two 15–30; maximum at blast center, minimum at edge. Same horizontal radius, flatter 2:3 ellipse. |
| Artillery aim | Current target position at firing time. | `TowerEngineer` / `Enemy.getNodesSpeed`: predicts ahead along path nodes, uses blocked enemy position, retains charge-time aim. Implemented. |
| Arrows | Always damage a still-living target at impact. | `Arrow`: velocity prediction, aim error and collision can produce misses. Added lead/error; the follow-up below replaces generic bounds with extracted display-list geometry. |
| Shamans | Could not heal themselves; resumed moving at heal impact; recharged from cast start. | `EnemyShaman`: self-heal allowed, healing at frame 14, stationary 28-frame cast, then eight-second recharge. Implemented; target iteration order remains approximate. |
| Melee timing | Shaman 1.6s attack cycle; footman 41 frames. | Flash shaman has a 30-frame combined cycle; footman has 30 reload + 20 charge frames. Updated. |
| Construction / soldiers | Immediate activity and replacement; regeneration too soon after combat. | `GameSettings`, `TowerSoldier`, `Soldier`: thirty-frame construction, twelve-frame door delay, idle delay before periodic regeneration. Modeled; the follow-up below replaces the simplified melee ownership and formation. |
| Rain of Fire | Three balls five frames apart, fixed one-second diagonal flight. | `FireballControler` / `Fireball`: balls launch at frames 10, 20, 30 from the top edge; travel depends on height and acceleration. Launch spacing, spread, scaled radius and height-dependent impact implemented. |
| Pre-battle powers | Could be used before starting. | Original unlocks powers when the battle starts. The prototype now gates them and explains this in the controls. |

Desktop coordinates use a 1.28 scale: Flash range fields are often ellipse **diameters**, whereas our helpers use radii. Bomb area additionally expands horizontally by 1.5. The blast-width check therefore did **not** justify shrinking the existing horizontal radius; the correction is its vertical aspect and falloff.

## Play observations and limits

The first original Normal run reached wave nine and lost. It began with the matched three-tower opening, added magic and an archer, upgraded the rear archer, mage and barracks, and used reinforcements/fire intermittently. It had spare gold at defeat. This is a useful pressure observation, not a controlled balance score: late purchases and missed opportunities affected the result.

A second original Normal run completed all eleven waves with **10 lives remaining**, two stars and 352 gold. It used more timely reinforcements, three fire casts, archers at holders 11/5/2 (upgraded), mages at 6/4 (upgraded), upgraded barracks 12 and upgraded artillery 10. The wave-nine mass rush caused most of the leaks; all three ogres across waves ten and eleven were defeated. A proposed final tower purchase was unnecessary because victory had already occurred. This was human play with pauses for inspection, not a synchronized replay.

The local browser run verified the same opening economy, visible two-road rush, tower purchases and power gating. Automated seeded runs exercise complete corrected eleven-wave campaigns. A paced mixed defense with reinforcements and fire against shamans/ogres currently wins with **16 lives, 325 kills, four leaks, about 570 simulated seconds** for seed `0xc0ffee`. Earlier aggressive call/purchase choices can still lose. These numbers are regression observations for our simulation, not an original-game RNG or outcome match.

Exact outcome parity remains unproven. After the melee follow-up below, differences still include Flash dictionary target order, full door queues, path/terrain validation, bolt acceleration, runtime display filters/transforms, minor tick ordering, and the desktop-scaled background/viewport. No arbitrary HP or cash multiplier was added to force equal win rates. Physical iPad performance remains untested.

## Reproduction and checks

```sh
python3 scripts/games/kingdom-rush/extract-flash-waves.py /path/to/decompiled/scripts /path/to/original.swf
bun run test:kingdom-rush
bun test tests/library-boundaries.test.ts
bun run build
```

Changes are confined to Kingdom Rush source, tests, preparation tooling and documentation. The independent Garden Guard work is outside this change.


## Melee and collision follow-up: full browser campaign

The same publisher Flash v1.13 source was inspected for `Soldier`, `TowerSoldier`, `Enemy`, farmer placement, arrows and enemy attack wind-ups. The original victory described above remains the reference playthrough; it was not replayed a second time for this follow-up.

Verified rules now implemented:

- A single primary soldier reserves an enemy immediately, stopping movement during approach. Enemy melee starts after that soldier reaches its fighting position. Support soldiers occupy the two offset positions on the same facing side and can leave to block a new enemy. Acquisition follows the original shared rally ellipse and smallest source path node preference.
- Barracks use the original triangular ellipse formation. Rallying releases melee ownership and prevents reacquisition until redeployment finishes. Valid clicked rally/reinforcement positions are retained rather than snapped to the central subpath. Death, expiry and sale release reservations and pending attacks.
- Soldiers use the source movement speed. Replacement soldiers wait at the tower door; upgrading a dead soldier replaces it there. Farmers retain their separate shared acquisition center, spawn offsets and initial delay. Enemy-specific wind-ups and the wulf attack cycle are corrected; shamans do not begin a heal during an attack wind-up.
- Arrows test overlap in the final three flight frames against mirrored, animation-frame-dependent enemy bounds, including attached health bars. The renderer and collision use the same ballistic position and rotation. `reference/flash-collision.json` stores only numeric geometry/labels from the pinned SWF. `Bounds.java` reproduces it using an external JPEXS 26.4.0 jar. The original binary, artwork and ActionScript are not emitted by this extractor.

These bounds come from the original display list, not a screenshot silhouette. Runtime filters, subtle transform/state ordering and first-charge tick ordering can still differ; this is not a pixel- or tick-exact certification. Terrain validation still uses a distance-to-road approximation.

### Actual browser results

Two full local attempts were played through the real UI against the revised combat. The first lost on wave nine after delayed spending. The second completed all eleven waves, with pauses for inspection and 2× playback early, then 1× from wave four. No runtime state, gold, enemy health or outcome was changed through developer controls.

| Measurement | Original reference run | Revised local browser run |
| --- | --- | --- |
| Difficulty / upgrades | Normal, no hero or purchased stars | Same bounded rules |
| Outcome | Victory, 10 lives, 2 stars | Victory, 5 lives |
| Gold remaining | 352 | 280 |
| Enemy kills | Not recorded | 314 of 329; 15 leaked |
| Tower sites at finish | Barracks 12, artillery 10, archers 11/5/2, mages 6/4 | Same seven sites; all tier two |
| Fire casts | Three, during waves 4/8/11 | Three, during waves 4/8/11 |
| Simulated duration | Not recorded | 16,426 ticks / 547.53 seconds |

The local run lost six lives around the wave-three wulf rush, one near the end of wave eight, and eight near the end of wave nine. Waves ten and eleven leaked none; all ogres were defeated. Purchases, reinforcements and fire were human-timed, not synchronized between games. Five versus ten lives is therefore an observation, **not evidence that ours is a fixed amount harder**. Both runs punish delayed defense and concentrate pressure in the mass rush; source-verified corrections were used instead of arbitrary cash/HP balancing.

The [complete browser-exported trace](playtests/2026-11-07-melee-browser-win.json) records commands and outcomes for seed `12648430`. This command trace originally reproduced the exact local result. The later opening-map source audit changes its replay to thirteen lives and 361 gold; see the follow-up report. The historical browser score and file remain unchanged. This supplements the browser playthrough; it does not replace it or prove the original shares our RNG.

Validation: **32 Kingdom Rush tests**, **4 library boundary tests**, production build. Save compatibility is now `pagras-flash-v1.13-r2` because melee ownership/destination state changed. Older in-progress battles are rejected safely; completed best results remain separate.

To reproduce the numeric display bounds (JPEXS jar and original SWF supplied locally):

```sh
java -Djava.awt.headless=true -cp /path/to/ffdec.jar scripts/games/kingdom-rush/Bounds.java /path/to/original.swf
```
