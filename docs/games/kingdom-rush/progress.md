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
