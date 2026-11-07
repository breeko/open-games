# Open Games — Garden Guard

An ad-free, touch-friendly Plants vs. Zombies reference prototype. Ten daytime levels, built with Vite, strict TypeScript and Phaser 3 using Canvas 2D.

[Play Open Games](https://opengames-breeko.vercel.app)

## Play locally

```sh
npm ci
npm run dev
```

Open the printed Network URL on an iPad on the same Wi-Fi as this Mac. Keep the Mac awake and the server running. Landscape is best; portrait keeps the complete board visible. The preview uses port 5173.

## Controls

- Tap a seed, then a lawn square. Dragging also works.
- Tap suns to collect 25 sun. Cards show price, recharge, or available conveyor supply.
- Pause/Resume freezes the game. Switching away pauses automatically. Space also pauses.
- Shovel removes a plant without a refund. Cancel seed / Escape clears tools and selection.
- Choose any level with the level menu or previous/next buttons. Each cleared level saves separately.
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

Wave composition, simultaneous spawns, huge-wave warnings, health-triggered countdowns, and walking ground tracks now follow pinned PC reconstruction rules. See the [accuracy audit](docs/audit/accuracy.md) for evidence, edition differences, and remaining approximations. **Baseline does not claim exact retail difficulty**; tutorial gates and special-mode supply still differ. Night/pool/fog/roof, full skeletal animation, and most original side modes are not implemented.

## Verification

```sh
npm test
npm run audit
npm run build
```

Eighteen tests cover the ten-level ledger, starting resources, difficulty modifiers, armor overflow, blast geometry, source flag positions/budgets, simultaneous spawns, exact countdown fixtures, frame-independent motion, wave completion, and save migration. Diagnostics in the game show live coordinates, collision bodies, wave plans and spawn logs, with JSON trace export. The production build includes a bundle-size advisory for Phaser, approximately 355 KB gzipped for the main script.

Artwork regression checks (requires Python and Pillow):

```sh
python3 scripts/verify-reference-sprites.py
```

The sprite check catches missing stems/leaves, inconsistent armor canvases, sun dimensions, and empty special-state images. Physical iPad performance still needs user testing.

## Attribution

Game code adapted from [Tino1234567/plants-vs-zombies-game](https://github.com/Tino1234567/plants-vs-zombies-game), commit `81071c0d81c83241bb99c57284f34e861fa0c2c3`, MIT, copyright 2026 ThanosTHINOS. License preserved in THIRD-PARTY-LICENSE.txt.

Original EA/PopCap artwork is separate from the code license. See [asset provenance](docs/assets.md). This reference prototype is deployed on the personal Vercel project documented below.

## Deploy to Vercel

Repository: [breeko/open-games](https://github.com/breeko/open-games). The repository is connected to Vercel project **opengames-breeko** in the personal **breekos-projects** scope. Production address: [opengames-breeko.vercel.app](https://opengames-breeko.vercel.app). `opengames.vercel.app` was already occupied when checked.

To recreate the project, use your **personal Vercel account/scope** and import this repository.

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Root directory | Repository root (`./`) |
| Install command | `npm ci` |
| Build command | `npm run build` |
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

The lawn now keeps the original 4:3 view, with a wooden seed bank, integrated sun counter, stone Menu/pause button and original progress-meter artwork. Plants, zombie bodies, headgear and projectiles have independent display sizes. Sprites export at 2× display size and lawns use lossless PNG. These reduce avoidable blur; they are not a newly discovered native HD asset set. Extra controls are under More, while level navigation, difficulty and Pause remain visible.
