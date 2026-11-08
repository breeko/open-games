# The Citadel — stage 6

Added November 8, 2026. Open `/games/kingdom-rush/?level=6`, choose it in Maps, or continue from Silveroak. Saves and completed records remain independent per map.

## Original facts used

Targets Armor Games Flash v1.13, Normal, without heroes or purchased star upgrades. The [manifest](level06-manifest.json) records pinned literal inputs and their hashes. Original numeric facts come from the locally inspected publisher SWF, SHA-256 `7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23`. Neither its executable nor decompiled ActionScript is shipped. The pinned community export supplies artwork and animation descriptors.

- 700 gold, 20 lives, 17 wave groups, 429 scheduled enemies plus summoned Golem Heads.
- Fifteen foundations; five original routes with three lanes each and central node counts 157 / 157 / 168 / 169 / 283. The fifth route belongs to the boss. Original sites, rally points, activation and escape boundaries are retained.
- Base Rangers and Arcane Wizards are available from preparation. Arcane promotion costs 300 additional gold (800 total), has 76–140 rolled magic damage, a 60-tick cycle, 18-tick release and ten integer damage pulses. It does not receive an extra ordinary projectile impact. Death ray, teleport, poison and root purchases remain unavailable.
- Gargoyles bypass soldiers and direct artillery acquisition. Arrows and magic can target them; artillery splash and Rain of Fire can still hit them, following the original damage rules.

| Enemy | HP | Physical armor | Magic resistance | Gold | Escape cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gargoyle | 90 | 0% | 0% | 12 | 1 |
| Dark Knight | 300 | 80% | 0% | 25 | 1 |
| Shadow Archer | 180 | 0% | 30% | 16 | 1 |
| Juggernaut | 10,000 | 0% | 0% | 0 | 20 |
| Golem Head | 125 | 0% | 0% | 10 | 1 |

Shadow Archers use a 30-eligible-frame ranged reload, 12-tick charge, release on tick seven and 20–30 ranged damage. Their melee attack remains separate. The initial reload allows walking; after shooting they hold their firing stance through the reload, retaining a living target through release. The Juggernaut uses 180 / 270 eligible-frame summon / missile counters, 49-tick charges and tick-24 releases. Summons hatch seven Golem Heads, seven ticks apart, cycling lanes. Boss death cancels its owned pending summons/projectiles and clears the surviving army. Its melee attack can damage up to ten soldiers in the original forward ellipse. A boss escape costs all twenty lives.

Boss missiles deliberately use the original `MissileEnemy` implementation's BFG-derived 100–140 splash damage and 38.4-world-pixel radius; the unused boss settings are not substituted for that code path. Enemy arrows currently use approximate soldier hit rectangles. Boss missile turning/retargeting, summon flight/appearance, animation transitions and ordering remain approximations. Projectile art is still drawn with Canvas primitives. The four atlas pages, background and metadata total about 18 MB and load for this selected map; physical iPad memory/performance remains untested.

## Calibration evidence

Corrected shaman healing to count eligible updates only: entrance frames and melee wind-ups freeze the cooldown. Healing begins after 240 eligible frames, applies on cast tick fourteen, holds for twenty-eight ticks and resets its cooldown after the cast. Source health, gold, damage and spawn multipliers were not adjusted to force an outcome.

Historical command replays under the new rule are distinct from their preserved browser records:

| Control | Current simulation result | Meaning |
| --- | --- | --- |
| Pagras historical browser commands | Win, 13 lives, 361 gold, 322 kills, tick 16,364 | Previously replayed at eight lives; this is not a new browser victory. |
| Twin Rivers historical seven-tower browser commands | Loss, wave 6, 734 gold, 146 kills, tick 8,891 | Original reference control lost in wave 7. The parity gap remains. |
| Twin Rivers authored mixed defense, seed 1 | Win, 7 lives, 318 kills | Previously nine lives. RNG/order changes do not produce a uniform difficulty reduction. |

A fixed three-tower opening was also observed in the browser: tier-two mages 14/12 and tier-two barracks 9 rallied near (513,235), with no later purchases or powers. It lost in wave 4 at tick 32,738, 372 gold / 26 kills. Preparation occupied the early ticks; wave one began at 28,558. Its [complete commands](playtests/2026-11-08-citadel-opening-browser.json) and [screen](playtests/2026-11-08-citadel-opening-browser.jpg) are preserved. This is a passive control, not an active full-defense attempt.

Several authored full Citadel defenses still lose around waves 4–6. **No full seventeen-wave victory or matched original Citadel browser comparison has been established.** This map is available for playtesting; its difficulty is not certified. A normal original campaign may already have star upgrades, whereas this comparison mode has none.

Played the final encounter in the actual local browser using Practice wave 17, seed 12,648,430. Preparation used six Arcane Wizards (14, 12, 9, 10, 8, 11) and two Rangers (4, 6); mage 3 was added and promoted during combat. Powers were placed manually. The attempt ended in **defeat at tick 5,522, 538 gold, 131 kills**, with the boss escaping at **1,858 HP**. The [exported command history](playtests/2026-11-08-citadel-boss-browser.json) replays that terminal result exactly. The [final screen](playtests/2026-11-08-citadel-boss-browser.jpg) is preserved. This was boss practice, not a full campaign run or a win.

Practice is available in the existing tools panel. It starts the selected wave with original starting money plus scheduled kill rewards from earlier groups: **5,958 gold for Citadel wave 17**. It excludes early-call bonuses and summoned-unit rewards. It preserves the campaign autosave and never updates completed records; returning to the map restores the real campaign battle. Practice traces are explicitly marked. Reloading after the boss defeat restored the original 700-gold, wave-zero campaign preparation, confirming save preservation through the actual UI.

At **844 × 390**, the actual browser board measures exactly 844 × 390 with no horizontal overflow. Ranger purchases, both power placements and pause work with controls over the map; [phone landscape screen](playtests/2026-11-08-citadel-mobile.jpg). The practice indicator stays visible in the compact HUD. This is viewport emulation, not physical-device validation.

Validation: **81 Kingdom Rush tests + 4 game-boundary checks**, production build and scoped whitespace checks pass. Tests cover geometry/schedule/asset frames, flying exclusions, shaman clocks, beam pulse totals, boss summons and missiles, army cleanup, escape cost, and deterministic restoration during special attacks. The next calibration milestone is an original Citadel run with matched purchases/powers and a complete local defense. Star upgrades, advanced tower skills, detailed enemy-projectile collision and physical-device performance remain open.

## Reproduction

```sh
python3 scripts/games/kingdom-rush/prepare-campaign.py /path/to/decompiled/scripts /path/to/original.swf --levels 6
java -Djava.awt.headless=true -cp /path/to/ffdec.jar scripts/games/kingdom-rush/Bounds.java /path/to/original.swf
bun test tests/games/kingdom-rush tests/library-boundaries.test.ts
bun run build
```

JPEXS 26.4.0 is the external extraction tool. Original artwork provenance remains separate from the independently authored implementation; see the existing credits.
