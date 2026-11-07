# Project instructions

## Ownership and deployment

- This is Branko's personal project.
- Use personal GitHub account `breeko`. Multiple GitHub identities exist on this computer; verify the account and repository owner before creating repositories or pushing.
- Deploy to Branko's personal Vercel account/scope. A separate work Vercel account also exists; verify the selected scope before linking or deploying.
- Hosting preference is Vercel.

## Product priorities

- Free, ad-free nostalgic browser games.
- First reference game: original Plants vs. Zombies.
- Prioritize gameplay, challenge, and progression over animation fidelity.
- Support touch and responsive layouts. Target device: iPad 6th generation running iPadOS 17.7.11 (confirmed by Branko). It is above the researched Safari 16.4 browser floor; performance and interaction compatibility still require testing on the device.
- Prefer TypeScript and explicit types.
- Use Bun for dependency installation, scripts, tests and Vercel builds. Commit bun.lock; do not introduce npm lockfiles.
- See `docs/games/garden-guard/stack-and-game-research.md` for the stack recommendation, evidence, and open questions. Vite + TypeScript + Canvas was approved. The implementation reuses MIT-licensed Phaser code with Canvas rendering. See README.md for current behavior.

## Branko's email rule: drafts only

Always prepare and save an unsent draft for Branko to review. Requests such as
"send", "reply", "respond", "give them a nudge", or "follow up" mean draft the
email, even when they name the recipient and message purpose. They are not
permission to deliver it. Do not send emails or schedule delivery through any
connector, API, CLI, automation, or UI. Leave sending to Branko; approval of the
copy alone is not permission to send. Only an explicit change to this standing
rule can authorize agent delivery. Show the draft copy or link and clearly say
it remains unsent. This applies to cold outreach and existing conversations.

- Current scope includes original-sprite local reference mode, pause, unrestricted ten-level daytime navigation, and adjustable difficulty. Prioritize close gameplay and appearance; storyline and transitions may be omitted. Preserve upstream MIT attribution and separate original-art provenance.


## Library architecture

- Open Games is a library of independent games, not a single Garden Guard application.
- The library shell owns catalog/discovery/navigation only. `src/games/catalog.ts` is metadata and must not import any engine or gameplay code.
- Engine-independent persistence helpers live in `src/shared/persistence/`. Games may import them directly; each game still owns its schemas, snapshots, restoration, migrations and compatibility decisions. Shared helpers must not import game implementations or engines.
- Each game has its own HTML page at `games/<game-id>/index.html`, code at `src/games/<game-id>/`, assets/credits at `public/games/<game-id>/`, tests at `tests/games/<game-id>/`, tools at `scripts/games/<game-id>/`, and documentation at `docs/games/<game-id>/`.
- Separate games even when they share a genre. Categories are listing metadata, not a reason to mix assets or logic.
- Game storage keys must be namespaced and versioned: `open-games.<game-id>.<store>.<version>`. A game owns its migrations; preserve existing saves.
- Do not import another game's internals or extract a shared engine speculatively. Keep independent bundles so the library does not download game runtimes.
