# Garden Guard

This folder owns Garden Guard only: entities, rules, levels, scenes, audio, art metadata and persistence. Do not move its mechanics into the library shell or import them from a different game.

- Page: `/games/garden-guard/`; HTML: `games/garden-guard/index.html`.
- Static assets and public credits: `public/games/garden-guard/`.
- Tests: `tests/games/garden-guard/`.
- Tools: `scripts/games/garden-guard/`.
- Research, attribution and difficulty evidence: `docs/games/garden-guard/`.
- Preserve saves with migrations in `state/storage.ts`. Do not read another game's saves.
- Prioritize gameplay and source-backed difficulty; distinguish verified PC rules from Flash edition differences and approximations.
- Original EA/PopCap art is separate from the inherited MIT code license. Keep provenance and attribution intact.
- Use Bun. Useful checks: `bun run test:garden-guard`, `bun run check:art:garden-guard`, `bun run audit:garden-guard`, `bun run build`.

Current campaign: ten day levels, ten night levels and 3-1/3-2, with original night art, Scaredy/Ice mushrooms, Dancing Zombies with linked backups, shields and final grave rises. Projectile size and muzzle alignment use the native 28px canvas at 1.6× board scale.

For every content/combat change, run the per-game tests, sprite checks, source audit and build; retain earlier day fixtures and document remaining approximations. Rule checks are not proof of a full original-equivalent playthrough. Whack uses its own eight-wave director and timed spawn rules; do not run it through normal wave budgets. Preserve ally exclusions when changing zombie targeting or win/loss logic. Next content: 3-3 onward. Pool terrain owns six 136px lanes and separate Lily Pad/main-plant layers. Keep water spawning gated until wave six and non-swimmers on land; final pool rise adds two enemies with 500ms emergence after a 2s delay. Night 2-10 uses weighted mushroom conveyor supply, not the legacy day conveyor cycle. Doom-shroom is playable in 2-9/2-10 with a three-minute crater. Active-level resume uses the shared persistence helpers; keep all new gameplay state in `state/session-data.ts`, preserve existing r1 saves through additive defaults, and run the real-entity browser continuation checks after mechanic changes. PvZ 2 Ancient Egypt is a separate future ruleset; see the accuracy audit before reusing day/night balance.

Sprite presentation uses drawing-only stem/foot anchors in `sprite-presentation.ts`. Keep render transforms out of saved/gameplay coordinates; muzzle offsets must follow static art alignment. Static entities are removed from the Sprite update list, and manually moved zombie bodies skip velocity integration while retaining collision synchronization. Engine profiling wrappers install before scene plugins bind listeners. Backing-canvas scale is chosen at page load with camera zoom preserving the 1280×960 game world; keep the render-only paused-restore path synchronized too.

Pool changes must preserve earlier five-lane snapshots. Terrain-aware GridManager owns support/main layers; save validation must check per-level row counts, water supports and swimming gaits. Squash jump state is in the discriminated plant behavior; do not serialize rendering-only float/sway. Source first-Adventure water mowers are unupgraded and sink near the edge. Pool emergence is 50 ticks, not the 150-tick grave rise.
