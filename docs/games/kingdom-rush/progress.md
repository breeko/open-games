# Kingdom Rush progress

## November 7, 2026 — bounded Pagras proof

### Decisions

- Keep the original Kingdom Rush as the reference, stage 3 (Pagras), campaign mode, Normal base stats, no hero/star upgrades.
- Keep the existing independent-game architecture. No Garden Guard internals or speculative shared engine.
- Use a small, authored TypeScript simulation and Canvas renderer. No third-party mod code executes in the browser.
- Use pinned community references with provenance. Distinguish imported source data, numerical research, visual exports and approximated behavior.

### Completed

- Recovered all stage 3 routes/subpaths, tower sites, default rally points and the complete eleven-wave schedule from the older reference.
- Cross-checked wave tables against an independent newer export; schedules match. Identified and rejected its 330 starting gold and gameplay buffs; retained the older 300-gold economy.
- Prepared 898 sprite frames into one 2048-square atlas, with trim/original-size/alias metadata, directional animations and a bounded background.
- Implemented construction, two tower tiers, selling, source-based combat stats, range/armor rules, 30 Hz timing, seeded random choices, eleven waves, early-call rewards, soldiers and rallying, shaman healing, melee dodge, reinforcements and rain of fire.
- Added pause/visibility handling, 2× playback, victory/defeat/restart, namespaced best-result storage, source/path diagnostics and JSON trace export.
- Added independent HTML/build entry and metadata-only library listing. No new package dependencies.
- Added game-specific documentation, source hashes, preparation tool and credits. No push or deployment.

### Validation

- Eleven game-specific automated checks pass, including a complete eleven-wave mixed-defense run and identical seeded replay.
- Three library-boundary checks pass: entry/cover ownership, no gameplay in the library import graph, no cross-game imports.
- Production build passes; the Kingdom Rush entry builds independently and does not import Phaser. The existing Garden Guard bundle advisory is unrelated to this implementation.
- Initial desktop browser checks confirm complete map/layered tower sprites, construction and upgrades with gold deductions, animated enemy waves, power targeting/cooldown feedback and pause.
- Viewport checks at 1024×768 and 390×844 show a fully visible board and reachable controls; they do not substitute for physical iPad testing.

### Next fidelity work

1. Obtain an unmodified reference installation/build and record comparable Normal/no-upgrade Pagras runs. Community exports alone do not certify exact balance or original pixels.
2. Compare path/background alignment, attack timings, cash and leaks against those runs.
3. Match arrow prediction/misses, accelerating magic bolts and artillery target prediction; replace simple projectile/effect drawings if needed.
4. Match melee slot selection, animation-dependent soldier spawn/respawn/rally behavior and exact shaman targeting/interruption.
5. Verify fireball timing/spread, reinforcement terrain restrictions and early-call power-cooldown behavior.
6. Test busy combat on the physical iPad. Audio and other levels come after this reference proof is assessed.

Full limitations and source details are maintained in [README.md](README.md). The original feasibility audit remains historical; its stage 3 data gaps are now resolved for this prototype.

## November 7, 2026 — publishing follow-up

Branko authorized a commit and deployment limited to Kingdom Rush. The game's own folders and only its additions to the shared README, catalog, package scripts and build entries are in scope. Garden Guard work remains owned by the other agent.

The prototype was played in the browser, and a seeded automated defense completed all eleven waves. It has **not** been played side by side with an unmodified original. The next fidelity milestone is a recorded original Pagras run with matched difficulty, hero and star-upgrade state, followed by comparisons of spawn/contact timing, purchases, soldier deaths and leaks. Source-data comparisons and prototype playtests do not replace that milestone.


## November 7, 2026 — original Flash play comparison

- Played publisher-hosted Flash v1.13 Pagras on Normal with no hero or purchased star upgrades. First run lost on wave nine; second run completed all eleven waves with ten lives and two stars. All final ogres were defeated.
- Matched the three-tower opening in the local browser. Preserved 300 gold, twenty lives, eleven groups and 329 enemies; corrected edition-specific timing using the publisher binary's factual parameters.
- Fixed damage RNG, artillery damage/falloff and prediction, arrow lead/misses, wind-ups/flights, countdown retention and flag delay, early-call power recharge, shaman self-heal/full casting/recharge, construction/door/regeneration timing and pre-battle power gating.
- Nineteen Kingdom Rush checks and three game-boundary checks pass. A paced seeded defense completes the corrected campaign with sixteen lives. The production build passes.
- Kept all changes in Kingdom Rush source, tests, scripts and documentation. No shared refactor or Garden Guard edits.

