# Asset provenance

Original Plants vs. Zombies artwork belongs to its respective owners, including EA/PopCap. These files are reference assets for the requested local prototype and are not asserted to be MIT licensed or cleared for redistribution.

Source: https://github.com/ruslan831/PlantsVsZombies-decompilation
Pinned commit: `325b2229a7225d73870bb69322eefcda3a45bf8d`.

The `public/games/garden-guard/assets/reference` PNG poses are flattened from selected tracks in `SexyAppFramework/DebugVS2005/reanim/{PeaShooter,SunFlower,Wallnut,CherryBomb,SnowPea,PotatoMine,Chomper,Zombie,Zombie_polevaulter,Sun,LawnMower}.reanim` and their referenced PNG layers. The reproducible helper is `scripts/games/garden-guard/prepare-reference-sprites.py` (requires Pillow and a source checkout). Static poses intentionally avoid recreating the full animation system. Peashooter, Snow Pea and Repeater combine the stem/leaf section at frame 11 with head tracks at frame 35; extracting frame 35 alone hides their bodies. Zombie armor states share a fixed bounding box.

Lawn images derive from `images/background1.jpg` and `background1unsodded.jpg`, cropped and mapped to the prototype's board. Seed packet and bank images come from the same source's `images` directory. Artwork covers the ten daytime levels. Shared pose canvases keep armor-loss states aligned; packet icons fit within a standard icon area independent of world sprite size. The inherited Threepeater is reserved for future work and is not offered in this campaign.

EA's policy: https://help.ea.com/en/articles/security-and-rules/ea-content-policy/
Public asset rights remain unresolved. The user authorized publishing this prototype to the public breeko/open-games GitHub repository; the prototype is deployed at https://opengames-breeko.vercel.app in the personal breekos-projects scope. The original artwork is not covered by the inherited MIT code license.

## Alternative implementation review

- Reused: Tino1234567/plants-vs-zombies-game — MIT, TypeScript/Vite/Phaser, generated art and audio, no ad integrations found in imported source. Local changes fix container hit areas, provide touch-friendly shell controls, original-art reference mode, ten daytime scenarios, bowling/conveyor modes, pole vaulting, Chomper digestion, unrestricted level navigation, and difficulty options.
- plantsvszombiesjs/plantsvszombiesjs.github.io — inspected MIT license and source; a standalone 20-wave survival design rather than the requested Adventure progression.
- baojie/PVZ — inspected its current page/source; its custom free-plant/infinite-sun balance is a poor match for this brief.
- Plants-vs-Zombies-MODDED/game — discovered as another browser option, not selected or audited for reuse.

User comparison: https://www.gamepix.com/play/plants-vs-zombies . Page and nested loader opened in browser; the original title/start screen was observed. Browser coordinate handling prevented interacting with its nested game canvas, so live level pacing was not verified. It is a visual/reference comparison, not an imported dependency.

Latest visual checks: complete plant silhouettes are enforced by `scripts/games/garden-guard/verify-reference-sprites.py`. Suns display at 112×112 logical pixels with a centered 56-pixel touch radius. Sprites export at twice their display dimensions, with sizes recorded in src/games/garden-guard/reference/art-manifest.json; this retains compositing detail but does not invent additional native source detail. No marketing/storyline assets were added.


## November 7 visual correction

The game now uses a 1280×960 (4:3) view. The original background is cropped at native coordinates (220,0,1020,600), then scaled uniformly; the old (-70) top crop, nonuniform stretch, and second JPEG compression are removed. Lossless PNG lawns replace the prior JPEG exports. The source remains the pinned original artwork above.

Plants and zombies use separate intended display sizes. Zombie armor states share a union crop, scale and foot baseline. The wooden tray, sun compartment, stone button pieces, shovel bank and progress meter come from the same source images. Touch and pointer coordinates follow the canvas's actual fitted bounds even when header wrapping changes.

Inspected alternative: [nasiftanjim/PVZHD v2.1](https://github.com/nasiftanjim/PVZHD/releases/tag/v2.1). Downloaded its public archive only to examine image data; no executable was run, and no images from this mod were imported. Despite the HD label, examined key files have the same dimensions as the PC assets (PeaShooter_Head 70×65, Zombie_head 53×48, SeedBank 446×87, SeedPacket_Larger 100×140). Its background1 is 1666×600, a wider composition rather than a higher-density version of the original. The [macOS asset archive](https://github.com/FregD156/PvZ_Assets) was also inspected and does not expose separate 2× variants in its file tree. A verified complete higher-density original sprite set has not been located; current improvements come from proportions, lossless exports and avoiding downscale-then-enlarge rendering.

Browser verification of this revision: 1024×768 landscape and 768×1024 portrait both preserve 4:3 and fit within the available canvas area with no horizontal overflow. Verified expanded seed selection/planting, the eight-card bank, original-art shovel removal, in-canvas Menu/pause, and access to Diagnostics through More. Eighteen tests, sprite checks and production build pass. Screenshots: docs/games/garden-guard/audit/original-layout.png and full-inventory.png. Physical-device performance remains unverified.


Night expansion: `background2.png`, `grave.png`, mushrooms (including both Sun-shroom sizes), newspaper states, screen-door state, `puff.png` and `plant-shadow.png` come from the same pinned original-art reference. No generative replacement art is used. The sprite preparation script reproduces the exports; `prepare-motion-tracks.py` reproduces numerical gait curves. Pea/snow-pea exports now preserve the native 28×28 transparent canvas and render at 45×45 board pixels; they were previously only 22×22. Supersampling improves transformation quality but does not add detail beyond the original images.


The 2-5/2-6 expansion adds original Hypno-shroom and Scaredy-shroom poses plus aligned football helmet/bare states from the same pinned reference. The exported numerical motion tracks now include the football walk. Packet branding is covered at runtime by a clean text label; no original brand lettering is sharpened or synthetically enlarged.


Late-night additions use `IceShroom` and `DoomShroom` poses, the original red-jacket `Zombie_disco` leader, the bandanna `Zombie_backup`, original `icetrap`/`icetrap2` layers, and one frame from the two-frame crater sheet. Motion exports include the leader's walk and moonwalk and backup walk; the moonwalk curve is sign-normalized for leftward travel. The generation scripts reproduce those crops and curve transforms. Original-art ownership/attribution remains unchanged.
