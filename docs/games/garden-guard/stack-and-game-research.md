# Open Games: stack recommendation and first game research

Research date: November 6, 2026. Status: historical research notes. The stack was approved and a four-level local prototype now exists; see ../README.md and assets.md for implementation status. No public deployment yet.

## Recommendation

Use Vite, strict TypeScript, Canvas 2D for gameplay, and HTML/CSS for the catalog, seed controls, menus, settings, and dialogs. Start without a UI framework; this first game's surrounding interface is small. Keep the game independent of the site so a React shell can be introduced later without rewriting simulation logic.

Deploy the static build to Vercel using personal GitHub `breeko` and Branko's personal Vercel scope. Persist campaign progress locally; no accounts, database, or game server for the first version. Add versioned save export/import so local browser storage is not the only way to retain progress.

This is an engineering recommendation, not a measured performance result. Branko confirmed the target is an iPad 6th generation running iPadOS 17.7.11. That is above the researched browser floor; physical-device performance and interaction testing remain necessary.

| Candidate | Assessment for this project |
| --- | --- |
| Vite + TypeScript + Canvas 2D | Recommended: small dependency surface, direct control over rendering, and an independently testable simulation. We own input, asset loading, and simple animation. |
| Next.js + TypeScript + Canvas | Familiar and reasonable for a larger site, but server rendering and server routes add little to this first game. Its default Safari floor also needs attention. |
| Vite + Phaser + TypeScript | Strong alternative if later games need many animated scenes or engine tooling. Benchmark a pinned release on the actual iPad before choosing it. |
| HTMX | Useful for server-driven interfaces; this game still needs a continuous local simulation and rendering loop. Adds little here. |

[Vercel supports Vite deployments](https://vercel.com/docs/frameworks/frontend/vite). [Next.js currently defaults to Safari 16.4+](https://nextjs.org/docs/architecture/supported-browsers). [Vite's current default also targets Safari/iOS 16.4](https://vite.dev/config/build-options). The confirmed iPadOS 17.7.11 target is above that floor, so no legacy plugin is planned. Browser-version support does not establish runtime performance or replace device testing. [Phaser supports TypeScript and Canvas/WebGL](https://docs.phaser.io/phaser/getting-started/what-is-phaser).

## Proposed implementation boundaries

- `src/site/`: catalog, navigation, settings, progress, and accessible HTML controls.
- `src/games/lawn/sim/`: entities, economy, combat, wave generation, placement, and victory/defeat. No browser or rendering dependencies.
- `src/games/lawn/content/`: typed plant, enemy, progression, and scenario definitions with provenance.
- `src/games/lawn/render/`: Canvas renderer and interchangeable asset manifests.
- `src/games/lawn/input/`: translate mouse/touch/keyboard into simulation commands.
- `src/shared/`: only genuinely shared saves, audio, viewport, and input helpers. Avoid building a universal game engine first.

Use a seeded random generator and a fixed simulation step independent of drawing. Record commands by simulation tick for replay and debugging. Validate original tick duration before converting reference counters to seconds. Render with requestAnimationFrame; target stable 30 fps on the reference iPad, with 60 fps where practical. Reduced drawing frequency must not change combat or economy.

Pre-render the board background, load only the current game's assets, bound decorative effects, and cap backing-store resolution on older hardware. These follow the direction of [MDN's Canvas optimization guidance](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas); the exact budgets require measurement.

## iPad acceptance criteria

- Tap a seed, then tap a cell; dragging is optional. Provide a clear selected state and a cancel action.
- No hover-only information; large seed controls and visible cost/recharge feedback.
- Preserve logical board coordinates and combat geometry while scaling the viewport. Adapt the surrounding controls separately.
- Landscape is the preferred play layout. Portrait must keep the board and controls usable without cropping; measure touch targets on the actual device.
- Handle touch cancellation and orientation changes. Use feature detection, with a touch fallback if the device lacks suitable Pointer Events support.
- Prevent page gestures only within the interactive game surface.
- Pause when hidden or interrupted; resume explicitly without simulating a long backlog.
- Begin audio after a user gesture. Include mute and persist the preference.
- Save after completed levels; provide export/import and a graceful response to unavailable storage.
- Test a production build on the physical iPad: opening, planting, collecting sun, canceling, pausing, rotating, saving, and the busiest supported wave. Desktop WebKit testing is supplemental.

