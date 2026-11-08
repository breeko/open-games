# Kingdom Rush — opening campaign

A bounded recreation of Southport, The Farmlands, Pagras, Twin Rivers Pass, Silveroak Forest and The Citadel (stages 1–6) of the original Kingdom Rush for testing appearance, interaction, combat and balance in Open Games. This is an independent TypeScript/Canvas implementation with reference artwork, not a port of the mod engine and not a verified exact retail recreation.

## Play

```sh
bun run dev
```

Open `/games/kingdom-rush/` at the printed address, or choose Kingdom Rush from the library. For the preview started during implementation, use [the local level](http://localhost:5174/games/kingdom-rush/). On an iPad on the same Wi-Fi, use the printed Network address with the same path. Keep the Mac and preview running.

- Tap a foundation, then choose Archers, Barracks, Mages or Artillery.
- Open **ⓘ Guide** for every tower tier, upgrade cost, damage, range, firing interval, soldier stats and powers. **ⓘ Stats** on a selected tower opens its family and highlights the current tier. The guide pauses the battle while reading and respects an existing pause. The [player reference](player-guide.md) also lists current values.
- Tap a tower to upgrade, sell or change a barracks' rally point. Southport caps towers at tier 1; The Farmlands and Pagras allow tier 2; Twin Rivers Pass unlocks tier 3. Silveroak Forest adds a wave-five base ranger upgrade, an existing archer tower and a repairable elf camp. The Citadel offers base Rangers and Arcane Wizards.
- Tap Reinforcements, then a road; tap Rain of Fire, then a target. Tap Cancel or press Escape to cancel targeting.
- Prepare with 265 / 220 / 300 / 680 / 700 / 700 gold in Southport / The Farmlands / Pagras / Twin Rivers Pass / Silveroak Forest / The Citadel and 20 lives, then start the battle. Later waves can be called early for extra gold and spell recharge after the wave flag appears (50 ticks after the spawners finish).
- Pause freezes the simulation and powers. Switching away pauses automatically; resume explicitly. Space also toggles pause.
- 1×/2× changes playback speed without changing simulation rules.
- Restart reuses the displayed seed. The tools section allows a different seed, path/tower-number overlays and JSON battle-trace export.
- Battles autosave every two seconds, after commands, on pause and when leaving/backgrounding the page. Refresh or return to resume the same battle paused, with no offline simulation. Restart replaces it; victory/defeat clears the ongoing battle and preserves your completed record.
- Saves are local to this browser and origin. Invalid/incompatible sessions are retained until you choose Restart, and the save status explains storage failures. A forced browser termination may lose changes since the last successful save. Complete diagnostic event history survives new saves; older saves without history export an incomplete-history marker.
- The Maps button opens the campaign chooser. All six maps are available; each keeps its own battle and best result. Completing Southport or The Farmlands offers Next map. Pagras retains its existing save keys. Storage failures do not prevent playing.

## What is implemented

| Map | Starting gold | Waves / enemies | Tower sites | Maximum tier |
| --- | --- | --- | --- | --- |
| Southport | 265 | 7 / 56 | 8 | 1 |
| The Farmlands | 220 | 7 / 154 | 7 | 2 |
| Pagras | 300 | 11 / 329 | 12 | 2 |
| Twin Rivers Pass | 680 | 13 / 329 | 15 | 3 |
| Silveroak Forest | 700 | 15 / 235 plus spiderlings | 13 plus elf camp | 3; base Rangers from wave 5 |
| The Citadel | 700 | 17 / 429 plus Golem Heads | 15 | 3; base Rangers / Arcane Wizards |

Southport unlocks reinforcements at wave 3 and fire at wave 7, following the original notification waves. Tutorials/story transitions remain omitted. Direct links use `?level=1`, `?level=2` or `?level=3`; the existing URL without a query still opens Pagras. Map artwork loads on demand; selecting another map saves/pauses the current one and restores the destination paused when a battle exists.

Phone landscape fills the viewport with the map and overlays compact controls. Terrain adapts to the wide viewport while sprites retain their proportions. Portrait retains the original map aspect; desktop retains its header and controls.

Pagras has two entrances, three subpaths per route, twelve fixed tower sites, eleven wave groups and 329 enemies. The roster includes goblins, armored orcs, wulves, shamans and ogres. The prototype includes four tower families with source-based base costs, two tiers, separate physical/magic/explosion damage handling, attack wind-ups, projectile travel, soldiers, blocking, rally commands, death/respawn, shaman healing, wulf melee dodging and both powers.

Southport and The Farmlands now use the original Flash numeric paths and placements; Pagras retains pinned desktop geometry. Campaign spacing now follows the original Armor Games Flash v1.13, compared in the browser on November 7. See [original comparison](original-comparison.md) for observations, corrected rules and remaining limitations. Normal base health/speed settings are used. Heroes, tower star-upgrade branches and consumable items are excluded. Power star training is optional and defaults to zero; traces identify the active loadout. That starting point can differ from a normal campaign player's upgrade state.

## Sources and asset preparation

The initial [feasibility audit](feasibility-audit.md) identified missing base-game data. The stage 3 gaps were subsequently recovered from these pinned community sources:

| Material | Source | Use |
| --- | --- | --- |
| Stage layout and full path nodes; historical desktop wave schedule | [DanQZ/KR1-Smarter-Soldiers-Mod at fa84f20](https://github.com/DanQZ/KR1-Smarter-Soldiers-Mod/tree/fa84f20b6fc0cff19f5c8e13c588736fcf228fa7) | Literal tables only; modified soldier AI is not reused. |
| Initial unit, tower, projectile and power definitions | Same older reference's `kr1/game_templates.lua`, `all/templates.lua`, `kr1/game_settings.lua` | Numeric research for the independently authored simulation. |
| Converted artwork, sprite descriptors and animations | [wicked-knife/KingdomRushWeb at 3e4eac4](https://github.com/wicked-knife/KingdomRushWeb/tree/3e4eac4110ce0e228f1300ca145cd7c29d2dbc8a/data/level03) | Visual data only. Its source manifest identifies upstream Dove 2.1.0.6. |

The two community wave schedules agree exactly, including routes, spacing and alternating enemy chunks. They disagree on starting gold: the older source has **300**, while the newer export has **330**. The latter also declares enemy HP/speed buffs. The prototype imports neither its starting economy nor its combat rules. Original Flash campaign enemy spacing is faster than both community exports; `reference/flash-pagras.json` overrides timing with verified Flash facts while preserving those historical inputs.

For maps 1–2, [Southport](level01-manifest.json) and [The Farmlands](level02-manifest.json) record all input hashes. Their campaign waves and cash come directly from the pinned original Flash facts; community rules are not imported. Both opening maps have now had full original-versus-local browser runs. Southport finished at 13 lives original / 15 local. Farmlands finished at six lives in the original but lost in local manual runs; the source corrections improve the same-command local replay, and exact difficulty parity remains unproven. See [opening calibration](opening-calibration.md) for the full evidence and limitations.

The [reference manifest](reference-manifest.json) records pinned source URLs and SHA-256 hashes for every preparation input. The [earlier source inventory](source-inventory.json) remains a historical record of the initial audit, not the current asset pack.

To reproduce the bounded pack, with Python/Pillow installed:

```sh
python3 scripts/games/kingdom-rush/prepare-reference.py
# Maps 1–2 additionally require local original Flash source exports and the pinned SWF:
python3 scripts/games/kingdom-rush/prepare-campaign.py /path/to/scripts /path/to/original.swf
python3 scripts/games/kingdom-rush/extract-flash-paths.py /path/to/scripts /path/to/original.swf
```

This downloads pinned files into the system temporary directory, parses literal Lua tables without executing Lua, checks both wave schedules, preserves original logical geometry, and repacks the visual export into one 2048×2048 atlas with 898 frames and aliases. Background art is scaled and center-cropped to the 1024×768 reference viewport. Rendering preserves original-canvas dimensions, trims, anchors, offsets and directional animation states. Full input sheets and unrelated game assets are not put in the runtime pack. The preparation cache is tagged with source revisions.

The Pagras reference pack is approximately 6.2 MB (PNG art plus metadata); other maps load their own packs (Citadel is about 18 MB). The decoded atlas is 16 MiB; background and browser overhead are additional. This is a bounded memory estimate, not an iPad benchmark.

Original Ironhide art is separate from code provenance. Community availability and converter metadata do not establish permission to redistribute the original game artwork. Exact original pixels are also unverified because these visual exports pass through a heavily modified project. The initial prototype was local; Branko authorized committing and deploying the Kingdom Rush section in a subsequent November 7 follow-up.

## Fidelity ledger

| Area | Current status |
| --- | --- |
| Waves | 329 enemies / eleven groups. Composition agrees across references; spacing targets Flash v1.13. Chunk transitions, first-spawn waits, flag delay and countdown retention have regression checks. |
| Tower locations, rally defaults and subpath nodes | Imported from the older source; only the coordinate origin is converted. |
| Timing | Fixed 30 Hz source ticks; rendering and 2× playback do not alter rules. Long browser stalls are not simulated as a catch-up burst. |
| Economy | 300 starting gold; source base costs, kill rewards and 60% sell refund. No star upgrades. |
| Stats | Compared with publisher-served Flash v1.13. Corrected damage RNG, artillery tier-two damage and several attack wind-ups. Desktop coordinate scaling remains 1.28. |
| Armor and targeting | Physical/magic/true/explosion routes, integer rounding, elliptical range and foremost-target selection implemented. Tie ordering and some source visibility rules remain approximations. |
| Barracks | Three owned soldiers, movement, target blocking, release on rally, deaths, regeneration and ten-second replacement. One-second construction, twelve-tick door delay and idle-regeneration delay are modeled. Primary reservations, same-side support slots, shared acquisition area, formation and rally redeployment follow Flash. Full door queues and minor tick ordering remain approximate. |
| Projectiles | Flash wind-ups, seventeen-tick arrows, twenty-seven-tick bombs, arrow lead/error and misses, artillery node prediction, flatter blast ellipse and center-to-edge damage falloff. Arrows test extracted per-frame display bounds in their final three flight frames, with shared rendered/collision trajectory and rotation. Bolts accelerate and home with saved flight state; runtime display filters remain simplified. Charged bombs retain their aim after target loss, with original directional-ellipse damage falloff. |
| Shamans and wulves | Healing range, cooldown/cast delay, heal amount and melee dodge chance implemented. Shamans can heal themselves, heal on tick fourteen, remain stationary for twenty-eight ticks and recharge after casting. Healing cannot interrupt a melee wind-up. Flash dictionary ordering and subtle tick ordering remain approximate. |
| Powers | Three fireballs, damage/radius/spread and cooldown, two temporary reinforcements and cooldown. Early calls recharge both powers by the remaining countdown. Fireballs launch ten ticks apart from the top edge with height-dependent travel; exact particle trajectories, placement walkability and advanced upgrades remain approximate. |
| Art | Animated reference units, layered towers and stage decorations. Community-export pixels have not been checked against an unmodified installation; background crop alignment needs comparison. Projectiles and impact effects currently use simple Canvas drawings. |
| Audio, heroes, tower star-upgrade branches, story, achievements and stages beyond 6 / alternate modes | Omitted from this bounded proof. Power star upgrades and the current advanced tower skills are now available. |
| Retail balance | Original Flash Normal/no-hero/no-upgrade play comparison performed; source-verified corrections implemented. Exact same-command outcome parity is not certified; see the comparison report. |
| iPad 6th generation / iPadOS 17.7.11 | Desktop viewport checks performed; physical-device interaction, frame pacing and memory remain untested. |

## Validation and comparison

```sh
bun run test:kingdom-rush
bun test tests/library-boundaries.test.ts
bun run build
```

Tests cover imported geometry and waves, source-derived spawn timing, armor/rounding, economy guards, wave overlap/early rewards, pause, soldier blocking/rally/respawn, shaman cast timing, defeat, a complete seeded mixed-defense campaign, damage distribution, spell recharge, splash falloff, arrow misses, full shaman casting and replay determinism. Atlas checks cover visible defaults and all related animation frames, sheet bounds and rejected modified economy values.

A historical browser Pagras run won with five lives and 280 gold. Source corrections made since that run change its command replay to thirteen lives and 361 gold; the historical record is preserved, not relabeled as a new browser run. The original comparison run won with ten lives; command timing was not synchronized. Browser checks also exercise tower construction, upgrades, spell selection/placement, cooldown feedback, pause, restart and responsive layouts. See [progress](progress.md) for current results.

For comparison with the original, choose the same edition, Normal difficulty, hero state and star upgrades. Record placement, purchase and spell order plus wave calls. Compare first spawn, first contact, cash after kills/purchases, armor performance, soldier deaths, leaks, wave duration and outcome. Export traces from the tools panel; the JSON includes a seed, source identifiers, command/event ticks, spawns, purchases, deaths, rewards and outcome. It is diagnostic output, not a claim that the original shares our RNG sequence. A trace replay viewer is not implemented yet.

## Architecture review

The new library separation is appropriate. No shared-engine refactor is recommended. Kingdom Rush owns its HTML page, Canvas simulation/renderer, styles, assets, credits, preparation tools, tests, diagnostics and storage. It imports no Garden Guard code and adds no runtime dependencies. The library receives metadata and a build entry only; its initial bundle does not load the simulation or reference atlas.

The other agent's Garden Guard changes are intentionally outside this game's scope. Do not bulk stage or commit the shared working directory while both tasks are active.

Twin Rivers Pass uses original Flash v1.13 paths, tower/rally sites, 680 starting gold and 13 paired-route waves (329 enemies). It adds bandits, brigands and all four tier-three tower upgrades. See [the map report](twin-rivers-pass.md) and [pinned inputs](level04-manifest.json). Open it directly with `?level=4`; its save and completed record are independent.

Silveroak Forest adds the fifth map, 15 original waves and three entrances, matriarch nests, worgs, marauders and hired elves. See [the map and calibration report](silveroak-forest.md) for browser evidence, source corrections and limitations. It is available with `?level=5`.

The Citadel adds stage six, flying Gargoyles, Dark Knights, Shadow Archers, Arcane Wizards and the Juggernaut encounter. The [map and calibration report](the-citadel.md) distinguishes source facts, browser boss-practice evidence and unresolved full-campaign difficulty. Tools → Practice wave tests later encounters without changing the campaign save or completed record.

Rangers and Arcane Wizards now have all four three-rank skills. Optional campaign-star training adds the five original upgrades for each power; use **Guide → ★ Power upgrades** before battle. Existing completed records supply stars, and Reset refunds them. See [skills and power upgrades](skills-and-power-upgrades.md) for behavior, source quirks, validation and remaining visual/parity limits.
