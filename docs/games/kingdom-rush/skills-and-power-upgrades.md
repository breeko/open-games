# Tower skills and power upgrades

Implemented November 8, 2026, within Kingdom Rush only. Targets the existing Armor Games Flash v1.13 reference. The [manifest](skills-manifest.json) records the original SWF hash, inspected source-file hashes, numerical costs and runtime quirks. Original executable / ActionScript code is not distributed or executed by the browser.

## Battle-gold skills

Promote Rangers in Silveroak from wave five or in The Citadel; promote Arcane Wizards in The Citadel. Select that tower to buy each of its two skills. Costs are additional gold for each rank; skills have three ranks, are owned by that tower, and contribute to its 60% sale refund. The guide shows prices, current ranks and rules; [Arcane guide screen](playtests/2026-11-08-arcane-skills-guide.jpg). Purchases follow the existing pause, affordability and end-state guards.

| Tower | Skill | Rank 1 / 2 / 3 gold | Original behavior |
| --- | --- | --- | --- |
| Rangers | Poison Arrows | 250 / 250 / 250 | Susceptible enemies receive 90 eligible updates of poison. Each pulse deals 5 / 10 / 15 true damage. Spiders, spiderlings, Golem Heads and the Juggernaut are immune. Poison arrows favor targets without poison. |
| Rangers | Wrath of the Forest | 300 / 150 / 150 | Up to 4 / 6 / 8 targets, rooted for 1 / 2 / 3 seconds, 40 true damage each second. Requires two eligible ground enemies in range; excludes bosses and fighting enemies, respects dodge and the three-applications-per-enemy limit. Eight-second reload, separate druid cast with release on update 18 and reset on update 35; ordinary arrows continue. |
| Arcane Wizard | Death Ray | 350 / 200 / 200 | One non-boss disintegrates on the final update of its ten-pulse beam, retaining normal gold credit. 20 / 18 / 16 second reload clock. Bosses receive the normal beam and do not consume the ready disintegration. |
| Arcane Wizard | Teleport | 300 / 100 / 100 | 25 / 30 / 35 path nodes backward, plus the original rounded −3…+6 offset, clamped at node 10. Ten-second reload counter, twenty-update cast, portal created on update five, five-update fade-in and ten-update active window. Three teleports maximum per enemy. Bosses excluded; flyers are eligible. |

The pinned Flash runtime differs from some tooltip expectations:

- Poison's pulse counter fires every **31** eligible updates, yielding **two pulses** on an uninterrupted 90-update application. Equal/stronger poison refreshes the duration and pulse clock; weaker poison cannot replace or refresh stronger poison. Enemy special movement runs first: roots and teleport suspend both poison clocks. This follows `Enemy`, `EnemyCommon`, `DebuffPoison` and its base debuff class rather than substituting nominal damage-per-second arithmetic.
- Teleport's actual portal cap is `(3 + rank) × rank`: **4 / 10 / 18**, whereas its tooltip describes 4 / 5 / 6. Both the world position and inactive state are preserved through the two-phase teleport animation. Acquiring soldiers release their targets, and beams / arrows cannot hit an inactive teleporting enemy.
- Arcane death-ray and teleport clocks have increments inside eligibility checks as well as their per-frame timers. Displayed reload values describe the original clocks; cast/reload ordering changes the exact time between attacks. The implementation retains those extra increments.

## Campaign-star power training

Open **ⓘ Guide → ★ Power upgrades** before calling the first wave. A best campaign victory awards three stars with 18–20 lives, two with 6–17, or one with 1–5. Existing completed records supply their earned stars; replaying a map does not duplicate them. Practice never earns stars or completed records.

Buy each branch in order. Both branches share the earned-star budget across maps. Reset refunds all spent stars without clearing completed results. The six available maps can supply at most 18 stars; fully buying both power branches costs 24, so players choose a distribution or reset it. Tower star-upgrade branches, heroes and alternate-mode star awards remain outside this change.

| Rain of Fire upgrade | Additional stars | Effect, cumulative with earlier ranks |
| --- | ---: | --- |
| Blazing Skies | 1 | Five targeted fireballs instead of three, 50–80 damage each. |
| Scorched Earth | 1 | Each impact leaves a five-second, 64-radius ground patch; 10–20 physical damage per pulse. |
| Bigger and Meaner | 2 | 90–120 impact damage; 80-radius impacts; 70-second cooldown; wider scatter. |
| Blazing Earth | 2 | Ten-second ground patches with 20–30 damage per pulse; 60-second cooldown. |
| Cataclysm | 3 | 150–180 impact damage; five extra fireballs strike randomly selected road nodes alongside the five targeted fireballs. |

