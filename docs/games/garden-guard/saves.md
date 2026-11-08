# Garden Guard level saves

Garden Guard uses the shared typed JSON store and autosave scheduler, while keeping its Zod schema and all engine restoration within this game. The ongoing session key is `open-games.garden-guard.session.v1`; campaign progress, preferences, difficulty and all legacy keys remain separate and retain their existing migration behavior.

Refresh or reenter the game to restore the saved level with its menu open. Closed/discarded pages do not advance offline. If the page stays open and auto-pause is Off, an unfocused game can continue running; hidden-tab progress is subject to browser throttling. The menu can be left without discarding the level; choose **Menu → Resume saved level** to return. A new level, a difficulty change or a restart replaces the ongoing session. Victory and defeat clear only the ongoing session, after recording the existing campaign result.

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

With Vite running, open `/scripts/games/garden-guard/session-browser-check.html`. This development-only page is not a production build entry and does not write game saves. It loads the real engine/assets and checks all twenty-four level formats plus a busy night fixture, bowling hit history/bounce, final grave rise and pause. Each continuation is compared frame by frame against the uninterrupted run with controlled clocks. The fixtures exercise partial plant timers, emerging/chilled/allied zombies, a pole vault, suns in all active phases and projectiles.

Browser UI checks also cover planting on level 2-2, refresh restoring that board paused, and returning through **Menu → Resume saved level**. These checks do not substitute for physical iPad testing or full original-game outcome parity.

The 2-10 conveyor uses the existing supply timer as a remaining countdown and supply index as last picked seed index + 1. Other levels retain their previous elapsed-timer/cycle semantics. This is level-specific state within the same r1 schema; expanding the maximum level preserves all earlier sessions. Doom fuses and active crater expiry continue through restoration.

## Pool expansion compatibility

The same `garden-day-night-r1` format and storage keys remain in use. Rows 0–5 are permitted by the general schema, then checked against the selected level (earlier boards still have only five lanes). A cell may contain one `lilypad` support plus one normal plant; duplicate supports/main plants, land pads, unsupported water defenders, water Potato Mines and swimming in a land lane are rejected. Restore constructs supports first, then defenders. Removing a support cascades to its defender; removing the defender keeps its support. This behavior also applies after restoring a damaged stack.

Swimming gait/phase uses the existing motion snapshot. Squash adds a discriminated `squash` behavior with phase, remaining time and target X; its airborne coordinates are reconstructed from those counters. The pending final pool rise reuses the saved delayed-rise countdown and random stream. Each of six mowers retains used/moving/visible state, including a sunk water-edge mower. No earlier session fields or legacy keys are removed. Progress at level 20 advances to 21 after update, and skipped clears remain separate.

The real Phaser checks compare continued full state at 1×/2× for stacked pads, swimmers, bottom-lane projectiles, mid-jump Squash, final emergence, water mowers and daytime sleeping mushrooms. Earlier day/night continuation cases remain in the same suite.


3-3/3-4 preserve the same keys and compatibility marker. `snorkel` is an additive nullable zombie routine (null by default for old saves), containing phase, remaining milliseconds and fractional tick remainder. Kelp's discriminated plant behavior stores its remaining grab time and target zombie index. Invalid, duplicate, wrong-lane and allied target links are rejected; restoration reconnects the same target after constructing all zombies. Saving after its prey dies records a null target and still consumes the kelp at the original deadline. Threepeater's pending release timers can now hold 350ms. Earlier 140ms-or-shorter snapshots remain valid. No campaign progress is reset, and level-22 completion now opens 3-3.
