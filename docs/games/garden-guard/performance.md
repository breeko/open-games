# Performance and iPad diagnosis

## On the iPad

Open **Menu → Performance**. The game resumes and the monitor shows FPS,
actual frame intervals, CPU update/drawing time, individual gameplay sections,
physics, tweens, engine remainder (timers/input), saves, and live object counts.
Measurements continue while the panel is closed. After a brief hitch, reopen it
and choose **Download report**. The JSON contains recent frame statistics, the
10 slowest frames since reset, and the last 30 save timings. It stays on the
device; nothing is uploaded. **Reset measurements** starts a fresh comparison.

The recent window contains 600 active frames (about 10 seconds at 60 FPS).
Pauses, background time, and menus are excluded. Slow-frame details are retained
when the recent window rolls over. The report includes browser, viewport,
canvas resolution and current board counts; it does not include the saved game.

At 60 FPS the frame budget is 16.7 ms. A high zombie/plant section points to
that logic; high physics/tween sections identify those engine phases; high engine remainder suggests timers, input, shell work
or a save within the frame. High drawing time suggests Canvas work. A long
frame interval with small measured CPU costs may involve browser scheduling,
compositing, audio, garbage collection or other device load. The monitor does
not directly measure GPU compositing or attribute every browser task.

Timings use Phaser 3.90's PRE_STEP / POST_STEP / PRE_RENDER / POST_RENDER events,
verified against the installed source and [Phaser's event documentation](https://phaser.io/oss/docs/api-documentation/3.90.0/namespace/core-events).
Drawing excludes canvas preparation before PRE_RENDER. Save timing includes
snapshot capture, validation, serialization and the actual localStorage write.
The engine remainder is a residual, not a direct physics-only measurement.

## Changes made

- Skip enemy-versus-enemy searches when a group contains no hypnosis allies.
  A group-local weakly held set is updated on restore, hypnosis, dancer
  allegiance and destruction. When allies exist, preserve the original target
  order and eligibility checks.
- Avoid allocating filtered dancer-group arrays for movement and chill checks.
  Scaredy-shroom changes its texture only when its hiding pose changes.
- Update hidden menu labels/status four times per second instead of every frame.
- Coalesce event-driven save requests to at most once per second during bursts
  of automatic sun pickups. The regular two-second save schedule and explicit
  pause, page-hide and background flushes remain unchanged. Save validation and
  the shared persistence implementation are unchanged.
- Keep profiling bounded and independent of the accuracy overlay. Measuring
  performance does not enable hitbox rendering or format full zombie traces.

## Reproducible local benchmark

Run Bun's development server and open
`/scripts/games/garden-guard/performance-browser-check.html`.
It restores a repeatable board with 35 shooters, 80 armored enemies and 125
initial projectiles, then measures 420 real frames. The summary excludes the
first 60 warm-up frames. It exercises saves with an in-memory storage adapter;
real localStorage cost must be measured with the normal game monitor.
No campaign or active-level saves are changed by the benchmark.

Desktop Chromium observations on 2026-11-07 (development build, single runs):

| Cost | Before | After |
| --- | ---: | ---: |
| Mean engine update after warm-up | 0.655 ms | 0.582 ms |
| Mean zombie logic, full recording | 0.146 ms | 0.053 ms |
| Mean drawing after warm-up | 0.599 ms | 0.504 ms |
| Mean snapshot/save with memory storage | 2.00 ms | 1.97 ms |

These small timings vary with browser scheduling/JIT and are **not iPad results**.
Rendering code did not change; the apparent drawing difference is not evidence
of a rendering improvement. Both runs averaged about 60 FPS. One after-run
warm-up frame had a 70 ms engine stall outside measured gameplay sections;
this illustrates why an isolated hitch does not identify a game subsystem.

The user's transient iPad slowdown has not been reproduced on the physical
hardware. Do not claim this change fixes that cause. Use an iPad report to
choose further work (for example projectile pooling or cached render textures)
before adding complexity or reducing visual quality.

Validation: unit tests cover bounded measurements, percentile calculations,
frame/work association and pause exclusion. The real-entity browser suite checks
all 20 levels, continued saves, dancers/freezes, newly hypnotized opponents and
restored multi-ally targeting order (32 checks).

## Large-screen polish and crowded-board review, 2026-11-08

- Explicit stem/foot pivots align each existing texture at drawing time. Different-sized zombie states share the same ground line. Planting previews snap to the same stem/ground position as the final plant. Diagnostics add white plant-ground crosses alongside the existing body outlines.
- Plant breathing/sway, shooter recoil and zombie walking/chewing are drawing-only transforms restored immediately after Canvas batching. Frozen zombies stop swaying. They do not move physics bodies, alter saved entity coordinates or add persistent animation tweens. **Menu → Sprite motion** turns this motion off and persists locally. Existing planting/death/explosion effects remain.
- Remove unnecessary Sprite animation-manager updates for static poses and velocity integration for manually moved zombie bodies. Zombie collision rectangles still synchronize from their game objects and participate in overlaps. A real-entity comparison against bodies with integration enabled checks identical continued combat state.
- Physics and Tween Manager costs are now measured directly, installed before Phaser binds scene listeners. This avoids missing regular physics updates by wrapping a method after its original callback was already registered. Listener order is unchanged; the residual engine section now excludes these measured phases.
- At page load, board sizes over 1280 CSS pixels receive a 1.5× or 2× backing canvas (capped at 2560×1920). Camera/input coordinates remain 1280×960. A 1920×1080 viewport was verified with a 1920×1440 canvas, displayed at 1440×1080. The 1024×768 iPad layout retains a 1280×960 canvas; the 844×390 phone layout displays that canvas at 520×390. Device pixel ratio is deliberately not multiplied into rendering cost. Resizing a window uses the initially chosen quality until reload.
- Cherry Bomb swelling now multiplies the current 0.5 art-export scale instead of the former 1.0 scale; this fixes its doubled pre-explosion size.

The same desktop Chromium benchmark starts with 35 shooters, 80 bucketheads and 125 peas. The final recording averaged 60.1 FPS, with warm-up-excluded update mean/p95 0.37/0.60 ms and drawing mean/p95 0.46/0.70 ms. Physics averaged 0.20 ms across the full recording and was the largest named update phase. The ending board had 83 zombies, 30 plants, 14 peas and **zero live tweens**, versus the previous persistent walking tween per zombie. In this session's earlier baseline, update/drawing means were 0.34/0.38 ms and FPS was 59.9. These differences are small and noisy; they do not demonstrate an overall speedup or reproduce the user's iPad hitch. Motion rendering has a small drawing cost while removing recurring tween/animation/integration work.

Evidence: [recorded benchmark](playtests/2026-11-08-polish-performance.json), [projectile stress results](playtests/2026-11-08-polish-projectiles.json), [large-screen screenshot](playtests/2026-11-08-polish-large.jpg). The 16 projectile scenarios include 35-shooter/80-enemy crowded volleys at 1×/2× and 16.67/33.34/66.67 ms frame deltas, plus four three-minute day/night Playground runs. Every scenario recorded zero missing/unseen projectiles. The 53-check real-entity suite covers all 20 levels, save continuation, integration parity, transform restoration and Cherry Bomb scale. 76 unit tests, sprite checks, source audit and build pass. Desktop layout and mouse checks do not substitute for a physical iPad check.
