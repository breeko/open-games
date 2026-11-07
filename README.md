# Open Games

An ad-free browser game library for nostalgic favorites and new experiments. Built with Vite, TypeScript and Bun, with touch support for iPad.

[Open the library](https://opengames-breeko.vercel.app) · [Play Garden Guard](https://opengames-breeko.vercel.app/games/garden-guard/)

## Development

```sh
bun install --frozen-lockfile
bun run dev
bun test
bun run build
```

The library is at `/`; Garden Guard is at `/games/garden-guard/`. The production build creates independent HTML pages and JavaScript bundles. The library does not import Phaser or any game's implementation.

## Game boundaries

```text
index.html                          Library page
src/main.ts                         Library presentation and category filtering
src/library.css                     Library styles only
src/games/catalog.ts                Game listings, categories, URLs and cover URLs

games/<game-id>/index.html           Independent game page
src/games/<game-id>/                 That game's rules, UI, audio and save handling
public/games/<game-id>/              That game's art, credits and static files
tests/games/<game-id>/               That game's tests
scripts/games/<game-id>/             That game's asset and diagnostic tools
docs/games/<game-id>/                That game's design notes, provenance and audits
```

Organize by **game identity**, with genre/category stored in the catalog. Two tower-defense games still get separate folders. The platform owns discovery and navigation; games own their mechanics, assets, difficulty, progress and preferences. Games must not import another game's internals. Share code only when multiple games have a demonstrated common need.

Each game runs on a separate page so its engine, styles, timers and audio are unloaded when leaving. New games can use a different engine without changing the library.

### Add a game

1. Choose a unique stable game ID and create its folders above.
2. Add its HTML entry to `vite.config.ts` and its listing to `src/games/catalog.ts`.
3. Keep its asset URLs under `/games/<game-id>/` and include a library link.
4. Namespace its saves as `open-games.<game-id>.<store>.<version>`. Keep migrations in that game.
5. Add its tests and document any sources or licensing in its own folder.

## Current game

**Garden Guard** — tower defense, ten daytime levels, original-art reference mode, touch controls, adjustable difficulty and optional fast sun auto-collection.

[Game documentation](docs/games/garden-guard/README.md) · [Accuracy audit](docs/games/garden-guard/audit/accuracy.md) · [Asset provenance](docs/games/garden-guard/assets.md) · [Inherited MIT code license](src/games/garden-guard/THIRD-PARTY-LICENSE.txt)

```sh
bun run test:garden-guard
bun run check:art:garden-guard
bun run audit:garden-guard
```

The move into a game folder preserves existing Garden Guard saves. Its storage adapter migrates legacy progress, preferences and difficulty into game-specific keys without deleting the originals. Progress remains local to the browser and site origin; an ongoing level is not saved. The library does not own or reset game saves.

## Deployment

Public repository: [breeko/open-games](https://github.com/breeko/open-games). Vercel project: **opengames-breeko**, personal scope **breekos-projects**. `main` deploys automatically through the GitHub connection.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Root directory | `./` |
| Install | `bun install --frozen-lockfile` |
| Build | `bun run build` |
| Output | `dist` |
| Node.js | `24.x` |
| Environment variables | None |

`vercel.json` supplies the build settings. No account/project secrets are committed. `opengames.vercel.app` was already occupied; the live address is **opengames-breeko.vercel.app**.