See [the original comparison report](original-comparison.md) for publisher reference/hash, exact corrected rules, run observations and remaining approximations. The earlier entries above describe the state before this comparison.


## November 7, 2026 — melee/collision and full browser victory

- Replaced simplified melee with exclusive primary reservations during approach, same-side support slots, original formation/shared acquisition area, source movement speed, rally redeployment and release rules. Corrected enemy wind-ups, wulf cycle, farmer placement and tower-door replacement behavior.
- Extracted numeric per-frame enemy/arrow/health-bar display geometry from the pinned original SWF using research-only `Bounds.java`. Arrow hit testing now uses those bounds and the same ballistic position/rotation as rendering, during the final three flight frames.
- Played two local browser attempts. The first lost on wave nine; the second won all eleven waves with **5 lives, 280 gold, 314 kills**, at tick **16,426**. The existing original Normal/no-hero/no-stars victory had ten lives and 352 gold. Same seven final tower sites and three fire casts, but human command timings differ, so exact difficulty parity remains unproven.
- Saved the full exported trace under `playtests/2026-11-07-melee-browser-win.json`. Its command replay reproduces the local browser result exactly. Thirty-two game checks, four library boundaries and the production build pass.
- Bumped in-progress save compatibility to r2 for new melee state; completed best results stay separate. Kept source, tests, extraction tooling and documentation entirely inside Kingdom Rush folders.

