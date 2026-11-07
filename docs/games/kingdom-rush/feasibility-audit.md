# Kingdom Rush feasibility audit

Audit date: November 7, 2026. Scope: the first Kingdom Rush as a possible independent Open Games title. This is a source and data audit, not a working port or a retail accuracy certification.

**Follow-up:** the stage 3 assets and level-data gaps described below were subsequently recovered, and a playable Pagras prototype was built. See [current implementation, provenance and fidelity ledger](README.md) and [progress](progress.md). This document preserves the initial audit findings.

## Decision

**A close browser recreation is technically plausible, with substantially better reference material than a generic tower-defense clone. The audited public repositories do not yet provide a complete, verified, reusable original-game package.**

The most useful source is a Lua mod of the original Kingdom Rush. It exposes combat behavior, tower definitions, animations, placements, upgrades and wave scheduling. However, the inspected tree omits the original campaign wave/path files and several required base textures. Its modifications also affect difficulty. Exact original balance remains unverified until a specific unmodified edition/build supplies the missing baseline.

For this project, Kingdom Rush remains a good candidate because its art, soldiers and choke-point combat match the desired experience. The next step should establish that baseline and prove one representative stage before building a campaign.

## What was actually checked

- Read the current Open Games README, library catalog, build entry points and AGENTS.md. The project has recently moved Garden Guard into independent game folders; retain those boundaries.
- Inspected GitHub directory listings and selected source text through the GitHub connector. The accompanying [source inventory](source-inventory.json) records 586 listed files and 20 inspected text files within those listings, with blob SHAs. Read additional README/repository metadata and reverse-engineering notes separately.
- Examined original-game Lua tower/enemy templates, shared targeting/damage helpers, soldier behavior, wave scheduling, difficulty application, animation definitions, level 1/3 placement data, one custom wave definition, and sample atlas metadata.
- Examined a separate Frontiers C++ clone's organization, sample soldier/tower/enemy code, animation setup and wave data.
- Checked limited standard application locations for an installed Kingdom Rush reference; none was found. This was not an exhaustive filesystem search.

No third-party executable was run. No original artwork was added to Open Games. No retail game/SWF was obtained, no complete dependency closure was established, and no browser/iPad performance or screenshot comparison was performed. Large tower atlas metadata files were listed but could not be read through the connector. Existing application changes were left alone; this audit adds documentation only.

## Source candidates

