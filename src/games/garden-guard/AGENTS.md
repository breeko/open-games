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

Pending game work: review projectile size/alignment and other sprite proportions, expand source-backed levels, investigate PvZ 2's desert world, and keep difficulty comparisons in the accuracy audit. This architectural refactor does not claim to complete those tasks.