## Reference edition and confidence

Proposed baseline: first Adventure playthrough of the original PC/GOTY game. Mobile, console, replay Adventure, and Replanted should be separate references; do not mix their convenience features or balancing silently.

The [Patoke reverse-engineering project](https://github.com/Patoke/re-plants-vs-zombies) is community reconstruction, not official source. Its README describes modernization and expansion, so observed values are reference evidence rather than proof of exact retail behavior. Pin a commit before importing measurements into specifications, compare another reconstruction where useful, and validate against recorded retail play. At the time of this initial investigation, no source or artwork had been copied. The subsequent prototype reuses a separately licensed implementation and original reference artwork; see assets.md.

## What the research establishes

The reconstruction's Board.cpp uses wave budgets, weighted enemy selection, forced introductions, and special flag waves. Normal first-run budget starts at `floor(zeroBasedWave / 3) + 1`; enemies consume different point values. Wave advancement can accelerate when the previous wave's weighted remaining health falls below a randomized threshold of 50–65%, after a minimum elapsed period. Thus a fixed spawn-every-N-seconds approximation will change pressure. Lane picking also uses history-sensitive weighting rather than simple independent uniform choice. Sky-sun spacing changes over time. Its background selection maps the campaign to day, night, pool, fog, then roof/boss, with special-level exceptions. [Board.cpp](https://github.com/Patoke/re-plants-vs-zombies/blob/main/Lawn/Board.cpp)

The constants define five areas of ten levels, an 800×600 board, initial wave countdown 1800, ordinary countdown 2500 with range 600, and sky-sun constants 425/275/950. These are source counters, not browser frames; keep their units explicit until the engine update rate is verified. [GameConstants.h](https://github.com/Patoke/re-plants-vs-zombies/blob/main/GameConstants.h)

The baseline wave-count table is below. These are internal waves, not visible flags or enemy counts. Special scenarios may override the table: Whack-a-Zombie is an observed example. [Challenge.cpp](https://github.com/Patoke/re-plants-vs-zombies/blob/main/Lawn/Challenge.cpp)

| Area | Level 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 4 | 6 | 8 | 10 | 8 | 10 | 20 | 10 | 20 | 20 |
| 2 | 10 | 20 | 10 | 20 | 10 | 10 | 20 | 10 | 20 | 20 |
| 3 | 10 | 20 | 20 | 30 | 20 | 20 | 30 | 20 | 30 | 30 |
| 4 | 10 | 20 | 10 | 20 | 20 | 10 | 20 | 10 | 20 | 20 |
| 5 | 10 | 20 | 20 | 30 | 20 | 20 | 30 | 20 | 30 | 30 |

Early enemy eligibility in that table introduces coneheads at 1-3, pole vaulters at 1-6, and bucketheads at 1-8. Eligibility is not a full spawn schedule, and special-mode rules must be applied separately. Challenge.cpp also contains conveyor distributions and special scenario rules.

Some verified plant definition fields:

| Plant | Sun cost | Recharge counter |
| --- | --- | --- |
| Peashooter | 100 | 750 |
| Sunflower | 50 | 750 |
| Cherry Bomb | 150 | 5000 |
| Wall-nut | 50 | 3000 |
| Potato Mine | 25 | 3000 |
| Snow Pea | 175 | 750 |
| Chomper | 150 | 750 |
| Repeater | 200 | 750 |

Plant.cpp also randomizes initial attack/production phase and subsequent cadence. A nominal launch rate does not fully describe timing. [Plant.cpp](https://github.com/Patoke/re-plants-vs-zombies/blob/main/Lawn/Plant.cpp)

Zombie.cpp initializes a normal body to 270 health, cone armor to 370, and bucket armor to 1100. Do not turn these straight into effective hits-to-kill: death phases and damage routing must be checked. Its definitions include enemy wave costs and selection weights. [Zombie.cpp](https://github.com/Patoke/re-plants-vs-zombies/blob/main/Lawn/Zombie.cpp)

LawnApp.cpp's award mapping accounts for levels without new plants. It identifies Adventure 1-5 as Wall-nut Bowling, 2-5 as Whack-a-Zombie, 3-5 as Little Trouble, 4-5 as Vasebreaker, 4-10 as Stormy Night, and 5-5 as Bungee Blitz. These require distinct scenario logic. [LawnApp.cpp](https://github.com/Patoke/re-plants-vs-zombies/blob/main/LawnApp.cpp)

## Assets and public presentation

[The Spriters Resource has original PC sprites](https://www.spriters-resource.com/pc_computer/plantsvszombies/), including a general sheet, projectiles, and other groups. This establishes availability, not redistribution permission.

[EA's published content policy](https://help.ea.com/en/articles/security-and-rules/ea-content-policy/) explicitly excludes knock-off/spin-off games and game revivals/fan games. Free and ad-free is not a grant to publish a recreation with EA content. Treat original assets as references; recommend independently authored code, original identity, original sprites, and original audio for the public game. Original artwork alone should not be treated as resolving every question about a very close recreation. A branded recreation requires a separate rights decision.

Start with readable static sprites: one pose per unit plus clear attack, hit, armor-loss, recharge, and activation cues. Animation polish can come later. Mechanical timing must be explicit simulation events rather than accidental dependence on animation playback. Keep assets behind a manifest so artwork changes do not affect balance. Kenney's [asset library](https://kenney.nl/assets) is another starting point; [its support page describes CC0 licensing](https://kenney.nl/support). Check each selected pack for suitability and its included license.

## Remaining specification work

This investigation does not yet establish all 50 retail level specifications. Build a provenance-backed level ledger before claiming faithful difficulty. Each entry needs: reference edition, active rows/terrain, starting resources, available seeds and slots, enemy eligibility/weights, introductions, wave budgets/counts, timing overrides, flag behavior, tutorial gates, special scenario logic, reward, source location, and confidence.

Also verify: simulation tick duration; first-four-level tutorial behavior; sun lifetime and collection rules; projectile damage, speed, and collision; armor overflow and dying states; bite timing; mine arming and explosion timing; slowing interactions; mower triggers; plant unlocks and shop gates; grave/pool ambush rules; roof trajectories; fog; conveyor pacing; boss behavior. Mark unknowns explicitly rather than filling them from memory.

For each first-area level, compare a recorded reference run and our event log: first threat, first affordable defense, economy growth, wave composition, time-to-contact, armor break, mower use, level length, and outcome. Use a repeatable command replay for regression checks. Try both viable and intentionally weak strategies over multiple seeds. Automated players help find impossible configurations; their success rate is not a substitute for human difficulty assessment.

## Build sequence

1. Target device confirmed: iPad 6th generation, iPadOS 17.7.11. Accept or adjust the recommended stack.
2. Make a tiny device proof: board, tapping, representative sprite count, pause/resume. Measure before adding content.
3. Specify and implement 1-1 through 1-4 with simple original art, local saves, typed content, and deterministic replays.
4. Complete and validate the first ten levels, including Bowling and conveyor rules. Do not replace special scenarios with generic waves.
5. Expand one environment at a time after its mechanics and difficulty have evidence.
6. Add the multi-game catalog, optional offline caching, and cosmetic polish as the first game stabilizes.

No remote repository was created, no Git identity was changed, and no Vercel project was linked.
