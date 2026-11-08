# First Adventure accuracy audit

Audited 2026-11-07. This is a PC first-Adventure reconstruction, not a claim of binary parity with the Flash trial embedded by GamePix. Baseline difficulty uses reference health and motion; Relaxed/Hard intentionally change them.

## Evidence and provenance

Primary reconstruction: [ruslan831/PlantsVsZombies-decompilation at 325b222](https://github.com/ruslan831/PlantsVsZombies-decompilation/tree/325b2229a7225d73870bb69322eefcda3a45bf8d).
Independent comparison: [Patoke/re-plants-vs-zombies at c469203](https://github.com/Patoke/re-plants-vs-zombies/tree/c4692036c5e11d227c8fb7c593b734dac96da028).
Files below refer to the pinned primary reconstruction. These are reverse-engineering sources, not an official specification. We independently implemented the wave picker/countdown; the portable seeded LCG does not reproduce the original PRNG stream.

The GamePix page embeds a Flash SWF through Ruffle at Play-Games. Browser observation confirmed level 1-1's 150 starting sun and that planting/tutorial prompts hold up the opening. We have **not** measured a complete Flash playthrough or established identical wave data across editions. PC evidence is the basis for the numerical corrections below.

Two reconstructions disagree materially. The primary reconstruction's correction notes report assembly-backed fixes for normal speed's upper bound (.37 rather than .32) and the NOT in the pre-flag countdown condition. We selected those corrected rules. We have not independently checked an original executable's assembly; this remains a provenance limitation.

## Implemented rules

| Area | Reference | Implementation |
|---|---|---|
| Clock | SexyAppBase.cpp mFrameTime=10; Reanimator.h SECONDS_PER_UPDATE=.01 | Wave countdown and walking tracks advance in 10 ms ticks |
| Wave count | Board::InitZombieWaves | 4,6,8,10,8,10,20,10,20,20; night 10,20,10,20 |
| Flags | Board::GetNumWavesPerFlag / IsFlagWave, around 518 | No flag in 1-1; last wave in short levels; waves 10 and 20 in long levels |
| Wave budget | Board::PickZombieWaves, 575–795 | floor(zero-based wave/3)+1; flag budget ×2.5 truncated, forced plain+flag entries, then special multipliers |
| Enemy selection | ZombieDefinition; Challenge eligibility table | Weighted cost-constrained selection; forced introduced enemy in midpoint/final; missing eligible types forced into final. Pole vaulters excluded from 1-8 |
| Spawning | Board::SpawnZombieWave, 5025 | All entries spawn in the same simulation tick. Random starting X creates visible staggering |
| Initial countdown | Board::InitZombieWaves; Challenge::ChallengeStart | 18 s ordinary; 50 s 1-2; 2 s bowling and 1-10. Tutorial overrides omitted, see below |
| Next countdown | Board::UpdateZombieSpawning, 5470–5515 | 25.00–30.99 s ordinary; 45 s before flag except bowling. No extra two seconds after timeout |
| Damage acceleration | Same | After >400 elapsed ticks, remaining health ≤ sampled 50–65% threshold caps remaining countdown to 200 ticks. Before flags threshold is zero |
| Warning | Same | At countdown 5, freeze countdown for 750 ticks, then spawn. Example no-damage pre-flag interval: 52.45 s |
| Health | Zombie::ZombieInitialize | Normal/flag/cone/bucket body 270, pole 500; cone armor 370, bucket 1100. Body below 1/3 becomes unable to bite; bleed uses original per-tick chance |
| Motion | Zombie::PickRandomSpeed / UpdateAnimSpeed / UpdateZombieWalking; Reanimator::GetTrackVelocity | Normal .23–.37 parameter, flag .45, pole running .66–.68; original walk/walk2/run/post-vault ground displacement curves, scaled to lawn width |
| Spawn X | Zombie::ZombieInitialize | Normal source base 780+Rand(40), +40 on flag waves; flag 800; pole 870+Rand(10), mapped using body center offset 57 |
| Projectile | Projectile.cpp pea velocity | 3.33 source px/tick → 532.8 canvas px/s |
| Chill / bite | Zombie::ApplyChill / eating update | Chill 10 seconds; walk gait ×.5; bite 4 HP/40 ms, chilled 4 HP/80 ms |
| Shooting | Plant::UpdateShooter | 150−Rand(15) tick counter, continually cycling even without targets; repeater second trigger at countdown 25. Shot release animation offset omitted |
| Sunflower | Plant::Initialize / UpdateProductionPlant | First 3–12.5 s, then 23.5–25 s, before omitted release animation |
| Sky sun | Board::UpdateSunSpawning | Initial 425+Rand(275) ticks, subsequent min(950,425+fallen×10)+Rand(275) |
| Mine | Plant::UpdatePotato | 15 s arming counter; rise animation delay omitted |

`ground-tracks.json` contains extracted `_ground` displacement arrays for Zombie anim_walk / anim_walk2, Zombie_polevaulter anim_run / anim_walk, and Zombie_paper anim_walk / anim_walk_nopaper. No executable source is vendored. These curves determine speed despite static art. Horizontal scale is 128/80; source X=40 maps to canvas X=64. Normal walking is about 17.7–28.4 canvas px/s across the sampled parameter range; flag about 34.6. Source pixels and canvas pixels must not be compared directly.

Counts are stochastic: original levels define budgets and weighted rules, not one universal enemy count. Our same seed produces a repeatable plan, but it cannot match an arbitrary original run enemy-for-enemy. Level 1-2 is deterministic because it only allows normals: counts 1,1,1,2,2,5, with the last containing 4 normals and 1 flag.

## Remaining approximations / limits

- Level 1-1 and 1-2 skip scripted tutorial gates and their countdown resets (99 / 999 ticks). The source initialization countdowns are retained. This deliberately differs from first-time tutorial pacing.
- Lane selection still avoids the last two lanes rather than reproducing the original weighted lane picker. Wave composition has a separate random stream from placements/countdowns; seed 12345 is portable, not an original save seed.
- Artwork is a flattened pose, not the original moving skeleton. Anchor/body overlays expose the distinction. Headless damage behavior has no matching headless art yet; the flag uses a simple flag marker.
- Collision body dimensions and spawn mapping are improved, but plant attack-range checks, pole vault trajectory/landing, mower collision, and projectile overlap are still approximations. Post-vault speed resets omit difficulty scaling.
- Shot release, mine rise, sunflower release, and eating animation phase offsets are omitted; physics collisions run on Phaser's frame clock. Very slow frames can still affect combat despite independent wave/motion clocks. Visible time is simulation time, not guaranteed wall time under throttling.
- Bowling / 1-10 use corrected wave budgets, but conveyor supply, explosive nuts, bounce damage, and inventory weighting are not audited implementations. Their overall difficulty is **not** yet original-equivalent.
- Full win conditions, plant targeting, sun travel/despawn and Chomper digestion need further comparison. Do not describe these levels as exact replicas.

## Inspect and reproduce

Open **Diagnostics** during a level: yellow cell boundaries, red zombie collision bodies and anchors, cyan plant image bounds. The panel lists plan, actual spawn ticks, warning ticks, health acceleration, current coordinates/HP/mean speed. **Download trace** exports that snapshot and source pins as JSON. Restart repeats wave generation/spawn stream; sun and plant random timers currently use unseeded random values and are not replayable from the trace.

Run `bun test` for manually calculated early counts, source flag positions, eligibility/forced introductions, exact countdown scenarios, simultaneous spawning, frame-size invariance, and motion-scale checks. `bun run audit` writes `docs/games/garden-guard/audit/reference-report.json`, a repeatable simulation with all fourteen wave plans, no-damage spawn times and immediately-defeated-wave spawn times. This validates our transcription, not the original executable. Browser inspection verifies the diagnostics render and pause holds the simulation.

Visual revision: the board is now 1280×960 with uniform 1.6× source scaling. UI and sprite dimensions are documented in [asset provenance](../assets.md). The saved diagnostics.png predates this visual revision.


## Night expansion and visual corrections (2-1 through 2-4)

The next four original Adventure levels use the same pinned PC reconstruction:

| Rule | Evidence | Implemented value |
|---|---|---|
| Eligible enemies | Challenge.cpp `gZombieWaves` rows 11–14 | 2-1 basic/newspaper; 2-2 basic/cone/bucket/newspaper; 2-3 basic/cone/door; 2-4 basic/cone/pole/door |
| Waves / starting sun | Board::InitZombieWaves; InitBoard | 10/20/10/20 waves, 50 sun, five lanes, no sky sun |
| New seeds | Plant.cpp seed definitions | Puff 0, Sun-shroom 25, Fume 75, Grave Buster 75; all recharge 750 ticks |
| Sun-shroom | Plant::UpdateSunShroom; Coin.cpp small sun | 12000 ticks to grow; first production 300–1250 ticks, later 2350–2500; 15 sun small, 25 mature |
| Short-range spores | Plant::GetPlantAttackRect; Projectile::CheckForCollision | Targeting right edge 250 source pixels from plant center; projectile expires at age 75 ticks |
| Fumes | Plant::Fire / GetPlantAttackRect | 20 piercing lane damage, right edge 360 source pixels from center; carried shields bypassed, helmets retained |
| Graves | Board::InitBoard | 2-1..2-3: columns 6/7/8 have 1/1/2; 2-4: columns 5/6/7/8 have 1/1/2/3 (zero-based) |
| Final rise | Board::SpawnZombieWave / SpawnZombiesFromGraves | 200 ticks after final wave, one eligible normal/cone per remaining grave; pending rise prevents early completion |
| Grave emergence | Zombie::RiseFromGrave | 150-tick immobile emergence; visual fade replaces original clipping animation |
| Shields | Zombie::ZombieInitialize / DropShield; Board::TotalZombiesHealthInWave | Newspaper body 270 + shield 150; door body 270 + shield 1100. Shields contribute 20% to wave health thresholds |
| Newspaper rage | Zombie::PickRandomSpeed / UpdateZombieNewspaper | Gasp delay 13 frames at 8 fps, then .89–.91 speed parameter with original no-paper ground curve |
| Pea silhouette | Original ProjectilePea.png / SnowPea.png | Native 28×28 canvas preserves padding; exported 90×90 and displayed 45×45 at 1.6 board scale (rounding <0.5%). Visible ordinary pea ~38.6 px |

Plants now share a feet baseline regardless of canvas height. Peas launch from measured muzzle coordinates on the flattened pose, including the planting/recoil transform; diagnostic circles show projectile collision bounds. Sun-shroom small/large poses preserve relative size and feet alignment. Original night background and mushroom/newspaper/screen-door artwork are flattened from the same pinned asset source.

Limits: seed slots remain eight as an accessibility/convenience choice, rather than reproducing purchased slot progression. Grave placement uses a portable seeded sampler, not the original random sequence. Grave Buster combines an approximate one-second landing with the verified four-second eating counter; chewing/growth/fume visuals are simplified. Fume target overlap uses body anchors rather than the original full Rect intersection. Fume firing uses the source cadence with simplified shot release. None of the four night levels has yet received a complete comparative GamePix playthrough. Rule transcription and completion simulations do not prove identical player difficulty.

### Continuing difficulty review

For every level or combat change, run the Garden Guard tests, art checks, audit and build. Preserve the existing day fixtures. Inspect baseline economy, eligible enemy sets, midpoint introductions, flags, shields and weighted health. Keep `reference-report.json` alongside changes: it includes reproducible wave plans, no-damage/immediate-damage countdown traces and night grave/economy metadata. Treat those traces as bounds; actual player behavior changes wave timing.

The original campaign has 50 Adventure levels, so 36 remain after this expansion. PvZ 2's desert world is Ancient Egypt ([EA features](https://www.ea.com/games/plants-vs-zombies/plants-vs-zombies-2/features?isLocalized=true)). It needs a separate ruleset/level dataset for mummies, Plant Food and PvZ 2 economy; do not label original-game night levels as that world or mix their balance tables. A future PvZ 2 mode should live in its own module within this game, sharing only deliberately compatible presentation.


## Whack-a-Zombie and football expansion (2-5 / 2-6)

Pinned references remain unchanged. `Board::PickZombieWaves` overrides Adventure Whack-a-Zombie to **8** waves, even though the generic Adventure table says 10; the standalone challenge uses 12. `Challenge::StartLevel` starts its countdown at 200 ticks. `Challenge::WhackAZombieSpawning` then uses 2000-tick waves, a 300-tick quiet window, grave replenishment at countdown 100, warning at 5, and a final spawn 300 counter steps after the last wave begins (the setting tick also decrements it). It does **not** use normal wave health acceleration or the 750-tick flag freeze. `whack-director.ts` keeps that mode separate.

Whack begins with 9 graves in columns 3–8 and zero sun. Before each following wave, it adds max(1, 5 − grave count), subject to available cells. Volleys use the source phase-dependent double/triple and cone/bucket probabilities. Final volley attempts 20 armored zombies, limited to distinct available graves; without clearing graves this implementation has 16 by the Adventure finale. Its three emergency seeds are Potato Mine, Grave Buster and Cherry Bomb (`Board::InitSeedBank`). `Challenge::MouseDownWhackAZombie` applies 900 helmet damage with no body overflow; an unhelmeted hit kills. Baseline therefore needs one/two/three taps for normal/cone/bucket. `Board::DropLootPiece` supplies occasional groups of three 25-sun pickups using the resource-dependent loot band and zombie drop factors. All deaths in whack, including blast and mower kills, run that sun-drop check.

Level 2-6 uses 10 waves, 50 sun, no sky sun, and seven graves with the 2-4 column distribution. The allowed table is basic/cone/football. Football is forced at the midpoint and finale, costs 7 wave points, has weight 2000 and normally cannot be picked before wave 5. Body health is 270 and helmet health 1400; parameter .66–.68 and the extracted `Zombie_football` walk ground track drive movement. The body collision width is 57 source pixels.

Whack awards Hypno-shroom; 2-6 makes it available and awards Scaredy-shroom. Hypno costs 75, recharges in 3000 ticks and converts the first zombie that bites it, retaining remaining durability. The converted zombie walks right at parameter .17 and fights hostiles in its lane. Shooters, fumes, blasts, mines, chompers, mowers, loss detection and wave health/counts exclude allies. The diagnostic list labels each enemy/ally. Scaredy-shroom's original art, collection entry and behavior are prepared for the next level expansion; it is not in 2-6's pre-reward seed pool.

Limits: whack taps currently use the visible sprite bounds instead of the source's 45px circle against the zombie rectangle. Grave replenishment chooses an unoccupied cell first; its positions and loot random stream do not reproduce the original PRNG. Emergence and hammer effects are simplified. Hypnotized zombie duels use a 75-board-pixel contact window instead of the original rectangle-intersection rules; bite-animation release offsets are omitted. Source rule tests and browser interaction checks are not a full comparative playthrough or proof of identical difficulty.

### Seed-packet lettering

The original `SeedPacket_Larger.png` embeds tiny decorative branding. Enlarging that raster text cannot recover detail. The bank now covers it with a clean label area and renders plant names as 14px bold text at 2× text resolution; prices are also rendered at 2×. Original packet frames and illustrations remain. Icons fit below the name rather than overlapping it. Functional text should continue to be rendered, not flattened into low-resolution imagery.


## Late night expansion: 2-7 and 2-8

The same pinned source provides these next first-Adventure boards. 2-7 uses 20 waves, basic/cone/screen-door/football eligibility, 50 starting sun and eleven graves (zero-based columns 4/5/6/7/8 have 1/2/2/3/3). 2-8 uses 10 waves with basic/cone/dancer eligibility and the same economy/graves. Both have no sky sun. `Challenge.cpp` contains the wave and eligibility tables; `Board::InitBoard` contains the grave distribution. Ice-shroom is the 2-7 reward, Doom-shroom the 2-8 reward.

### Scaredy-shroom and Ice-shroom

Scaredy-shroom is now playable in 2-7. Its price is 25 and recharge 750 ticks. `Plant::UpdateScaredyShroom` checks zombie rectangles against a radius-120 source-pixel circle centered at plant top-left X, Y+20, considering the same and neighboring rows. The implementation uses the existing collision bodies at uniform 1.6 scale, a 25-tick initial shooting counter, long-range spores and a saved hidden pose. Lowering/raising animations are replaced by immediate pose changes; hiding pauses its shot counter. These animation/counter details still differ from the full original state machine.

`Plant::UpdateIceShroom` sets a 100-tick fuse; definitions set price 75 and recharge 5000 ticks. `Zombie::HitIceTrap` applies a 2000-tick chill, then freezes eligible non-pool zombies for inclusive 400–600 ticks, or 300–400 if already chilled/frozen, and deals 20 damage. Emerging zombies and hypnosis allies are excluded; vaulting zombies receive chill but cannot be frozen. All currently implemented enemies use the land rules. The original front/back ice-trap textures visibly surround frozen feet under Canvas; WebGL-only tint is insufficient. Freeze timers and remaining chill are serialized. An ALLY label also makes hypnosis visible with Canvas.

### Dancing Zombies

`Zombie.cpp` defines a 500-HP leader, 270-HP backups, point cost 5, weight 1000, first eligible wave 5 and first level 18. A leader is forced at the midpoint and finale under the existing picker. Backups cost no additional wave points and are created only by leaders, never selected as independent wave entries. Each retains the leader's wave index, so its health contributes to that wave's remaining health.

`Zombie::SummonBackupDancers` places backups one row above/below and 100 source pixels left/right (160 board pixels); edge rows have three positions. Missing slots are replenished. The source entry lasts 300+Rand(12) ticks, a point clip has 10 frames at 24fps (42 ticks), and the subsequent hold lasts 200 ticks. Missing-backup checks use a 100-tick countdown, then wait for frame 12 and source X<700. The global dance cycle is 23 frames ×20 ticks: movement during frames 0–11, stationary arm poses afterward. Group walking stops when a member freezes or chews, and chill slows group walking. Backup emergence lasts 150 ticks.

The leader's original `Zombie_disco` walk and moonwalk ground arrays and the backup walk array are exported alongside existing gaits. Moonwalk displacement is sign-normalized for our left-moving coordinates. Both use static original poses. Hypnosis detaches existing followers, and subsequent summons inherit the leader's allegiance. Backups can continue independently after losing their leader. Ordinary projectiles, fumes and chomping ignore emerging/vaulting or headless targets; area bombs retain off-ground damage. `Plant::GetDamageRangeFlags` and `Zombie::EffectedByDamage` support that distinction. The no-off-ground projectile case is exercised with real physics bodies.

Remaining differences include modern rendering-frame release offsets around the 100Hz counters, simplified group/eating synchronization, hitbox/target selection approximations and instantaneous pose changes. This is source-backed behavior, not a claim of exact original executable replay or complete comparative difficulty testing.

### Save compatibility and verification

The existing shared store/autosave integration remains in use. Keys and the `garden-day-night-r1` marker remain unchanged: frozen time, dance state, optional hiding pose, leader indices/slots and crater state are additive with safe defaults for previous sessions. Leader links validate against live array indices and same allegiance. Older battle states remain readable; no campaign progress/settings are reset. A paused restore now also guards the scene update that can otherwise run once in the frame it is created. A render-only frame refreshes a newly restored paused board without advancing physics or timers.

59 unit tests and **30 real Phaser continuation checks** pass. The browser checks compare every continued frame against a restored run across all eighteen levels, linked and frozen dancers, pending summons, replacement backups, an Ice-shroom mid-fuse, crater expiry, rising-target collision, friendly bomb/mower exclusions and the previous busy combat scenarios. Separate manual checks covered placement, fear poses, Ice damage/chill, the first four backups and a paused refresh. Local diagnostics expose repeatable scenarios, excluded from production builds. Audit traces now include these wave plans and the pure dancer counter schedule; spawned followers and real player choices affect actual pressure.

Doom-shroom's reward art and prepared fuse/blast/crater code are present for the next levels. Its 100-tick fuse, 1800 damage, 250-source-pixel radius and 18000-tick crater derive from `Plant::UpdateDoomShroom` / `DoSpecial`; crater snapshots and expiry are checked. It is not selectable before its 2-8 reward. Full 2-9 play and Doom targeting/balance verification are next.

## Night world completion: 2-9 and 2-10

Evidence is the same pinned local reconstruction (HEAD checked as `325b2229a7225d73870bb69322eefcda3a45bf8d`): `Challenge.cpp` lines 33–38 / allowed-level table; `Board::PickZombieWaves`; `Board::InitBoard` grave branches; `Challenge::StartLevel` miniboss override; `Challenge::UpdateConveyorBelt`; `Plant::UpdateDoomShroom` / `DoSpecial`; `Board::KillAllZombiesInRadius`; `Zombie::ApplyBurn`.

- Both levels have 20 waves and flags at waves 10 and 20. 2-9 allows basic/cone/screen-door/dancer; 2-10 adds football. Backup dancers remain summon-only. Standard 2-9 starts at 18 seconds; the `Challenge::StartLevel` miniboss override starts 2-10 at 100 ticks (one second). The existing day finale retains its earlier two-second approximation.
- 2-9 has eleven graves (columns 4–8: 1/2/2/3/3). 2-10 has thirteen (columns 3–8: 1/2/2/2/3/3). Neither has sky sun. Final remaining graves still rise after two seconds and block premature victory.
- 2-10 multiplies remaining wave budget by three after forced normal/flag entries. Source seed weights are Grave Buster 20, Ice 15, Doom 15, Hypno 10, Scaredy 15, Fume 15, Puff 10. First supply is at two seconds; subsequent delays depend on current stock: 4 seconds up to four, 4.25 seconds above four, 5 seconds above six, 10 seconds above eight. At three/four packets of a type, weights become 5/1; consecutive picks halve the base weight (integer division). Grave Buster weight is zero when stored plus planted busters already cover remaining graves.
- Doom-shroom's source fuse is 100 ticks, recharge 5000 ticks and price 125. Its radius is 250 source pixels (400 board pixels), tested against full zombie rectangles with a three-row cap. Hostile current land enemies burn regardless of armor/doors; emerging and vaulting targets are eligible. Hypnosis allies are spared. Its own square becomes unusable for 18000 ticks; neighboring plants and graves remain intact. Craters and the mid-fuse state were already additive in the r1 schema.

At seed 12345, 2-9 schedules 57 wave entries, including 7/11 on its flag waves; 2-10 schedules 107, including 12/16 on flags. These exclude summoned dancers and final grave rises. The audit's 50%-threshold sampler gives final-spawn timing bounds of 147.09–598.90 seconds for 2-9 and 130.09–581.90 for 2-10 (immediate wave-health defeat versus no damage). Actual combat, enemy placement and sampled thresholds change these timings; they are diagnostics, not retail playthrough measurements.

74 unit tests and 50 real Phaser checks cover the new wave data, grave columns, budget arithmetic, conveyor weights/timing, earlier saves, Doom target boundaries, armored/emerging/ally blast behavior, crater expiry and next-supply continuation at 1×/2×. Manual 1024×768 checks include Grave Buster consumption and grave removal, supplied mushroom placement, Doom detonation, and rejection of planting in its crater without consuming stock.

Remaining differences: packets use the existing fixed bank with per-type quantities capped at five, not a physically moving ten-packet conveyor. The original 2-9 story note and 2-10 Lily Pad reward are omitted until pool support exists. Portable RNG, simplified animation offsets and the existing collision approximations remain. No complete original-versus-prototype playthrough of these new levels has been measured, so source-backed rules do not establish identical overall difficulty.


## First pool levels: 3-1 and 3-2

Evidence: the pinned local reconstruction `325b2229a7225d73870bb69322eefcda3a45bf8d`, especially `Challenge.cpp` wave/allowed-zombie tables, `Board::RowCanHaveZombieType`, `ZombieTypeCanGoInPool`, `SpawnZombiesFromPool`, `PickGraveRisingZombieType`, `GridToPixelY`, `Zombie::RiseFromGrave`, `ApplyIceTrap`, and the Lily Pad/Squash plant definitions and update routines.

- 3-1 has 10 waves; 3-2 has 20 with flags at 10/20. Both start with 50 sun and daytime sky sun. 3-1 uses basic/cone zombies; 3-2 adds bucket, newspaper and football. The latter two stay on land. Ordinary eligible zombies receive duck tubes in water; the duck type is not an extra independently weighted spawn.
- Six lanes use the original 85-source-pixel stride (136 board pixels); the middle two require Lily Pads. Water zombies are prohibited in the first five waves. The final wave adds two weighted basic/cone/bucket swimmers in distinct cells across columns 5–8, after a two-second delay. Their emergence takes 50 source ticks (500ms), versus 150 ticks for graves. Pending rises prevent an early win.
- Lily Pad costs 25 sun, recharges in 7.5 seconds and has 300 HP. Its top plant is eaten/shoveled first; removing the pad removes its occupant. Potato Mines cannot be placed on pads. Squash costs 50, recharges in 30 seconds and deals 1800 damage once: 800ms look, 450ms preparation, 500ms rise, 100ms fall, damage halfway through the fall. Land Squash lingers flattened for a second; water Squash disappears on landing and leaves its pad.
- Swimming bodies use a shorter submerged hitbox and water freeze lasts three seconds. First-Adventure water mowers sink near the edge rather than cleaning a whole water row. Shop upgrades are not implemented. Mushrooms sleep on both day and pool lawns.

At seed 12345 the portable picker schedules 21 normal wave entries in 3-1 (8 in its flag wave) and 63 in 3-2 (7/12 at flags), plus two final pool rises in each. The audit's immediate-damage/no-damage final regular-spawn timing bounds are 79.54–294.45 seconds and 147.09–598.90 seconds respectively. These are diagnostic bounds, not observed retail playthrough durations. Wave counts, budgets, eligibility and health-driven pacing follow the source; portable RNG/lane choices and collision/animation approximations mean identical human difficulty has not been established.

Verification: 80 unit tests, 65 real Phaser browser checks and 18 projectile stress/endurance cases pass. Checks include all 22 levels' continuation, earlier saves, layered support validation/restoration, a Squash mid-jump, 1×/2× parity, water gating, sinking mowers and final rises. Manual browser checks restored a real 3-1 local save with a Sunflower and Peashooter on a Lily Pad, and verified shoveling the top plant leaves the pad. A busy pool endurance case rendered 2219 projectiles with zero missing or unseen peas.

Save keys, version 1 and `garden-day-night-r1` remain unchanged. Pool validation is additive and checks the selected level's lane count, supports and swim state. Existing day/night snapshots keep five lanes. Remaining presentation approximations include static clipped swimmer poses, simplified entry/target prediction and eight seed slots; storyline and shop progression remain omitted. The 2-10 Lily Pad reward is now available.


## Pool expansion: 3-3 and 3-4

Evidence remains the pinned PC reconstruction `325b2229a7225d73870bb69322eefcda3a45bf8d`. `Challenge.cpp` gives 20/30 waves and complete allowed-enemy sets. `ZombieDefinition` gives Snorkel cost 3, starting level 23, first eligible wave 10 and weight 2000. `Board::SpawnZombiesFromPool` increases the final ambush to three enemies on levels 23/24. The new repeatable `check-pool-reference.ts SOURCE_CHECKOUT` compares all four pool levels' counts and allowed types, the snorkel picker definition, and plant economy directly against those tables. Its output is saved in `pool-source-comparison.json`; no original source is copied here.

3-3 allows basic, cone and snorkel zombies. 3-4 adds pole vaulter, bucket and newspaper; these added land enemies cannot enter water. Both start with 50 sun and normal daytime sky sun. Flags occur at 10/20 and 10/20/30. The existing health-driven director and weighted budgets remain unchanged. At seed 12345, the portable picker schedules 63 regular enemies in 3-3 (9/12 at flags), and 107 in 3-4 (7/11/16), plus three final pool rises each. The audit's immediate-damage/no-damage final regular-spawn bounds are 147.09–598.90 seconds and 214.64–903.35 seconds. These diagnostic bounds are not retail playthrough measurements.

Snorkels use 270 body HP, a water-only lane picker, fast land ground-track movement (parameter 0.66–0.68), a 19-frame entry clip at 16fps (rounded to 1190ms), and direct underwater movement rather than a walking ground track. `UpdateZombieSnorkel` sets 0.2 source pixels per tick at entry; `PickRandomSpeed` sets 0.3 after diving back down. The 12-frame, 24fps surfacing clip takes 500ms. Peas ignore submerged/dive/entry states, hit surfacing/eating states, and do not stop before an eligible target. Eating waits until surfacing completes. Squash and kelp may target submerged enemies, matching their separate damage flags. Frozen water enemies retain the previous three-second freeze rule. Pool exit repicks land speed and shifts position by 15 source pixels.

Threepeater becomes available in 3-3, costs 325 and recharges in 7500ms (correcting the inherited unused 8000ms value). One target in any of its three valid rows starts all valid heads, including the empty neighboring lanes; edge rows clip safely. Its 350ms release timer is saved. Tangle Kelp becomes available in 3-4, costs 25, recharges in 30000ms, and requires empty water without a Lily Pad (`Board::CanPlantAt`). `UpdateTanglekelp` reserves one nearby swimmer, begins dragging halfway through a 100-tick grab, and consumes prey and plant at the end. Our held-prey link prevents duplicate targeting and is reconstructed before resumed gameplay. Jalapeno is the 3-4 reward, with original art, cost 125 and recharge 50000ms; its one-second lane burn can be tried in Playground while 3-5 remains unbuilt.

All earlier r1 saves remain supported. New snorkel snapshots contain transition counters; kelp stores a validated target array index and remaining time. Missing targets stay missing, rather than selecting different prey on reload. The real-entity browser suite covers all 24 levels, each snorkel phase, actual submerged/exposed projectile overlaps, a kelp grab across reload, Threepeater release and edge lanes, three final ambushers, Jalapeno lane burn, and 1×/2× continuation. Manual UI testing restored a real 3-4 board containing kelp and a Lily Pad with the same wave/sun totals. Seed selection now uses seven columns to avoid overlapping the loadout when the new plants create a fourth row in the previous layout; the Almanac fits all 21 entries.

Remaining approximations: static original poses replace skeletal entry/rise/dive animations; body-to-grid eating and blast rectangles retain the existing mappings. Threepeater side shots appear directly in their target lane instead of following the original decaying vertical curve. The entry clip is rounded to 100Hz; our flame effect is a simple fading lane highlight. Portable RNG, the eight-slot bank, omitted shop/tutorial/story behavior, and the earlier documented exceptions remain. This is source-backed balance work, not evidence of identical human difficulty or a complete side-by-side original playthrough.

Final verification: 84 unit tests, 84 real-entity browser checks and 20 projectile stress/endurance scenarios pass. Crowded Threepeater cases rendered 401 peas at each speed without missing/unseen shots. The new source comparison passes. Physical iPad performance and full original-versus-prototype playthrough outcomes still need device/user testing.
