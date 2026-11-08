# Kingdom Rush player stats

Current Open Games values, November 8, 2026. The tables below show base, zero-star stats; the in-game power cards show your active training. The in-game **ⓘ Guide** reads the live combat definitions; a selected tower's **ⓘ Stats** opens its family and highlights the current tier. The battle pauses while the guide is open and resumes only if it was running before. Existing manual/background pauses remain respected.

Times below are at 1× speed. Range and blast size are horizontal radii in fixed battlefield units (1024 × 768 board), not device pixels. Vertical range is compressed to fit the map perspective. Damage is before armor and resistance. The blast column is a radius, not a diameter.

## Archers

| Tier | Damage | Range | Firing interval | Blast radius | Purchase / upgrade | Total investment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 4–6 | 140.8 | 0.8s | — | 70 | 70 |
| 2 | 7–11 | 160 | 0.6s | — | 110 | 180 |
| 3 | 10–16 | 179.2 | 0.5s | — | 160 | 340 |
| Rangers | 13–19 | 198.4 | 0.4s | — | 230 | 570 |

Physical damage; enemy armor reduces it. Targets ground and flying enemies. Arrows can miss moving targets. Rangers can buy Poison Arrows (250 / 250 / 250) and Wrath of the Forest (300 / 150 / 150).

## Barracks

Each tower supplies three soldiers. Damage, HP and armor below are per soldier. Rally radius is 147.2 at every tier; flying enemies pass over troops. Replacement starts ten seconds after a death, followed by the door and walk back.

| Tier | HP | Damage | Attack interval | Armor | Purchase / upgrade | Total investment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 50 | 1–3 | 1s | 0% | 70 | 70 |
| 2 | 100 | 3–4 | 1.67s | 15% | 110 | 180 |
| 3 | 150 | 6–10 | 1.67s | 30% | 160 | 340 |

Idle healing is 5 / 7 / 10 HP per second at tiers 1 / 2 / 3 after the recovery delay. Upgrades restore soldier health.

## Mages

| Tier | Damage | Range | Firing interval | Blast radius | Purchase / upgrade | Total investment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 9–17 | 140.8 | 1.5s | — | 100 | 100 |
| 2 | 23–43 | 160 | 1.5s | — | 160 | 260 |
| 3 | 40–74 | 179.2 | 1.5s | — | 240 | 500 |
| Arcane Wizard | 76–140 | 198.4 | 2s | — | 300 | 800 |

Magic ignores physical armor but is reduced by magic resistance. Targets ground and flying enemies. Arcane damage is a roll resolved in ten integer-rounded pulses, so actual full-health damage can be lower than the nominal range. Arcane Wizards can buy Death Ray (350 / 200 / 200) and Teleport (300 / 100 / 100).

## Artillery

| Tier | Damage | Range | Firing interval | Blast radius | Purchase / upgrade | Total investment |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 8–15 | 160 | 3s | 62.4 | 125 | 125 |
| 2 | 15–30 | 160 | 3s | 62.4 | 220 | 345 |
| 3 | 30–60 | 179.2 | 3s | 67.2 | 320 | 665 |

Damage falls from the maximum at the center to the minimum at the edge. Physical armor is halved before calculating damage. Artillery aims at ground enemies; splash may hit nearby flyers. Shell release takes 10 ticks (0.33s), followed by 27 ticks (0.9s) of flight. Those delays do not add to the three-second firing interval.

## Reinforcements

- Free; 10s cooldown. Summons 2 soldiers on a road.
- Each has 30 HP, 1–2 physical damage every 1s, and no armor.
- Lasts 20s after activation, or until killed. Blocks ground enemies and cannot attack flyers.
- Recovers 3 HP per second while idle after the recovery delay.

## Rain of Fire

- Free; 80s cooldown. Launches 3 scattered fireballs.
- Each deals 30–60 damage to every enemy in its 64-unit blast radius.
- A target struck by all three takes 90–180 damage. A scattered fireball can miss.
- Ignores physical armor and magic resistance; hits ground and flying enemies. Scorched Earth and Blazing Earth add burning ground when trained.

Calling waves early advances both spell cooldowns by the remaining wave countdown. Southport unlocks reinforcements in wave 3 and fire in wave 7; both unlock at battle start on the other maps.

## Purchases and progression

Gold in the purchase column is an additional cost, not the cumulative price. Selling returns 60% of total investment, rounded down. New towers take one second to construct. Attack damage, range or speed changes are shown tier by tier in the guide; some upgrades do not improve all three.

- Southport: tier 1.
- The Farmlands / Pagras: tiers 1–2.
- Twin Rivers Pass: tiers 1–3.
- Silveroak Forest: tiers 1–3, Rangers from wave 5; an existing tier-three archer and the elf camp.
- The Citadel: tiers 1–3 plus Rangers and Arcane Wizards from preparation.

Tower skills are purchased with battle gold. Power star upgrades are available through Guide → ★ Power upgrades, before the first wave. Heroes and tower star-upgrade branches remain unavailable. Available and locked tiers are labeled for the current map and wave.

Silveroak elves: repair 100 gold, hire 100 gold each, maximum four living. Each has 200 HP and 25–50 physical melee/bow damage. Melee interval 1.6s; bow interval 1.5s and range 204.8. Elves have no automatic replacement.

See [all skill ranks and power training](skills-and-power-upgrades.md) for costs, effects, source quirks, star earning/refunds and validation evidence.

## Practice

Open **About this test level & tools**, choose a practice wave, and press **Prepare practice**. Wave one starts with the map's normal gold. Later waves add scheduled kill rewards from earlier waves, excluding early-call bonuses and summoned enemies.

Practice uses your campaign powers by default. **Custom practice powers** lets you try any Rain of Fire and reinforcement ranks without buying them. The panel shows the star cost and flags budgets above the stars available from earlier maps on a first visit. The map labels the temporary budget, for example **Practice ★14**.

Practice awards no records or stars and preserves your campaign battle and upgrades. **Restart** restarts the practice setup. To leave, use **Return to campaign** in tools or select your current map in **Maps**. The return button also appears after practice ends. In fullscreen phone landscape, use Maps to return; rotate to portrait to access the tools below the map.