See [the detailed comparison](original-comparison.md#melee-and-collision-follow-up-full-browser-campaign) for observations, reproducibility and remaining approximations. No arbitrary health/cash adjustment was introduced to force equal scores.


## November 7, 2026 — compact phone landscape controls

- Phone landscape now fills the available viewport height with the complete 4:3 battlefield. Header, save-status paragraph and research tools no longer consume mobile space. The spare side area carries compact power, wave and navigation controls; desktop retains its existing layout.
- Power buttons show an icon and cooldown, with accessible names. Tower/build/rally controls appear in a compact overlay only when selected. Mobile controls retain at least 44px touch targets and account for safe-area edges. Portrait has a usable centered-map fallback.
- Browser checks at 844×390 and 667×375 confirm full-height map, no page overflow, tower selection/purchase, start-wave, reinforcement targeting/cooldown and pause. Also checked 390×844 portrait and the default desktop viewport. Production build and diff whitespace checks pass. Physical Safari browser-bar/notch behavior remains to be checked on a phone.
- Layout and button presentation only; no combat, save format, shared library or Garden Guard changes.


## November 7, 2026 — edge-to-edge landscape map

- Replaced landscape side gutters with a viewport-filling battlefield. The entire map is fitted horizontally and vertically; no roads or tower sites are cropped. Terrain/range drawing adapts to the wider layout while unit/tower sprites and end-state text retain their proportions.
- Controls overlay the map, with navigation in one top-right row. Rendering resolution now follows both displayed dimensions, matching existing pointer-coordinate conversion.
- Browser verified at 844×390: edge-to-edge map, tower purchase, start-wave and reinforcement placement. Build passes. This changes presentation only; combat coordinates and timing remain unchanged.


## November 7, 2026 — opening campaign expansion

- Added original Southport and The Farmlands map artwork, scenery, path lanes, tower sites, source Flash waves and starting gold. Southport: 265 gold, 7 waves / 56 enemies, 8 sites, tier-one cap; Farmlands: 220 gold, 7 waves / 154 enemies, 7 sites, tier-two cap. Southport powers unlock on source notification waves 3/7.
- Added a thumbnail map chooser, direct map URLs, completed best-defense records per map and a Next map action after victory. Maps remain freely selectable. Each map has a separate autosave. Existing Pagras keys and compatible r2 sessions remain valid.
- Shared Kingdom Rush simulation now owns an explicit level reference; no global map mutation or cross-game imports. The renderer loads only the selected map's atlas/background/scenery. Trace exports identify the map. Save validation checks routes, nodes, sites and tier caps against the saved map.
- Browser smoke checks in phone landscape covered both new boards, purchases, start-wave, reinforcement placement, chooser and paused restoration when switching back. The chooser retained the existing five-life Pagras record. Full new-map browser victories versus the original are still outstanding.
- Thirty-nine Kingdom Rush checks and four boundary checks pass. Automated complete defenses win Southport with 20 lives and Farmlands with 18; repeated seeds match. The previously recorded full-browser Pagras command trace still reproduces its exact five-life victory. Production build passes.
- Manifests record pinned input URLs/hashes. Preparation uses literal tables, numeric Flash facts and reference artwork; downloaded game code is not executed or bundled. Added about 10 MB of map assets, fetched only for the selected map (chooser thumbnails load each background).
- Next campaign step: Twin Rivers Pass with source-verified bandit/brigand behavior and tier-three towers. Audio, purchased star upgrades and physical iPad/phone performance checks remain open.


## November 7, 2026 — opening-map calibration pass

- Played original Flash Normal Southport and Farmlands through all seven waves with no hero/star purchases, then completed local browser attempts with comparable tower sites, spending order and powers. Southport: original victory 13 lives / 216 gold, local victory 15 / 216. Farmlands: original victory 6 / 297; first local loss in wave 7, and corrected local loss late in wave 7 (270 gold). Farmlands parity remains unresolved; this is not recorded as a matched browser victory.
- Corrected escaped-enemy income, original opening-map path nodes/sites and activation/escape boundaries, mage/artillery release expressions (10 frames each), charged bombs surviving target death, directional ellipse splash falloff, accelerating homing magic bolts and source launcher offsets. No numeric health/cash/spawn multipliers were tuned to equalize scores.
- Preserved both Farmlands browser traces. Replaying the first loss's exact commands under the final code now wins with 5 lives / 297 gold, isolating the rule fixes from new human decisions. The original comparison still lacks frame-synchronized inputs. Twenty alternate local seeds for that fixed schedule produced eight wins and twelve losses, illustrating the narrow margin rather than certifying original win-rate parity.
- Preserved historical Pagras/Southport browser records. Current Pagras command replay wins with 13 lives / 361 gold; Southport retains 15 / 216 and finishes eight ticks earlier than its pre-final-projectile browser trace. New opening saves use a new path compatibility marker; completed records and Pagras keys are retained.
- Tests cover exact corrected browser-defeat replay, improved pre-fix-command replay, original path boundaries, leaked rewards, charge release, target-loss bombs, diagonal falloff, bolt homing/acceleration and saved flight state. Full report: opening-calibration.md. Tightening Farmlands command timing and repeating original runs takes priority over declaring exact difficulty parity.

## November 7, 2026 — recovery-clock follow-up

- Corrected soldier recovery to preserve partial healing progress during movement/combat, reset the idle delay on damage and initialize fresh clocks on respawn. Upgrades retain the living unit's idle delay and reset heal progress. Both clocks persist; old saves default safely.
- Completed a stricter Farmlands browser control with only barracks 4 and artillery 7 bought before battle: original Normal lost in wave 7; local lost in wave 6 with 325 gold / 66 kills. Screenshots and actual local command trace are retained. No later purchases, powers, rally changes or early calls. The local sample still looks harsher; calibration remains open.
- Twenty-one headless fixed-defense seeds all lost (18 in wave 6, three in wave 7). This shows variation, not original win-rate parity. Existing failed-command and Pagras replays retain their previous corrected outcomes. No numeric balance values changed. See opening-calibration.md for the detailed follow-up.
- Fifty-three Kingdom Rush tests, four boundary checks and production build pass. Only Kingdom Rush files changed.


## November 7, 2026 — Twin Rivers Pass

- Added the fourth freely selectable map: original Flash paths/sites, 680 gold, 20 lives, 13 paired-route waves / 329 enemies. Added pinned visual assets and input hashes, separate saves/results, and Next map from Pagras.
- Added bandits (melee dodge), armored brigands, all four tier-three towers and knight soldiers using original Normal facts. New collision bounds come from the pinned Flash symbols. Existing stage caps, saves, enemy bounds and regression outcomes remain unchanged.
- Fixed nearby foundations being intercepted by taller adjacent tower selection areas. Upgrade prices/affordability now follow the next tier.
- Original Normal fixed seven-tower control lost in wave 7; the equivalent local headless control lost in wave 6. Local browser attempt with later purchases/powers lost in wave 8. Automated complete defense wins all 13 waves with five lives. These are distinct results: no manual full-level victory or exact balance parity is claimed. Original/local screenshots, a partial post-restore trace and diagnostic totals are retained.
- Verified tier-three purchase/rendering and full-screen 844×390 landscape with on-map controls. Physical iPad testing remains open. Fifty-eight Kingdom Rush tests, four boundary checks and production build pass. Only Kingdom Rush folders changed.
- Detailed report, known limits and reproduction: twin-rivers-pass.md. Next: repeated original comparisons and a complete browser victory before adding another map; improve trace-history continuity across restores.


## November 7, 2026 — path calibration and Silveroak Forest

- Corrected original full-step/node-tolerance movement and exact base archer/mage/rally ranges. No health, damage, cash or spawn multiplier was adjusted to force parity. Southport historical commands now replay at 14 lives (original 13); Pagras still wins with eight lives. Farmlands' earlier five-life replay now loses in wave seven under the changed rules. Historical records are retained, with superseding diagnostics clearly labeled.
- Repeated Twin Rivers' actual fixed-defense browser control under these rules: wave-six defeat, 742 gold / 147 kills, versus original wave-seven defeat. This remaining gap is explicit; no matched-difficulty claim.
- Added Silveroak Forest: 700 gold, three entrances, 15 original waves / 235 scheduled enemies plus spiderlings, existing tier-three archer, base ranger unlock, repairable elf camp, worgs and marauders. Matriarch nests persist after their mother dies and hatch across lanes. Nests count toward level completion and survive saved sessions.
- Added elf repair/hiring/rally, ranged arrows and melee, original enemy collision/aim facts and ranger rendering. Ranger poison/root purchases remain unavailable; detailed formation and cosmetic transitions are approximations. All new art has pinned provenance and loads only for this map.
- New saves preserve diagnostic event history; exports state whether history is complete. The actual restored Silveroak browser attempt reproduces its exact wave-fourteen defeat (359 gold / 253 kills), while the authored default-seed defense wins all fifteen waves with nine lives / 330 kills. These remain distinct observations.
- Checked the final phone landscape layout, elf controls and five-map chooser. Sixty-nine Kingdom Rush tests, four boundary checks, production build and whitespace checks pass. Physical-device performance and original Silveroak browser comparison remain open. Report: silveroak-forest.md.


## November 8, 2026 — shaman calibration and The Citadel

- Corrected shaman cooldowns to count active, non-charging updates, freezing during entrance and melee wind-ups. Historical Pagras commands now replay as a thirteen-life victory, while the authored Twin Rivers defense finishes with seven. Preserved the older browser evidence unchanged; these are current simulation results, not new browser outcomes. The original/local Twin Rivers wave-seven/wave-six control gap remains unresolved.
- Added stage six: 700 gold, 17 groups / 429 scheduled enemies, five routes, fifteen sites, flying Gargoyles, Dark Knights, Shadow Archers, the base Arcane Wizard and Juggernaut missile/summon/melee logic. New combat state and owned summons survive save/restore. Shadow Archers retain initial-reload movement and post-shot stance. Added pinned asset/data manifest and extraction support. See [The Citadel report](the-citadel.md).
- Added optional wave practice in the existing tools panel, with previous scheduled kill income and explicit practice marking. It preserves campaign saves and excludes completed records. Tests caught and fixed an extra ordinary impact at the end of the new ten-pulse Arcane beam.
- Actually played boss practice to defeat in the browser: wave 17, 538 gold, 131 kills, tick 5,522; the escaping boss retained 1,858 HP. Exported commands reproduce the result exactly. This is neither a full campaign run nor a victory. A separate fixed three-tower browser opening lost in wave four; its complete control trace is preserved. Authored full-map defenses still lose around waves 4–6, and no original Citadel browser comparison has been completed.
- All changes remain within Kingdom Rush folders. Garden Guard work belongs to the concurrent agent and is excluded from this change.

Validation: 81 Kingdom Rush tests and four game-boundary checks pass, as do the production build and scoped whitespace check. Phone landscape at 844 × 390 fills the board with no horizontal overflow; purchases, both powers, practice marking and pause were checked through the browser UI. This is not a physical-device benchmark.
