# Kingdom Rush — opening campaign

A bounded recreation of Southport, The Farmlands and Pagras (stages 1–3) of the original Kingdom Rush for testing appearance, interaction, combat and balance in Open Games. This is an independent TypeScript/Canvas implementation with reference artwork, not a port of the mod engine and not a verified exact retail recreation.

## Play

```sh
bun run dev
```

Open `/games/kingdom-rush/` at the printed address, or choose Kingdom Rush from the library. For the preview started during implementation, use [the local level](http://localhost:5174/games/kingdom-rush/). On an iPad on the same Wi-Fi, use the printed Network address with the same path. Keep the Mac and preview running.

- Tap a foundation, then choose Archers, Barracks, Mages or Artillery.
- Tap a tower to upgrade, sell or change a barracks' rally point. Southport caps towers at tier 1; The Farmlands and Pagras allow tier 2.
- Tap Reinforcements, then a road; tap Rain of Fire, then a target. Tap Cancel or press Escape to cancel targeting.
- Prepare with 265 / 220 / 300 gold in Southport / The Farmlands / Pagras and 20 lives, then start the battle. Later waves can be called early for extra gold and spell recharge after the wave flag appears (50 ticks after the spawners finish).
- Pause freezes the simulation and powers. Switching away pauses automatically; resume explicitly. Space also toggles pause.
- 1×/2× changes playback speed without changing simulation rules.
- Restart reuses the displayed seed. The tools section allows a different seed, path/tower-number overlays and JSON battle-trace export.
- Battles autosave every two seconds, after commands, on pause and when leaving/backgrounding the page. Refresh or return to resume the same battle paused, with no offline simulation. Restart replaces it; victory/defeat clears the ongoing battle and preserves your completed record.
- Saves are local to this browser and origin. Invalid/incompatible sessions are retained until you choose Restart, and the save status explains storage failures. A forced browser termination may lose changes since the last successful save. Diagnostic event history starts afresh after restoration.
- The Maps button opens the campaign chooser. All three maps are available; each keeps its own battle and best result. Completing Southport or The Farmlands offers Next map. Pagras retains its existing save keys. Storage failures do not prevent playing.

## What is implemented

| Map | Starting gold | Waves / enemies | Tower sites | Maximum tier |
| --- | --- | --- | --- | --- |
| Southport | 265 | 7 / 56 | 8 | 1 |
| The Farmlands | 220 | 7 / 154 | 7 | 2 |
| Pagras | 300 | 11 / 329 | 12 | 2 |

Southport unlocks reinforcements at wave 3 and fire at wave 7, following the original notification waves. Tutorials/story transitions remain omitted. Direct links use `?level=1`, `?level=2` or `?level=3`; the existing URL without a query still opens Pagras. Map artwork loads on demand; selecting another map saves/pauses the current one and restores the destination paused when a battle exists.

Phone landscape fills the viewport with the map and overlays compact controls. Terrain adapts to the wide viewport while sprites retain their proportions. Portrait retains the original map aspect; desktop retains its header and controls.

Pagras has two entrances, three subpaths per route, twelve fixed tower sites, eleven wave groups and 329 enemies. The roster includes goblins, armored orcs, wulves, shamans and ogres. The prototype includes four tower families with source-based base costs, two tiers, separate physical/magic/explosion damage handling, attack wind-ups, projectile travel, soldiers, blocking, rally commands, death/respawn, shaman healing, wulf melee dodging and both powers.

Geometry is imported from the pinned desktop reference. Campaign spacing now follows the original Armor Games Flash v1.13, compared in the browser on November 7. See [original comparison](original-comparison.md) for observations, corrected rules and remaining limitations. Normal base health/speed settings are used. Heroes, star upgrades and consumable items are excluded so comparisons have a defined starting point. That starting point can differ from a normal campaign player's upgrade state.

## Sources and asset preparation

The initial [feasibility audit](feasibility-audit.md) identified missing base-game data. The stage 3 gaps were subsequently recovered from these pinned community sources:

| Material | Source | Use |
| --- | --- | --- |
| Stage layout and full path nodes; historical desktop wave schedule | [DanQZ/KR1-Smarter-Soldiers-Mod at fa84f20](https://github.com/DanQZ/KR1-Smarter-Soldiers-Mod/tree/fa84f20b6fc0cff19f5c8e13c588736fcf228fa7) | Literal tables only; modified soldier AI is not reused. |
| Initial unit, tower, projectile and power definitions | Same older reference's `kr1/game_templates.lua`, `all/templates.lua`, `kr1/game_settings.lua` | Numeric research for the independently authored simulation. |
| Converted artwork, sprite descriptors and animations | [wicked-knife/KingdomRushWeb at 3e4eac4](https://github.com/wicked-knife/KingdomRushWeb/tree/3e4eac4110ce0e228f1300ca145cd7c29d2dbc8a/data/level03) | Visual data only. Its source manifest identifies upstream Dove 2.1.0.6. |

The two community wave schedules agree exactly, including routes, spacing and alternating enemy chunks. They disagree on starting gold: the older source has **300**, while the newer export has **330**. The latter also declares enemy HP/speed buffs. The prototype imports neither its starting economy nor its combat rules. Original Flash campaign enemy spacing is faster than both community exports; `reference/flash-pagras.json` overrides timing with verified Flash facts while preserving those historical inputs.

For maps 1–2, [Southport](level01-manifest.json) and [The Farmlands](level02-manifest.json) record all input hashes. Their campaign waves and cash come directly from the pinned original Flash facts; community rules are not imported. These new maps have browser smoke checks and complete automated campaigns, but have not yet had the original-versus-local full browser comparison performed for Pagras.

The [reference manifest](reference-manifest.json) records pinned source URLs and SHA-256 hashes for every preparation input. The [earlier source inventory](source-inventory.json) remains a historical record of the initial audit, not the current asset pack.

To reproduce the bounded pack, with Python/Pillow installed:

```sh
python3 scripts/games/kingdom-rush/prepare-reference.py
# Maps 1–2 additionally require local original Flash source exports and the pinned SWF:
python3 scripts/games/kingdom-rush/prepare-campaign.py /path/to/scripts /path/to/original.swf
```

This downloads pinned files into the system temporary directory, parses literal Lua tables without executing Lua, checks both wave schedules, preserves original logical geometry, and repacks the visual export into one 2048×2048 atlas with 898 frames and aliases. Background art is scaled and center-cropped to the 1024×768 reference viewport. Rendering preserves original-canvas dimensions, trims, anchors, offsets and directional animation states. Full input sheets and unrelated game assets are not put in the runtime pack. The preparation cache is tagged with source revisions.

The served reference pack is approximately 6.2 MB (PNG art plus metadata). The decoded atlas is 16 MiB; background and browser overhead are additional. This is a bounded memory estimate, not an iPad benchmark.

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
| Projectiles | Flash wind-ups, seventeen-tick arrows, twenty-seven-tick bombs, arrow lead/error and misses, artillery node prediction, flatter blast ellipse and center-to-edge damage falloff. Arrows test extracted per-frame display bounds in their final three flight frames, with shared rendered/collision trajectory and rotation. Accelerating bolts and runtime display filters remain simplified. |
| Shamans and wulves | Healing range, cooldown/cast delay, heal amount and melee dodge chance implemented. Shamans can heal themselves, heal on tick fourteen, remain stationary for twenty-eight ticks and recharge after casting. Healing cannot interrupt a melee wind-up. Flash dictionary ordering and subtle tick ordering remain approximate. |
| Powers | Three fireballs, damage/radius/spread and cooldown, two temporary reinforcements and cooldown. Early calls recharge both powers by the remaining countdown. Fireballs launch ten ticks apart from the top edge with height-dependent travel; exact particle trajectories, placement walkability and advanced upgrades remain approximate. |
| Art | Animated reference units, layered towers and stage decorations. Community-export pixels have not been checked against an unmodified installation; background crop alignment needs comparison. Projectiles and impact effects currently use simple Canvas drawings. |
| Audio, heroes, star upgrades, story, achievements and stages beyond 3 / alternate modes | Omitted from this bounded proof. |
| Retail balance | Original Flash Normal/no-hero/no-upgrade play comparison performed; source-verified corrections implemented. Exact same-command outcome parity is not certified; see the comparison report. |
| iPad 6th generation / iPadOS 17.7.11 | Desktop viewport checks performed; physical-device interaction, frame pacing and memory remain untested. |

## Validation and comparison

```sh
bun run test:kingdom-rush
bun test tests/library-boundaries.test.ts
bun run build
```

Tests cover imported geometry and waves, source-derived spawn timing, armor/rounding, economy guards, wave overlap/early rewards, pause, soldier blocking/rally/respawn, shaman cast timing, defeat, a complete seeded mixed-defense campaign, damage distribution, spell recharge, splash falloff, arrow misses, full shaman casting and replay determinism. Atlas checks cover visible defaults and all related animation frames, sheet bounds and rejected modified economy values.

A complete browser Pagras run won with five lives and 280 gold; its exported command trace reproduces that exact result in a regression check. The original comparison run won with ten lives; command timing was not synchronized. Browser checks also exercise tower construction, upgrades, spell selection/placement, cooldown feedback, pause, restart and responsive layouts. See [progress](progress.md) for current results.

For comparison with the original, choose the same edition, Normal difficulty, hero state and star upgrades. Record placement, purchase and spell order plus wave calls. Compare first spawn, first contact, cash after kills/purchases, armor performance, soldier deaths, leaks, wave duration and outcome. Export traces from the tools panel; the JSON includes a seed, source identifiers, command/event ticks, spawns, purchases, deaths, rewards and outcome. It is diagnostic output, not a claim that the original shares our RNG sequence. A trace replay viewer is not implemented yet.

## Architecture review

The new library separation is appropriate. No shared-engine refactor is recommended. Kingdom Rush owns its HTML page, Canvas simulation/renderer, styles, assets, credits, preparation tools, tests, diagnostics and storage. It imports no Garden Guard code and adds no runtime dependencies. The library receives metadata and a build entry only; its initial bundle does not load the simulation or reference atlas.

The other agent's Garden Guard changes are intentionally outside this game's scope. Do not bulk stage or commit the shared working directory while both tasks are active.
