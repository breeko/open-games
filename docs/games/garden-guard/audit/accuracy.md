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
| Wave count | Board::InitZombieWaves | 4,6,8,10,8,10,20,10,20,20 |
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

`ground-tracks.json` contains only extracted `_ground` displacement arrays for Zombie anim_walk / anim_walk2 and Zombie_polevaulter anim_run / anim_walk. No executable source is vendored. These curves determine speed despite static art. Horizontal scale is 128/80; source X=40 maps to canvas X=64. Normal walking is about 17.7–28.4 canvas px/s across the sampled parameter range; flag about 34.6. Source pixels and canvas pixels must not be compared directly.

Counts are stochastic: original levels define budgets and weighted rules, not one universal enemy count. Our same seed produces a repeatable plan, but it cannot match an arbitrary original run enemy-for-enemy. Level 1-2 is deterministic because it only allows normals: counts 1,1,1,2,2,5, with the last containing 4 normals and 1 flag.

## Remaining approximations / limits

- Level 1-1 and 1-2 skip scripted tutorial gates and their countdown resets (99 / 999 ticks). The source initialization countdowns are retained. This deliberately differs from first-time tutorial pacing.
- Lane selection still avoids the last two lanes rather than reproducing the original weighted lane picker. Wave composition has a separate random stream from placements/countdowns; seed 12345 is portable, not an original save seed.
- Artwork is a flattened pose, not the original moving skeleton. Anchor/body overlays expose the distinction. Headless damage behavior has no matching headless art yet; the flag uses a simple flag marker.
- Collision body dimensions and spawn mapping are improved, but plant attack-range checks, pole vault trajectory/landing, mower collision, and projectile overlap are still approximations. Post-vault speed resets omit difficulty scaling.
- Shot release, mine rise, sunflower release, and eating animation phase offsets are omitted; physics collisions run on Phaser's frame clock. Very slow frames can still affect combat despite independent wave/motion clocks. Visible time is simulation time, not guaranteed wall time under throttling.
- Bowling / 1-10 use corrected wave budgets, but conveyor supply, explosive nuts, bounce damage, and inventory weighting are not audited implementations. Their overall difficulty is **not** yet original-equivalent.
- Full win conditions, plant targeting, sun travel/despawn and Chomper digestion need further comparison. Do not describe all ten levels as exact replicas.

## Inspect and reproduce

Open **Diagnostics** during a level: yellow cell boundaries, red zombie collision bodies and anchors, cyan plant image bounds. The panel lists plan, actual spawn ticks, warning ticks, health acceleration, current coordinates/HP/mean speed. **Download trace** exports that snapshot and source pins as JSON. Restart repeats wave generation/spawn stream; sun and plant random timers currently use unseeded random values and are not replayable from the trace.

Run `bun test` for manually calculated early counts, source flag positions, eligibility/forced introductions, exact countdown scenarios, simultaneous spawning, frame-size invariance, and motion-scale checks. `bun run audit` writes `docs/games/garden-guard/audit/reference-report.json`, a repeatable simulation with all ten wave plans, no-damage spawn times and immediately-defeated-wave spawn times. This validates our transcription, not the original executable. Browser inspection verifies the diagnostics render and pause holds the simulation.

Visual revision: the board is now 1280×960 with uniform 1.6× source scaling. UI and sprite dimensions are documented in [asset provenance](../assets.md). The saved diagnostics.png predates this visual revision.
