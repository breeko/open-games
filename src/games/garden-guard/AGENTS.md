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

Current campaign: ten day levels plus 2-1 through 2-6, with original night art, four mushrooms, shields and final grave rises. Projectile size and muzzle alignment use the native 28px canvas at 1.6× board scale.

For every content/combat change, run the per-game tests, sprite checks, source audit and build; retain earlier day fixtures and document remaining approximations. Rule checks are not proof of a full original-equivalent playthrough. Whack uses its own eight-wave director and timed spawn rules; do not run it through normal wave budgets. Preserve ally exclusions when changing zombie targeting or win/loss logic. Next content: 2-7 (Scaredy-shroom is already prepared) and later night mechanics. PvZ 2 Ancient Egypt is a separate future ruleset; see the accuracy audit before reusing day/night balance.
