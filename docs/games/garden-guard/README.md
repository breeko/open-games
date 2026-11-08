# Open Games — Garden Guard

An ad-free, touch-friendly Plants vs. Zombies reference prototype. Twenty day and night levels, built with Vite, strict TypeScript and Phaser 3 using Canvas 2D.

[Play Garden Guard](https://opengames-breeko.vercel.app/games/garden-guard/)

## Play locally

Use Bun (the project package manager is pinned in `package.json`).

```sh
bun install --frozen-lockfile
bun run dev
```

Open the printed Network URL on an iPad on the same Wi-Fi as this Mac. Keep the Mac awake and the server running. Landscape is best; portrait keeps the complete board visible. The preview uses port 5173.

## Controls

- Tap a seed, then a lawn square. Dragging also works.
- Tap suns to collect 25 sun. Cards show price, recharge, or available conveyor supply.
- Enable **Menu → Auto-collect suns** (or use Settings) to collect automatically. With auto-collect enabled, sky suns fall for 1.8 seconds and sunflower suns for 0.7 seconds, rest for just 100 ms, then fly to the sun bank in 300 ms and credit once on arrival. The preference saves on this device and can change mid-level; it starts off to preserve manual collection by default. Pause freezes the fall and collection flight.
- **Menu** is the pause screen during a battle. **Back to game**, the close button, or Space returns to play. There is no separate Pause/Resume overlay. Outside gameplay the menu does not freeze the title, level picker or other screens.
- The lawn fills the current viewport, including browser-toolbar height changes and safe-area insets. There is no persistent page header/footer. Tap the floating **Menu** or the lawn's Menu button for level selection, difficulty, restart, tools and save status; opening it pauses play. **Back to game** returns to the lawn. The original 4:3 board stays uncropped, so wide screens keep side margins and portrait screens keep space above/below.
- **Menu → Enter fullscreen** requests browser fullscreen from a tap when supported. Unsupported/denied requests keep the normal full-viewport layout and show an Add to Home Screen alternative. Native browser bars cannot be forced away outside a permitted fullscreen session.
- Shovel removes a plant without a refund. Cancel seed / Escape clears tools and selection.
- Choose any level with the level menu or previous/next buttons. Each cleared level saves separately.
- The current level autosaves every two seconds, after planting/resource changes, on pause, and when leaving/backgrounding the page. Refresh or return to restore it with the menu open and the same difficulty, loadout, board, timers and wave. **Menu → Resume saved level** returns from the menu. Restart or starting a new level replaces the ongoing session; victory/defeat clears it while preserving campaign progress. [Save details and verification](saves.md).
- Relaxed: 75% enemy health, 80% speed, +50 starting sun. Baseline: unmodified prototype balance. Hard: 135% health, 115% speed. Changing difficulty restarts the selected level.

## Daytime campaign

| Level | Focus |
| --- | --- |
| 1-1 | Single lane; Peashooter |
| 1-2 | Three lanes; Sunflower economy |
| 1-3 | Five lanes; coneheads and Cherry Bomb |
| 1-4 | Wall-nut defense |
| 1-5 | Wall-nut Bowling: no sun; rolling nuts bounce between lanes |
| 1-6 | Pole vaulters and Potato Mines |
| 1-7 | Snow Pea and a longer defense |
| 1-8 | Bucketheads and Chomper |
| 1-9 | Repeater and layered defenses |
| 1-10 | Conveyor finale: supplied plants instead of a sun economy |

Plants use complete static original poses, including stems and leaves. Wall-nuts show damage; mines show arming states; Chompers show digestion; pole vaulters jump once and lose their poles. Story scenes are omitted.

Wave composition, simultaneous spawns, huge-wave warnings, health-triggered countdowns, and walking ground tracks now follow pinned PC reconstruction rules. See the [accuracy audit](audit/accuracy.md) for evidence, edition differences, and remaining approximations. **Baseline does not claim exact retail difficulty**; tutorial gates and special-mode supply still differ. Pool/fog/roof, full skeletal animation, and most original side modes are not implemented.

## Verification

```sh
bun test
bun run audit
bun run build
```

Seventy-four tests cover the twenty-level ledger, starting resources, difficulty modifiers, armor overflow, blast geometry, source flag positions/budgets, simultaneous spawns, exact countdown fixtures, frame-independent motion, wave completion, save migration, single-credit sun pickup behavior, validated sessions and restored director/random/motion state. A developer browser check also exercises real Phaser entities, all twenty levels and detailed mid-action restoration. Diagnostics show live coordinates, collision bodies, wave plans and spawn logs, with JSON trace export. The production build retains a bundle-size advisory for Phaser.

Artwork regression checks (requires Python and Pillow):

```sh
python3 scripts/games/garden-guard/verify-reference-sprites.py
```

The sprite check catches missing stems/leaves, inconsistent armor canvases, sun dimensions, and empty special-state images. Physical iPad performance still needs user testing.

## Attribution

Game code adapted from [Tino1234567/plants-vs-zombies-game](https://github.com/Tino1234567/plants-vs-zombies-game), commit `81071c0d81c83241bb99c57284f34e861fa0c2c3`, MIT, copyright 2026 ThanosTHINOS. License preserved in src/games/garden-guard/THIRD-PARTY-LICENSE.txt.

Original EA/PopCap artwork is separate from the code license. See [asset provenance](assets.md). This reference prototype is deployed on the personal Vercel project documented below.

## Deploy to Vercel

Repository: [breeko/open-games](https://github.com/breeko/open-games). The repository is connected to Vercel project **opengames-breeko** in the personal **breekos-projects** scope. Production address: [opengames-breeko.vercel.app](https://opengames-breeko.vercel.app). `opengames.vercel.app` was already occupied when checked.

To recreate the project, use your **personal Vercel account/scope** and import this repository.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | Repository root (`./`) |
| Install command | `bun install --frozen-lockfile` |
| Build command | `bun run build` |
| Output directory | `dist` |
| Node.js | `24.x` |
| Production branch | `main` |
| Environment variables | None required |

`vercel.json` supplies the framework, install, build and output settings; `package.json` pins the Node major. There is no server, database or secret configuration. Game progress saves in browser storage per device and site address. A move from the local preview to the deployed site starts a separate save.

The production deployment was verified ready on November 7, 2026. Open the HTTPS URL on the iPad. Pushes to `main` deploy through the connected Vercel GitHub integration. No Vercel account or project IDs are committed; select the personal scope during import.

Configuration references: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) and [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Version 0.2 changes

- Fixed the head-only plant extraction by combining body and head animation sections.
- Increased sun artwork to 92×92 board pixels and centered its touch target.
- Expanded from four introductory scenarios to ten daytime levels.
- Added original-art Snow Pea, Repeater, Chomper, Potato Mine states and pole vaulters.
- Added Wall-nut Bowling, a supply-based conveyor finale, shovel, and a wave progress bar.
- Replaced clear-every-enemy wave scheduling with health/timeout-based overlapping waves.
- Fixed out-of-order clear tracking, corrupted-save handling, narrow-screen overflow, and repeated menu input handlers.
- The initial twelve automated checks and artwork regression checks passed before the accuracy audit. Browser checks include all ten level entry points, full plant rendering, sun collection, shovel selection, rolling nuts and conveyor stock placement. Exact retail balance and physical iPad performance remain unverified.


## Original-style layout

The lawn now keeps the original 4:3 view, with a wooden seed bank, integrated sun counter, stone Menu/pause button and original progress-meter artwork. Plants, zombie bodies, headgear and projectiles have independent display sizes. Sprites export at 2× display size and lawns use lossless PNG. These reduce avoidable blur; they are not a newly discovered native HD asset set. Controls now live in the overlay Menu so the lawn can use the full viewport; level navigation, difficulty and save status appear there while play is paused.


## Night expansion (2-1 to 2-4)

Four additional source-backed PC Adventure boards introduce Puff-shroom, Sun-shroom, Fume-shroom and Grave Buster, plus newspaper and screen-door zombies. Sky sun stops at night. Small Sun-shrooms make 15 sun and grow after two minutes; fumes pierce carried shields. Graves block ordinary planting and spawn another zombie two seconds after the final wave unless removed. The new levels retain 10/20/10/20 waves and 50 starting sun at Baseline.

Peas now use their original 28px transparent canvas at the board scale, launch from the muzzle, and expose their size in diagnostics. Plant feet align consistently across small and tall sprites, with original ground shadows. The picker fits all twelve plants. Existing save keys and old level IDs remain unchanged.

Validation: 36 Garden Guard tests; original-art regression checks; fourteen-level numerical audit; production build. Browser checks covered planting, grave blocking/removal, 15-sun production, pause, seed toggling and landscape/portrait iPad viewport sizes. A physical iPad test and full comparative original-game night playthrough remain outstanding. See the accuracy ledger for simplified animations and targeting differences.


## 2-5 and 2-6

- **2-5: Whack-a-Zombie.** Eight timed waves, nine initial graves, tap attacks, armored targets and a final grave rush. Occasional sun drops fund mines, Grave Busters and cherries. Pause and auto-collect still work.
- **2-6: Changing sides.** Source-backed football introduction and Hypno-shroom counterplay. Converted zombies show an ALLY marker, walk right and fight their former allies. They do not trigger mowers, loss or remaining-wave counts.
- Packet labels now use crisp text instead of the small raster branding. Prices use higher-resolution text, with plant art below the labels.
- Hypno-shroom is earned after 2-5; Scaredy-shroom after 2-6. Scaredy becomes playable in 2-7.

The original eight-wave special-mode override, quiet windows, grave replenishment, final volley, tap damage, loot probabilities and football rules are covered by the audit and new regression tests. See the accuracy ledger for remaining collision/animation approximations.


## 2-7 and 2-8

**2-7: Keep your distance** has 20 waves, football/screen-door pressure and eleven graves. Scaredy-shroom costs 25 sun, shoots across the lane and hides when a nearby zombie threatens it, including adjacent lanes. Keep it behind your free Puff-shrooms. Clear this stage to earn Ice-shroom.

**2-8: Freeze the dance floor** has 10 waves and introduces Dancing Zombies. Each leader has 500 HP and summons up to four 270-HP backups; missing backups can be replaced. Ice-shroom costs 75 sun and activates after one second: 20 damage, 4–6 seconds frozen (3–4 if already chilled), plus a 20-second chill. Its recharge is 50 seconds. Doom-shroom is the reward for future 2-9 play; its prepared crater timer persists with other session state.

Existing saves retain their keys and r1 compatibility marker. Added freeze timers, dance routines, leader/backup links, hiding pose and crater state have backward-compatible defaults. Refresh restores paused with no offline advancement. Frozen enemies use original ice-trap artwork so the effect stays visible with Canvas rendering. Local diagnostics offer repeatable dancer and frozen-group boards; those buttons are excluded from production.

Validation includes 59 per-game unit tests plus 30 real Phaser browser checks for every level, pending summons, frozen groups thawing, replacement backups, Ice-shroom mid-fuse and crater expiry. These compare each continued frame against a restored run; a full comparative original-game playthrough and physical iPad testing remain separate.

## Performance monitor

Open **Menu → Performance** after a slowdown to inspect frame, drawing, gameplay and save costs, or download a local report. Measurements continue with the panel closed. See [performance.md](performance.md) for the repeatable crowded-board benchmark, optimizations, and limits of desktop measurements versus a physical iPad.

## Game speed

Tap **1× / 2×** beside Menu to change speed during play, or use **Game speed**
inside Menu. The device remembers this preference. Switching speed does not
restart the level, change difficulty, rewrite remaining timers or migrate saves.
Pause still freezes everything; music and browser controls stay at normal speed.

At 2× the battle scene runs two ordinary simulation steps before one render.
This includes sun pickup, timers, physics, gameplay and tweens. Gameplay tweens
use simulation delta rather than Date.now, keeping their motion synchronized.
The integration wraps Phaser 3.90 Scene Systems.step; recheck its event ordering
when updating the engine. Menus and rendering do not run twice. The performance
report includes the selected game speed when comparing device measurements.

Validation compares complete snapshots after 200 normal frames and 100 double
frames for day, bowling, conveyor, whack, a busy night board and frozen dancers;
checks double-speed continuation/restoration, live speed changes and pause.

## Public Playground

Choose **Playground** from the main menu or in-game Menu, or open
`/games/garden-guard/?mode=playground` (`&lawn=night` starts on the night lawn).
Choose day/night, arm any of the sixteen plants, and tap empty cells repeatedly.
Planting costs no sun and has no recharge. All plants stay active on either lawn.
Add zombies by type, lane and count; optionally repeat an eight-second supply
in the first four lanes. **Fill 4 rows** places 28 Peashooters with a continuous
basic-zombie supply. Graves, shoveling, clear-zombies and clear-board controls
let players build other test situations. There is no campaign win/loss or
automatic Adventure wave progression; a 160-zombie cap bounds crowd overload.
Hide the tools to see the whole lawn, and use the existing Menu/speed controls.

Playgrounds are temporary: refresh/leave resets the board. Entering saves any
active campaign first; playground autosaves are explicitly excluded from the
campaign storage path. They neither clear active campaign saves nor award wins,
attempts or unlocks. **Resume saved level** still restores the campaign.

Projectile diagnostics are opt-in to the Playground, with no per-projectile
tracking in campaign mode. They count spawn, first draw, live draw omissions,
hits, expiry, offscreen removal and unexpected destruction. Download the report
with the last minute of target/dying/projectile activity and performance data.
The report stays local until the player chooses to share it.

Developer reproduction: open
`/scripts/games/garden-guard/projectile-browser-check.html` through Vite.
Twelve crowded-board tests vary speed, synchronized volleys and 60/30/15-FPS
frame intervals; four additional runs simulate three minutes of the public
four-row preset on day/night lawns at both speeds. The tested runs submitted
every live pea for Canvas drawing with no unexpected disappearances. Pauses
with only dying, untargetable zombies were observed; this is a possible
explanation for firing gaps, not a confirmed reproduction of the reported
physical-device issue. Canvas submission checks do not prove the final browser
compositor displayed every pixel. Use a report from the affected device to
continue diagnosing if the symptom recurs.

## Focus and background play

**Menu → Auto-pause when unfocused** starts On and is remembered on this device.
With it On, blur/hide opens the game menu only during an active battle. Returning
focus leaves that menu open until the player chooses Back to game. Losing focus
on title/help/seed/map screens, or with the menu already open, adds no pause.
With it Off, visible unfocused games keep running. Hidden active games use a
best-effort timer to advance simulation without drawing, in 20 ms steps and at
most one second of catch-up per timer callback. Foreground RAF steps are gated
while that background driver owns simulation, avoiding double progression.
Opening the menu still freezes both drivers regardless of this preference.

Browsers may [throttle or freeze hidden pages](https://developer.chrome.com/blog/timer-throttling-in-chrome-88),
so this is not guaranteed full-speed hidden-tab execution. Closing or discarding
the page does not produce offline progress. Reloaded campaigns open their menu
before running. Background-only projectile removals are reported separately
from missing foreground draws.

Validation: focus-policy combinations/defaults and bounded background clock
unit checks; real Phaser 1×/2× background/foreground state equality, no drawing,
no duplicate RAF progression and menu blocking; real iframe focus transitions
through `/scripts/games/garden-guard/focus-browser-check.html`.

## Complete night world: 2-9 and 2-10

**2-9: A crater in the plan** is a 20-wave standard night board. Doom-shroom joins the seed selection and default loadout: 125 sun, a one-second fuse, 50-second recharge, and a large blast. Its square becomes a crater for three minutes; nearby plants and hypnotized zombies survive. There are eleven graves and no falling sun. Basic, conehead, screen-door and Dancing Zombies are eligible.

**2-10: The last night** is the 20-wave mushroom conveyor finale, with thirteen graves. Seven mushroom types arrive as free stock: Grave Buster, Ice-shroom, Doom-shroom, Hypno-shroom, Scaredy-shroom, Fume-shroom and Puff-shroom. Source weights, duplicate suppression, anti-repeat weighting, Grave Buster suppression when no graves remain, and inventory-dependent supply timing are implemented. First stock arrives at two seconds; waves start after one second. Miniboss wave budgets are tripled after forced flag entries. Football Zombies join the eligible enemies. Clearing it completes the currently available day/night campaign; pool content and the original Lily Pad reward are deferred.

Doom blasts test the whole collision rectangle against a 400-board-pixel radius and a three-row cap, rather than the zombie's image anchor. Current land enemies burn through armor/shields; emerging targets are included and allies excluded. The existing crater state, conveyor countdown, last selection, inventory and seeded random stream resume without resetting. No storage keys or previous sessions change.

Verification: 74 unit tests, 50 real-entity browser checks, original-art checks, source-rule audit and production build. Browser checks include a Doom mid-fuse restore, armored/emerging/ally blast targets, crater expiry, and weighted conveyor continuation at both speeds. Manual 1024×768 checks cover free mushroom placement, Grave Buster, Doom blast and blocked crater placement. These checks establish rule consistency and save continuity, not identical retail difficulty. The conveyor remains a fixed bank with quantities (up to five per type), rather than original moving packets.
