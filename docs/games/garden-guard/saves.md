# Garden Guard level saves

Garden Guard uses the shared typed JSON store and autosave scheduler, while keeping its Zod schema and all engine restoration within this game. The ongoing session key is `open-games.garden-guard.session.v1`; campaign progress, preferences, difficulty and all legacy keys remain separate and retain their existing migration behavior.

Refresh or reenter the game to restore the saved level paused. Nothing advances while away. The menu can be left without discarding the level; choose **Menu → Resume saved level** to return. A new level, a difficulty change or a restart replaces the ongoing session. Victory and defeat clear only the ongoing session, after recording the existing campaign result.

Saves run every two seconds, after planting, resource changes and Whack actions, on pause, when entering the menu, and on visibility/page-exit events. A crash or forced browser termination can lose changes since the last successful save. Storage is local to the browser and site origin. A quota/permission failure leaves gameplay available and reports that saving failed. An invalid or incompatible session is retained and automatic writing stays disabled until the player explicitly starts a new level.

## Captured state

- Level, difficulty, loadout, sun balance, seed cooldowns and conveyor stock/supply timing.
- Living plants and health, shooting cadence and pending shots, producer timers, mine arming, bomb fuses, digestion, mushroom growth and grave eating.
- Living zombies, armor/shields, team, headless bleeding, emergence, rage, bite timing, chill duration, ground gait phase and partial pole vaults.
- In-flight peas/spores, velocity, damage, slowing and remaining lifetime; the fixed-step physics remainder.
- Falling/resting/collecting suns, remaining expiry and travel, and pickup claim state so collection cannot credit twice.
- Sky sun timing, mowers, graves, rolling nuts, partial lane bounces and their already-hit zombie references.
- Standard wave countdowns, warnings and health thresholds; Whack's separate spawn schedule; pending final grave rise; both gameplay PRNG states.

Snapshots contain data rather than Phaser scenes, callbacks or object graphs. Restoration rebuilds objects and reconnects references. Expiration/cooldown values use remaining gameplay time. Cosmetic pop/recoil/flash effects, dead-body fades, selection/drag state and historical diagnostic events are not saved. Gameplay randomness uses portable seeded sources; the original game's PRNG is still not reproduced.

The compatibility marker is `garden-day-night-r1`. Change it when new rules cannot resume old sessions safely; add game-owned migrations where practical. Format version changes require a new versioned key and an explicit migration policy. Unsupported saves must not be silently erased. Phaser is pinned to 3.90: the game owns a small adapter for its fixed-step remainder and one-shot tween restoration. Re-run browser checks when upgrading it.

## Verification

```sh
bun test
bun run check:art:garden-guard
bun run audit:garden-guard
bun run build
bun run dev
```

With Vite running, open `/scripts/games/garden-guard/session-browser-check.html`. This development-only page is not a production build entry and does not write game saves. It loads the real engine/assets and checks all sixteen level formats plus a busy night fixture, bowling hit history/bounce, final grave rise and pause. Each continuation is compared frame by frame against the uninterrupted run with controlled clocks. The fixtures exercise partial plant timers, emerging/chilled/allied zombies, a pole vault, suns in all active phases and projectiles.

Browser UI checks also cover planting on level 2-2, refresh restoring that board paused, and returning through **Menu → Resume saved level**. These checks do not substitute for physical iPad testing or full original-game outcome parity.
