# /world 2.0 — handoff

The short version for a new session. The full plan, the decisions and the phase-by-phase log are in
`WORLD2.md` (§11 decisions, §12 log). The v1 spec, content rules and honesty grammar are in `WORLD.md`.

## State (26 Nov 2026)

- **All five phases are built and verified** (development and production builds), and the new UI copy
  is approved.
- **Nothing is committed.** 31 files are modified and 12 are new under `src/app/world/` and
  `scripts/`. Commit and deploy only on Steven's explicit OK. Commits are authored as stevensu04 only,
  with no AI co-author.
- **Not yet tested on real devices:** Safari, iOS, Android. See "Open".

## What it is

- **The look:** a lit Cozy Miniature island: Brisbane on the main island, Taipei on an islet across the
  water.
- **Global view (the default):** orbit the whole island; click a building or label to open its
  location's panel.
- **Explore:** walk it in first person (V for third person).
- **Same everywhere:** both modes share one scene, one camera, one panel and one content source. The
  quick tour flies stop to stop (72 s) and draws the career-journey line. There's a day/night toggle.
  The text list and the poster-first loading are unchanged.

## Where things live (`src/app/world/`)

| File | Role |
| --- | --- |
| `Scene.tsx` | Orchestrator: mode, view, selection, tour, keyboard, HUD |
| `ui.tsx` | `LocationPanel`, `ModeSwitcher`, `ViewSwitcher`, `ExploreControls` (mouse, pointer lock, joystick, prompt), `TourBar`, `KeysHelp` |
| `scene/CameraRig.tsx` | The one camera: orbit in Global view, flights (aim, distance, pitch, azimuth, FOV), first and third person, fog, labels |
| `scene/locations.ts` | Zone → cards in route order, camera framing, label anchors (derived, not new content) |
| `scene/Lighting.tsx`, `scene/look.ts` | Sun, fill and sky lights, day/night blend, static shadows (`useStaticShadows`), palette |
| `scene/batch.ts` | Static batching: one mesh per material after mount, which is the main draw-call saver |
| `scene/Island.tsx` | The island, skirt, Taipei islet, water shader |
| `scene/Ground.tsx`, `scene/Vegetation.tsx` | Footpaths; seeded trees, bushes, flowers and rocks (trunks join the walk grid) |
| `scene/Proximity.tsx` | What Explore offers to open |
| `scene/JourneyLine.tsx`, `scene/Pedestrians.tsx` | The tour's trail; people on the paths |
| `scene/worldShader.ts`, `scene/shading.ts` | Shared shader patch (light-up, occlusion, sway, highlight, lamps, dimming); colours and the lamp flag |

## Decisions worth knowing

- **D1–D6** are all as recommended:
  - first person, with V for third;
  - lit, with static shadows;
  - perspective camera with orbit;
  - island and islet;
  - poster first;
  - location panel.
- **Shadows are baked once.** Anything that moves must be `userData.dynamic` (or sit outside Stage), or
  it freezes a shadow.
- **Lit doors and windows are "lamps":** paint `#f2d98a` / `#f2c14e` and they glow. The flag rides in
  `uv`.
- **React Compiler:** a prop written from a callback must end in `Ref` (`zoomRef`, `apiRef`…); mutate
  through `useFrame` state or refs, never through memoised values.
- **No new runtime packages.** Orbit controls come from `three/examples`. drei, physics and
  postprocessing stay out.

## How to check things

- **Measure:** `PLAYWRIGHT=<path to an installed playwright> node scripts/world-measure.mjs <origin> [query] [shotPrefix]`
  (script bytes, GLB bytes, draw calls and triangles per frame). Use `DSF=2` for 2× shots.
- **Development-only URL params:**
  - `?poster`: the frozen home view;
  - `?nav`: blocked walk cells in red;
  - `?at=x,z`: start somewhere else;
  - `?debug`: exposes the position, walk grid, pathfinder and look controls to scripts.
- **Re-render the poster** after any visual change:
  1. Open `/world?poster`, press *Enter the world*, and screenshot the scene element at 1280 × 800, 2×.
  2. Save it as WebP (quality 80) over `poster.webp` and `public/projects/World.webp`.
  3. Re-cut `og-background.jpg`: 1200 wide, centre 630.

## Budgets now (production)

- **Shipped JS:** `/` 192.3 kB and the other routes are unchanged. `/world` loads only the poster until
  a button is pressed.
- **Scene chunk:** 322.9 kB (budget 350).
- **Draw calls:** 82 in the default view.
- **Triangles:** 61.3k.
- **GLBs:** 403 kB over the wire.
- **Frame rate:** 60 fps with the CPU throttled 4×.

## Open

1. **Commit and deploy**, on approval.
2. **Real devices:** Safari pointer lock and touch look, joystick feel, a mid-range Android GPU, the
   portrait home view, VoiceOver.
3. **The case study (`content/projects/world.md`) is out of date.** Proposed wording is in `WORLD2.md`
   §12, Phase 5. It's published copy, so it stays unedited until approved.
4. **`npm run lint`** walks old worktrees in `.claude/worktrees/`. Add `".claude/**"` to the ESLint
   ignores, with approval.
5. **The iCloud-synced Desktop** keeps creating `… 2.ts` copies in `.next/types/` (they break `tsc`;
   safe to delete) and `… 2.jpg` files in the repo.
6. **Optional:** sound (only with licensed audio and a mute toggle), night tuning (`LOOK.night`),
   pedestrians walking through Steven.
