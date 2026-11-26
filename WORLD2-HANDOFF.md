# /world 2.0 — handoff

The short version for a new session. The full plan, the decisions and the phase-by-phase log are in
`WORLD2.md` (§11 decisions, §12 log). The v1 spec, content rules and honesty grammar are in `WORLD.md`.

## State (26 Nov 2026)

- **All five phases are built, verified and live in production** (stevensu-resume.vercel.app/world),
  shipped as `1b93f7d`, fast-forwarded to `main`. The new UI copy and the case study's updated wording
  are approved.
- **Commits** are authored as stevensu04 only, with no AI co-author. Deploys (pushes to `main`) only
  on Steven's explicit OK. Vercel previews of branches sit behind Vercel's login.
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
| `scene/Transit.tsx`, `scene/ride.ts` | The Metro buses, and riding them (below) |
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

## Riding the Metro (added 26 Nov 2026)

- **Flow:** in Explore, walk up to a bus standing at a shelter (within ~6.5 m of its front door) and press
  E (or tap the prompt) to board. Inside, first person is a real interior; V gives a chase view of the
  whole bus. E again at a stop gets off; between stops it pulls the cord and he steps off at the next.
  Switching to Global view or starting the tour sets him down at the nearest shelter.
- **Moving parts:** `Transit` owns the buses and the ride (its frame runs at priority −2 so the camera
  never lags the bus); `ride.ts` holds the shared ref and types; `CameraRig` flies in and out and turns
  the look with the bus; `Player` freezes while aboard; `RideBar` and the prompt button are the HUD.
  The interior is part of each car's geometry (the shell's back faces are culled from inside, so the
  windows are simply open). Steven's feet are at `BUS_FLOOR`, carried in `player.y`.
- **Rules:** buses hold their doors up to 10 s for someone walking up; a bus brakes for anyone within 2 m
  of its lane (as before), so the step-down point is 2.4 m from the lane. Under reduced motion the buses
  stand still, so no ride is offered. Riding past a zone doesn't count it as explored.
- **Check it:** `?debug` exposes `__world.ride`. Set `__world.position.current` beside a shelter, wait for
  the prompt, press E.

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

1. **Real devices:** Safari pointer lock and touch look, joystick feel, a mid-range Android GPU, the
   portrait home view, VoiceOver.
2. **The iCloud-synced Desktop** keeps creating `… 2.ts` copies in `.next/types/` (they break `tsc`;
   safe to delete) and `… 2.jpg` files in the repo.
3. **Optional:** sound (only with licensed audio and a mute toggle), night tuning (`LOOK.night`),
   pedestrians walking through Steven.