Upgraded storms launch at updates 10 / 20 / 30 / 40 / 50. Each ground patch rolls damage once, then repeats it each second. Burning ground applies **physical armor** and excludes flyers. The expiration update returns before damage, so a complete five-/ten-second patch has **four / nine** pulses. Impact damage still ignores armor and magic resistance and can hit flyers. Source projectile/decal ordering and random draw ordering are not certified frame-identical to the Flash runtime.

| Reinforcement upgrade | Additional stars | HP each | Melee damage | Armor | Idle healing / second |
| --- | ---: | ---: | ---: | ---: | ---: |
| Well Fed | 2 | 50 | 1–3 | 0% | 6 |
| Conscripts | 3 | 70 | 2–4 | 10% | 9 |
| Warriors | 3 | 90 | 3–6 | 20% | 12 |
| Legionnaires | 3 | 110 | 6–10 | 30% | 15 |
| Spear Throw | 4 | 110 | 6–10 | 30% | 15 |

Two soldiers still last twenty seconds and use a ten-second power cooldown. Spear Throw adds 24–40 physical damage against distant ground or flying enemies: ellipse radius 166.4, Euclidean minimum distance 51.2, thirty-update reload, ten-update charge with release on update five, and twelve-update ballistic flight. The original Spear display bounds are extracted into the existing collision facts and used for hit testing.

Training is saved in a separate Kingdom Rush profile. New battles use it; saved battles retain their own frozen power loadout. Purchases/reset apply to an unstarted preparation, and are disabled after battle starts. Old snapshots default to zero power upgrades and no tower skills. Snapshots now retain skill ranks, eligible counters, debuffs, portal transit, storms, ground patches and reinforcement ranks. Traces export the power loadout and skill purchase commands. The original zero-upgrade command controls still resolve unchanged.

## Verification and limits

Automated checks cover costs, guards, refunds, poison application/immunities/refresh/pulses, roots and poison suspension, boss immunity, backward-node limits and teleport transit, death-ray completion, every power rank, timed fireball counts, ground-only physical burns, star budgeting, soldier stats, spear targeting, old-save defaults, save validation and deterministic continuation during effects. Existing unupgraded browser command regressions remain separate from upgraded play.

Actual browser checks bought all twelve tower-skill ranks, star purchases and refunds, Well Fed plus Blazing Skies with exactly three earned stars, and Scorched Earth using two. A real 250-gold touch purchase changed Poison from 0/3 to 1/3 and the sale value from 342 to 492. Power training was disabled during the running battle. At 844 × 390 the map remains edge-to-edge and the skill controls fit on the map; [mobile screen](playtests/2026-11-08-skills-mobile.jpg).

The [first combined-skill browser control](playtests/2026-11-08-skills-browser.json) started practice at wave 16 and ended in wave-17 defeat at tick 9,031, 1,848 gold / 142 kills. It recorded 114 poison applications, 91 roots, 57 teleports and 11 death rays, without manual powers. It predates the root/poison-order correction and is preserved unchanged. Its commands under the corrected rules now lose at tick 8,914 with the same gold/kills, 86 roots, 50 teleports and 13 death rays. Those are replay diagnostics, not a relabeled browser outcome.

A **new actual browser control under the final root/poison rules** used the same four-tower setup and all twelve skill purchases, starting at practice wave 16. It ended in wave-17 defeat at **tick 8,267, 1,848 gold / 142 kills**, with 114 poison applications, 86 roots, 50 teleports and 13 death rays. Its [complete commands](playtests/2026-11-08-skills-final-browser.json) reproduce the observed terminal result exactly; [final screen](playtests/2026-11-08-skills-final-browser.jpg). No manual power casts were used. Preparation timing differs from the first control; this is a new observation, not the older replay result.

Two further actual partial controls verify upgraded power commands: [Well Fed / Blazing Skies](playtests/2026-11-08-upgraded-powers-browser.json) records both casts and five launched fireballs, paused in wave five at tick 1,141; [Scorched Earth](playtests/2026-11-08-burning-ground-browser.json) records its five-ball cast, paused at tick 493 with 24 kills, 254 gold and twenty lives. Both replay exactly under final rules. Ground patches were observed during play; [after-cast screen](playtests/2026-11-08-burning-ground-browser.jpg). They are not full campaign victories.

No synchronized original upgraded playthrough or full Citadel campaign victory has been established. These are source-verified mechanics and local tests, not a certification of retail difficulty parity. Detailed effects and upgraded reinforcement uniforms remain approximate: rank-marked militia visuals are used, with simple Canvas poison, roots, portals, beams, spears and ground patches. Target ordering, druid/shooter animation integration, global random ordering and minor display-list frame ordering remain limitations. Busy effects have not been measured on the physical iPad.

Validation: **102 Kingdom Rush checks plus four game-boundary checks (106 total)** pass, as do the production build and scoped whitespace checks. Changes remain inside Kingdom Rush source, tests, scripts, artwork credits and documentation.
