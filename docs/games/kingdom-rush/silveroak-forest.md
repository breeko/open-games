# Silveroak Forest — stage 5

Added November 7, 2026. Open `/games/kingdom-rush/?level=5` or use Maps / Next map from Twin Rivers. This map has its own autosave and completed-defense record.

## Original facts used

Targets the pinned Armor Games Flash v1.13 campaign, Normal, with no hero or purchased star upgrades. [The manifest](level05-manifest.json) records input URLs and SHA-256 hashes. Numeric facts are extracted from the original `Level5` and related definitions; downloaded ActionScript is not executed or shipped. The community export supplies visual assets only.

- 700 starting gold, 20 lives, 15 waves, 235 scheduled enemies plus hatched spiderlings.
- Three entrances, three lanes per route, original central path lengths 196 / 148 / 128 nodes, 13 ordinary tower sites and the separate elf camp. Original tower/rally points and activation/escape boundaries are retained.
- An existing tier-three archer tower occupies site 4 and does not consume the 700 starting gold. Restoring a save does not duplicate it.
- Giant spiders, spider matriarchs and their offspring, worgs and marauders join the existing enemy roster. Their physical/magic protection, dodge, melee timing, gold and escape costs come from the original settings.
- Each matriarch chooses one interval from 120–240 ticks, lays at most three nests while unblocked, and each nest hatches three spiderlings after 86 / 93 / 100 ticks, cycling lanes 0 / 1 / 2 at the mother's route/node. Nests survive the mother. Unhatched offspring prevent premature victory.
- Repair the elf camp for 100 gold, then hire up to four living elves at 100 each. Elves have 200 HP, 25–50 melee/bow damage, ranged attacks outside melee range and no automatic replacement after death. Their camp rally point can move along nearby roads.
- The base ranger upgrade unlocks in wave five for 230 gold, with 13–19 damage, a 12-tick shot cycle and original range/launcher offsets. Other tower families retain their tier-three cap.

| Enemy | HP | Physical armor | Magic resistance | Gold | Escape cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Giant spider | 60 | 0% | 65% | 6 | 1 |
| Spider matriarch | 250 | 0% | 80% | 20 | 2 |
| Spiderling | 10 | 0% | 50% | 0 | 1 |
| Worg | 120 | 0% | 50% | 12 | 1 |
| Marauder | 600 | 60% | 0% | 40 | 3 |

New arrow-collision facts come from original symbol bounds, including attached health bars. The three repacked 2048-square sheets, background and scene load for Silveroak only. Original Ironhide artwork rights remain separate from authored code; this remains the existing unofficial reference prototype.

## Calibration carried forward

This pass corrects shared enemy movement to the original full-step/node-tolerance rule: move once, then advance if within `speed + 0.1` native pixels, without snapping or carrying leftover travel. Base archer/mage range now uses exactly 140.8 world pixels; barracks rally display uses 147.2. Health, damage, starting money and spawn multipliers were not changed to force matching scores.

The original seven-tower Twin Rivers control from the previous pass loses in wave seven. A **new actual local browser control** under these corrections still loses in wave six (742 gold / 147 kills, tick 8,908 including preparation). Its [complete trace](playtests/2026-11-07-twin-rivers-path-browser.json) and [screen](playtests/2026-11-07-twin-rivers-path-browser.jpg) are preserved. Exact difficulty parity remains unresolved; the corrections do not close this gap.

[Historical-command diagnostics](playtests/2026-11-07-path-tolerance-calibration.json) distinguish new simulation results from old browser observations. Southport now replays at 14 lives / 216 gold, versus the original's 13 and previous local replay's 15. The historical Pagras commands still win, now with 8 lives / 361 gold. The earlier Farmlands failed-command schedule now loses in wave seven under the corrected movement/range rules; its former five-life win applied to the prior rules. Historical files are preserved unchanged. These changes are source corrections, not a uniform difficulty reduction.

## Verification and remaining limits

The automated complete Silveroak defense wins all 15 waves and their offspring with 9 lives / 330 kills at the default seed; two additional diagnostic seeds finished with 11 lives each. This uses an authored purchase/power policy and is separate from browser play. Tests cover nests surviving death, delayed hatching and save continuity, three-route geometry, prebuilt tower restoration, elf limits/costs/bows, ranger unlock and complete-campaign resolution.

Full event history is now retained in new autosaves. Trace exports include `completeHistory`; older sessions without history remain playable and export `false`. This prevents restored sessions from silently appearing to be complete command records.

Ranger poison/root skill purchases remain unavailable. Elf formation, detailed animation transitions and nest fading are approximations. Heroes and star upgrades remain outside this comparison mode. An original Silveroak browser playthrough and physical iPad/phone performance comparison are still open; source verification is not a substitute for those checks.

Actual local browser play ended in **defeat during wave 14**, 359 gold / 253 kills at tick 18,568, after reaching wave 12 with 14 lives. It used the existing archer, barracks 12, artillery 13, mages 6/3, two hired elves, ranger promotion and powers. Purchases were later than the automated policy, and the attempt included reload/restore during the render/aim checks. The [complete exported commands](playtests/2026-11-07-silveroak-browser.json) reproduce that **exact defeat** under the final rules, including terminal tick, gold and kills. The [final screen](playtests/2026-11-07-silveroak-browser.jpg) is retained. This is not a manual all-wave victory.

The final browser smoke check also exercised camp repair, two hires and moving the elf rally. At **844 × 390**, the board fills phone landscape and all controls remain over the map; [screenshot](playtests/2026-11-07-silveroak-mobile.jpg). The chooser displays all five maps with earlier completed records retained. This is viewport emulation, not physical-device verification.

Validation: **69 Kingdom Rush tests + 4 game-boundary checks**, production build and whitespace checks pass. Only Kingdom Rush folders changed.

## Reproduction

```sh
python3 scripts/games/kingdom-rush/prepare-campaign.py /path/to/decompiled/scripts /path/to/original.swf --levels 5
java -Djava.awt.headless=true -cp /path/to/ffdec.jar scripts/games/kingdom-rush/Bounds.java /path/to/original.swf
bun test tests/games/kingdom-rush tests/library-boundaries.test.ts
bun run build
```

The pinned SWF SHA-256 is `7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23`. JPEXS 26.4.0 is an external research tool; the original executable and ActionScript remain outside the repository.
