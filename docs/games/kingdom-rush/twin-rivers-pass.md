# Twin Rivers Pass — stage 4

Added November 7, 2026. Open `/games/kingdom-rush/?level=4`, or select it in Maps. Pagras now offers Next map after victory. The map remains freely selectable and owns its autosave and best-defense record; earlier map keys and compatibility markers are retained.

## Reference and implementation

Targets publisher-hosted Armor Games Flash v1.13 on Normal, campaign, with no hero or purchased star upgrades. The original calls the stage “Twin Rivers”; its stage description names Twin Rivers Pass. Numeric facts come from the pinned original SWF, SHA-256 `7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23`.

- 680 gold, 20 lives, 15 tower sites, 13 wave groups, 329 enemies.
- Two simultaneous routes, each with three lanes. Original central path lengths are 174 and 185 nodes. The original active/escape boundaries and tower/rally points are converted at scale 1.28, x offset 62.4.
- Each wave group contains both route spawners. Bandits first appear in wave 6; brigands in wave 11. Original waits, alternating chunks and route assignments are retained.
- All four tier-three tower upgrades unlock here. Earlier stages retain their original tier caps. Tier-three launcher offsets, artillery splash radius and knight soldiers are modeled; their animation/art comes from the pinned visual export.

| Addition | Original Normal rules used |
| --- | --- |
| Bandit | 70 HP, no armor, 50% melee dodge, 20–30 damage, 8-frame first hit, 30-frame attack cycle, 8 gold |
| Brigand | 160 HP, 50% physical armor, no dodge, 6–10 damage, 13-frame first hit, 30-frame attack cycle, 15 gold |
| Tier-three archers | 160 upgrade cost, 10–16 damage, 15-frame shot cycle |
| Tier-three mage | 240 upgrade cost, 40–74 magic damage, 45-frame shot cycle |
| Tier-three artillery | 320 upgrade cost, 30–60 splash damage, 90-frame shot cycle, 67.2 world-pixel splash radius |
| Tier-three barracks | 160 upgrade cost; knights have 150 HP, 30% armor, 6–10 damage, 50-frame attack cycle, 10 HP per recovery tick |

Bandit dodge uses the existing melee-only dodge rule; arrows and magic are not dodged. Brigands use the existing physical/magic/explosion armor distinctions. New enemy arrow-collision bounds were extracted from the original symbols with `Bounds.java`; previous enemy bounds are unchanged.

The [asset manifest](level04-manifest.json) pins every downloaded input. Community data/art is read as literal tables, JSON and images, never executed. Stage-four geometry and waves use the original numeric facts rather than community combat settings. The two repacked 2048-square sheets, background and scene load only when this map is selected. Original Ironhide artwork rights remain separate from authored implementation; this remains the existing unofficial reference prototype.

## Verification and limits

The automated mixed-defense check completes all 13 waves with 5 lives / 316 kills at the default seed. It uses frequent powers and a defined upgrade sequence; this establishes a complete playable route through the simulation, not original difficulty parity or a manual browser victory.

Tests also cover concurrent routes, wave-six/eleven enemy introductions, extracted collision bounds, original purchase costs and tier caps, knight promotion, all visible map sprites, per-map persistence and restoring both-route combat with tier-three towers. Existing Southport, Farmlands and Pagras regression outcomes remain unchanged.

Dense tower placement revealed overlapping selection areas. Tapping a foundation now prefers its nearer site over a neighboring tower's tall hit box. Upgrade labels and affordability checks use the next tier's price, including tier-three costs.

Browser play and original comparison observations are recorded below. A single comparison cannot establish shared-RNG fidelity. Existing limits around per-frame ordering, target tie selection, terrain validation, visual export differences and omitted star upgrades remain; no HP/gold/damage multiplier is used to force matching results. Physical-device testing remains open.

## Reproduction

```sh
python3 scripts/games/kingdom-rush/prepare-campaign.py /path/to/decompiled/scripts /path/to/original.swf --levels 4
java -Djava.awt.headless=true -cp /path/to/ffdec.jar scripts/games/kingdom-rush/Bounds.java /path/to/original.swf
bun test tests/games/kingdom-rush tests/library-boundaries.test.ts
bun run build
```

The original executable and ActionScript remain outside the repository. The preparation script extracts numeric facts only. JPEXS 26.4.0 is an external research dependency, not a shipped game dependency.

## Browser observations

- Played the original publisher-hosted stage on **Normal**, no hero or purchased star upgrades. Built barracks 13/5, artillery 14/6, mages 12/4 and archers 9 before starting, leaving 20 gold. No later commands, powers, rally changes or early waves. This deliberately weak control ended in **defeat during wave 7**; see the [original final screen](playtests/2026-11-07-twin-rivers-original.jpg).
- The [same-defense local diagnostic](playtests/2026-11-07-twin-rivers-static-diagnostic.json), with no later commands, loses in **wave 6**, 734 gold / 146 kills at tick 8,354. This is a headless comparison against an actual original browser run, not a second local browser run. It suggests the existing combat gap persists here; randomness and frame order are not synchronized.
- The actual local browser attempt used the same seven opening towers, then mage upgrades at 12/4, artillery 14's upgrade and powers. It ended in **defeat during wave 8**, 380 gold / 176 kills at tick 12,538. See the [final screen](playtests/2026-11-07-twin-rivers-browser.jpg) and [export](playtests/2026-11-07-twin-rivers-browser.json). The attempt included reload/restore while testing UI fixes. Current trace exports begin a new event history after restoring, so this export contains the terminal totals and post-restore events only; it cannot reproduce the complete opening. The independent full-campaign automated test is the complete-command regression. Preserving event history across restoration is a follow-up tooling issue.
- Bought tier-three artillery through the browser: 125 + 220 + 320 gold, leaving 15, with the correct tier-three sprite and no further upgrade offered. Confirmed save restoration and all four map cards. At **844 × 390**, the map fills phone landscape with controls over the board and the desktop heading removed; see the [mobile screenshot](playtests/2026-11-07-twin-rivers-mobile.jpg). This is browser emulation, not a physical phone/iPad test.

Validation: **58 Kingdom Rush tests + 4 game-boundary checks**, production build and whitespace checks pass. This pass adds the stage and its mechanics; **a manual all-13-wave victory and full original difficulty parity are still unverified**. No later campaign map is added in this change.
