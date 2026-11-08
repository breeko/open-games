# Kingdom Rush reference prototype

- Work only in this game's folders, plus the minimum catalog/build registration.
- Another agent owns Garden Guard. Never edit or import its code, art, saves or tests.
- Current authorized campaign scope: Southport, The Farmlands, Pagras, Twin Rivers Pass, Silveroak Forest and The Citadel (stages 1–6), explicitly authorized by Branko.
- Keep map geometry/waves/assets separate from shared Kingdom Rush combat rules.
- Preserve Pagras save/result keys and use separate stores for other maps.
- Geometry comes from the pinned older reference. Campaign wave timing and verified
  gameplay corrections target Armor Games Flash v1.13; see reference/flash-pagras.json and reference/flash-opening-paths.json
  and docs/games/kingdom-rush/original-comparison.md. Newer Dove export is
  visual data only: do not import its cash, combat buffs, upgrades or AI.
- Keep simulation independent of DOM/rendering, seeded, at 30 source ticks/second.
- Record known approximations; do not claim exact retail fidelity without comparison.
- Opening-map calibration evidence and outstanding parity limits: docs/games/kingdom-rush/opening-calibration.md.
- Keep original Ironhide artwork provenance separate from authored implementation.
- No publishing or deployment is part of the prototype task.