| Source | What it provides | Assessment |
| --- | --- | --- |
| [ReBBBorn/Kingdom-Rush](https://github.com/ReBBBorn/Kingdom-Rush) | Original-game Lua scripts, templates, upgrades, placements, animation definitions, selected art and custom levels. | Best inspected behavioral reference. A mod overlay, not a complete verified vanilla source distribution. |
| [QinyangTan/KingdomRush-Hacked](https://github.com/QinyangTan/KingdomRush-Hacked) | Cocos2d-x C++ Frontiers clone; PNG/plist atlases, paths, XML stats and monster schedules. | Demonstrates practical asset formats and implementation approaches. Different game, with no established retail fidelity. Not a shortcut to the original game's balance. |
| [zidonghua2018/KingdomRushFL](https://github.com/zidonghua2018/KingdomRushFL) | Directory structure built around kr3, shared Lua code, native libraries and extensive cross-game modifications. | Origins-based mod, not an original Kingdom Rush baseline. Root-level screening only; not a deep code audit. |
| [Lumi_Nox reverse-engineering notes](https://github.com/MIO-456/Lumi_Nox/blob/main/docs/games/kingdom-rush-reverse-engineering.md) | Documents LuaJIT/LÖVE packaging and instrumentation of the first three games. | Supports feasibility of inspecting a reference installation. Community observations, not an official source release or proof of correctness. |

GitHub reported no recognized project license for all three game repositories. Their root listings contained no project-level license file. Bundled engine licenses would not establish permission for the game-specific code or art. Treat them as research candidates until provenance and reuse terms are established.

## Gameplay findings

These are **observations of the inspected mod snapshot**, not assertions that every value matches an unmodified retail edition.

| System | Concrete evidence | Fidelity implication |
| --- | --- | --- |
| Timing | `all/constants.lua:4` defines FPS = 30; `all/systems.lua:46` converts source frame counts to seconds. | Preserve source timing units. Render frequency must not change combat. |
| Archer tower | `kr1/game_templates.lua:2412` gives the level-one archer cost 70, range 140, cooldown 0.8 seconds and launch delay of five source frames. | Concrete economy and attack timing can be recovered, then checked against the baseline. |
| Targeting | `all/utils.lua:752` filters valid enemies in an ellipse and orders them by remaining path nodes. `all/scripts.lua:1715` reacquires a target after the attack wind-up. | A generic nearest-enemy or circular-range implementation would produce different results. |
| Projectiles | Archer logic creates a projectile with origin, target, impact offset and distance-dependent flight timing. | Instant damage would change kills, overkill and effective tower strength. |
| Armor | `all/utils.lua:1061` distinguishes physical, magical, true, poison and explosion/electrical protection; explosion/electrical use half physical armor. Damage rounding differs for soldiers and enemies. | Preserve damage routing and rounding, not only displayed damage numbers. |
| Barracks | `all/scripts.lua:2085` maintains soldiers and formation positions, propagates powers, handles door animations and updates rally commands. | Barracks require actual unit ownership, movement, death/respawn and formation behavior. |
| Blocking | `all/utils.lua:1000` maintains blocker/target relationships; `all/script_utils.lua:2003` selects melee targets and slots. Rally movement at line 929 releases the old target. | Soldiers cannot be approximated as a stationary slowing aura. |
| Waves | `all/systems.lua:250` supports parallel route spawners, source-frame delays, spawn spacing, subpaths and alternating enemy types. The first group waits for player input; later groups support timers and early calls. | Preserve route-specific schedules and overlap. The next countdown is anchored after active spawners finish, rather than after all enemies die. |
| Early calls | `all/systems.lua:396` computes a reward from remaining seconds and settings; cash is credited at the call. | Wave timing changes both pressure and purchasing power. |
| Difficulty | `all/difficulty.lua` selects difficulty-specific fields and applies health/speed factors. The inspected settings include five difficulty slots and speed factors starting at 1.28. | Clear reason to avoid adopting mod defaults as original Normal difficulty. |
| Progression | Level data carries mode-specific hero/tower/power locks and upgrade limits; `kr1/upgrades.lua` supplies campaign upgrades. | Record star-upgrade state, hero rules and challenge mode when comparing difficulty. |

Some shared modules referenced by the scripts, such as entity/path/wave infrastructure, are not present in the inspected shared directory listing. The audit does not establish a standalone build.

## Campaign and balance gaps

The ReBBBorn tree includes `level01_data.lua` through `level26_data.lua`, but the listed wave directory contains only custom stages 27–29 and endless stage 81. The listed level directory includes path/grid files for custom stages, but none for the original twelve campaign stages.

Level 1 placement data provides eight tower holders, default rally points, a defense point, scenery placement and mode locks. It does **not** supply a complete path, starting economy and spawn schedule. Thus it is useful geometric evidence, not a playable original level specification.

The sampled custom stage 27 wave file starts with 114,514 lives and 800 cash. This is a particularly clear example of why available data must not be mistaken for original campaign balance. The README also describes imported towers, restored platform-specific content, rebalancing, custom campaigns and later efforts to restore vanilla stats. Even apparently familiar base numbers need tracing through overrides and balance patches.

## Assets and appearance

The original-game mod's `fullhd` folder lists **207 PNG files and 35 Lua metadata files**, with about **112 MB of compressed PNGs**. This includes custom content, interface art and content from other games; it is not a verified complete original-game art pack or an appropriate initial browser download.

Sample Lua atlas metadata contains image names, atlas dimensions, frame rectangles, trim information and aliases. Animation definitions specify frame ranges for directional walking, attacks, idle and death states. For example, the goblin definitions around `kr1/data/game_animations.lua:1454` distinguish up/down/side walking, attack and death sequences. This is enough structural information to plan an atlas converter and animation player instead of manually cutting screenshots.

There is a concrete completeness gap: level 1 requests `go_enemies_grass`, `go_stages_grass`, `go_stage01`, `go_stage01_bg` and `gui_tutorial`. Those atlas metadata files are absent from the inspected `fullhd` listing. The existing tower metadata file is also too large for the connector response and was not inspected. Full frame-to-image closure, original sprite quality, transparency, pivots and animation playback remain unverified.

The Frontiers clone lists PNG/plist pairs for towers, enemies, scenery and UI. Its tower PNG alone is approximately 4.8 MB compressed, and its animation code names numbered frame sequences. This is useful format evidence, but Frontiers assets must not silently substitute for original-game units or maps.

Ironhide's [original-game press kit](https://www.kingdomrush.com/kingdom-rush-presskit) identifies its supplied materials as intended for press-related use. It does not provide a game redistribution grant. No general permission to publish these original assets in Open Games was established by this audit. Keep asset provenance separate from code provenance.

## Implementation options for Open Games

| Approach | Fidelity potential | Main tradeoff |
| --- | --- | --- |
| TypeScript + Phaser/Canvas recreation | High for a bounded, verified set of levels once complete baseline data and assets are available. | Best control over iPad input, loading and diagnostics; combat state machines must be implemented and compared carefully. Recommended development route. |
| Original Flash game through Ruffle | Potentially preserves original art, logic and balance together. | Separate preservation experiment, not a recreation. Requires the exact game file and appropriate hosting terms; Kingdom Rush compatibility, saves and iPad performance are untested here. |
| Port one of the native/Lua repositories wholesale | Uncertain. | Missing base dependencies, platform-specific code, mixed editions, modifications and unestablished reuse terms make this a poor first move. |

[Ruffle](https://ruffle.rs/) is an open-source Flash emulator with a [website integration API](https://github.com/ruffle-rs/ruffle/wiki/Using-Ruffle). Its availability does not establish that this particular game/build works correctly. It is worth evaluating separately if the objective is simply to play the original in-browser.

For a recreation, use an independent game page and folder following the current library architecture. Do not import Garden Guard internals. Keep catalog metadata engine-free; load only current-stage textures, cap canvas resolution and retain a versioned game-specific save namespace. Canvas suitability on the target iPad is a hypothesis to measure, not a benchmark result.

## Proposed proof and acceptance criteria

1. Pin one unmodified reference edition/build. The first game's desktop edition is the closest match to the inspected Lua material; choosing Flash instead requires a separate baseline. Record source/file hashes and platform differences.
2. Complete a dependency and asset inventory for that baseline: campaign waves, path/subpath nodes, walkability grids, level scripts, starting cash/lives, tower/hero locks, final patched stats, animation atlases and audio.
3. Prove level 1 for loading/placement, then a stage with all four tower families, blockers, armored enemies and an air threat. Select the second stage from verified data rather than assuming the tutorial proves combat fidelity.
4. Preserve walking, attack wind-ups, projectile flight, damage/death cues and soldier movement. Decorative scenery and story transitions can wait. If any animations are simplified, preserve simulation delays that formerly depended on animation completion.
5. Replay matching placements, upgrades, rally orders and wave calls. Compare spawn timestamps, route choice, cash after purchases/kills, first contact, hit timing, soldier deaths/respawns, leaks and win/loss against the reference. Record random choices; do not assume identical outcomes from an unseeded run.
6. Validate several viable strategies and intentionally weak ones. Original wave data is a proven starting point, but entertainment still needs human playtesting. Add optional difficulty modifiers only after the baseline behaves correctly.
7. Test the production build on the iPad 6th generation / iPadOS 17.7.11: busy combat, precise rally placement, tower menus, spell targeting, pause, rotation and save/reload. Measure frame pacing and memory as well as average frame rate.

**Proceed with a reference-data and representative-level proof. Do not yet promise exact retail balance, a complete original-art campaign, or a ready-to-publish source port.**
