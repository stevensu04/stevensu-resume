# /world 2.0 — Phase 0: audit and technical proposal

**What:** upgrade `/world` into a *Cozy Miniature World* with two modes, **Global view** (the overview a
recruiter reads in 30 seconds) and **Explore** (walk the same world in first person).
**Status of this doc:** all five phases built on 26 Nov 2026, committed as `1b93f7d` and **live in
production since 26 Nov 2026** (stevensu-resume.vercel.app/world). The short version for a new session
is `WORLD2-HANDOFF.md`. Written 26 Nov 2026 from a full read of `src/app/world/`,
`src/lib/world.ts`, `WORLD.md` and the installed packages. **Steven approved D1–D6 as recommended on
26 Nov 2026** (§11), and Phase 1 started the same day. Progress is logged in §12.
Read it alongside `WORLD.md` (the v1 spec and its build log) and `CONTENT.md` (content rules, unchanged).

---

## 0. Summary

**The main finding:** the ChatGPT plan assumes a 3D *career map* that needs a world built around it. That
isn't what's in the repo. `/world` v1 is already a finished, launched, walkable world: 11 content zones, 18
cards, a 12-stop tour, an animated avatar, pathfinding, collision, a list alternative, a WebGL fallback, a
slow-device watchdog, keyboard access and reduced motion. About half of the plan's P0 and P1 list already exists.

So 2.0 isn't a rebuild. It is three real pieces of work:

1. **The look.** Today's world is a flat beige rectangle, unlit, with sparse cone trees (see `poster.webp`).
   The Cozy Miniature references are a floating island, grass everywhere, dense round trees, warm light
   and soft shadows. This is the biggest gap and the most work.
2. **Global view.** A real overview camera with orbit, hover labels, click-to-focus and a side panel. Today's
   camera follows Steven and can only zoom out.
3. **Explore.** A first-person controller. The hard parts (collision grid, movement, the avatar) already
   exist and can be reused.

**Six decisions are yours before Phase 1 starts** (§11). Three of them reverse choices written into
`WORLD.md` §6: unlit materials, the orthographic camera, and "no free orbit".

---

## 1. What exists today

### Architecture

```
src/app/world/page.tsx         Server Component: metadata, joins project + world cards, fails the build on orphans
  └─ WorldShell.tsx            "use client": poster first, WebGL2 probe, dynamic(Scene, { ssr: false }), list
       ├─ Scene.tsx  (521 ln)  <Canvas orthographic>, all state, keyboard, wheel/pinch zoom, tour, HUD
       │    ├─ scene/Stage.tsx         slab, river, far bank, kit instances, 12 hand-made buildings, hit boxes
       │    ├─ scene/Player.tsx        kinematic controller + iso camera rig + occlusion uniforms
       │    ├─ scene/Avatar.tsx        steven.glb, Idle/Walk/Run cross-fade
       │    ├─ scene/Transit.tsx       two Metro buses on the ring road
       │    ├─ scene/nav.ts            0.5 m walk grid from real triangles, Dijkstra + string-pulling
       │    ├─ scene/worldShader.ts    one patch on every material: explore light-up, occlusion fade, tree sway
       │    └─ CardAnchor / FocusAnchor / PlayerAnchor   project 3D points onto DOM elements
       ├─ ui.tsx               WorldCardView (dialog), TourBar, Counter, OutLinks, KeysHelp, DPad
       └─ WorldList.tsx        the always-present ordered list (screen readers, no-WebGL, "read as a list")

Data (no three.js, server-safe):
  zones.ts       11 content zones + gallery + exit: footprints in metres
  objects.ts     18 hit areas (one per card) + TOUR order
  placements.ts  every kit model placement, prop solids, skyline, terminal
  src/lib/world.ts + content/projects/*.md `world:` blocks   all card copy (single source)
```

**Stack:** Next 16.2.4 (Turbopack, React Compiler on), React 19.2, three 0.187, @react-three/fiber 9.8.2.
No drei, no physics, no postprocessing. Assets: `kit.glb` (Kenney CC0, 291 KiB) and `steven.glb` (340 KiB).

### Feature inventory

| Feature | State | Where |
| --- | --- | --- |
| Poster first, 3D downloads only on click | ✅ | `WorldShell.tsx` |
| Quick tour, 12 stops, ~75 s, prev/pause/next/exit, reduced-motion stepper | ✅ | `Scene.tsx`, `TourBar` |
| Self-exploration: tap-to-move with pathfinding, WASD/arrows, Shift run, d-pad | ✅ | `Player.tsx`, `nav.ts` |
| Collision against real geometry | ✅ | `nav.ts` |
| Text/list alternative | ✅ | `WorldList.tsx` |
| Zoom (wheel, pinch, +/−), 90° rotation (Q/E), whole-block toggle | ✅ | `Scene.tsx`, `Player.tsx` |
| Hover (accent patch on the ground + name chip) | ✅ basic | `Stage.tsx` `ObjectHit` |
| Click → card opens and Steven walks there | ✅ | `openCard` |
| Explorer counter and zone light-up | ✅ | `worldShader.ts` |
| Occlusion fade when a building hides Steven | ✅ | `worldShader.ts` |
| Mini Steven character (the plan's P2) | ✅ already | `Avatar.tsx` |
| Easter egg (racquet) | ✅ | `Player.tsx` |
| Idle life: ferry, buses, Club Velvet queue, Olie, turbine, sway | ✅ | various |
| WebGL2 probe, FPS watchdog, pause off-screen, reduced motion | ✅ | `WorldShell`, `Scene` |
| Keyboard: Tab through objects, focus trap, Esc | ✅ | `Scene`, `ui.tsx` |
| Free orbit / overview camera | ❌ | ruled out by WORLD.md §6 |
| First-person view | ❌ | — |
| Lighting, shadows, terrain, dense vegetation | ❌ | unlit by design (§6) |
| Location-level info panel | ❌ | one card per object today |
| Persistent building labels | ❌ | — |

### Where the ChatGPT plan doesn't match the repo

- **The district table** in the screenshots (Taipei District, Gaming District…) isn't used. The plan's
  own §6 lists the real 11 zones. Those stay, with their ids, order and content.
- **Already done**, so these drop out of the phases: quick tour, list alternative, collision, the mini
  character, the WebGL fallback, reduced motion, loading state, the slow-device fallback.
- **"Day/night" and "real-time shadows"** contradict WORLD.md §6, which chose baked light and
  `MeshBasicMaterial`. The Cozy look needs real light, so this is decision D2.
- **"Drag to rotate"** contradicts §6 ("free orbit destroys the isometric look"). That was true for an
  orthographic follow camera. It isn't true for a narrow-FOV perspective overview. This is decision D3.
- **"Discovery mode" and easter eggs** are fine within §5 (no badges, no XP, no gated facts), as long as
  every "discovery" opens an existing card and nothing new is invented.

---

## 2. Reuse, modify, build new

| Reuse as is | Modify | New |
| --- | --- | --- |
| Content pipeline: md `world:` blocks, `src/lib/world.ts`, build-time validation in `page.tsx` | `Scene.tsx`: split into canvas, HUD and store (it's 521 lines and owns everything) | `state/worldStore.ts`: mode, selection, tour, explored |
| `zones.ts`, `objects.ts`, `placements.ts` (coordinates stay valid) | `Player.tsx`: separate the controller from the camera rig | `camera/CameraDirector.tsx`: one camera, flights between poses |
| All 12 hand-made buildings (bespoke, photo-based, carry the honesty grammar) | `useKit.ts` and `shading.ts`: Basic to lit materials | `camera/GlobalControls.tsx` (three's OrbitControls, clamped) |
| `nav.ts` grid and pathfinding: also the first-person collision | `worldShader.ts`: add hover highlight, make the occlusion fade work in perspective, run on lit materials | `camera/ExploreController.tsx` (first person, optional third person) |
| `Avatar.tsx`, clips, `clipScale.ts` | `Stage.tsx`: the island replaces the slab boxes | `environment/`: Island, Water, Vegetation, Lighting, Life |
| `Transit.tsx`, ferry, queue, idle motion | `WorldCardView` → `ExperiencePanel` (location level, side panel or sheet) | `LocationLabels.tsx`, `ProximityPrompt.tsx` |
| Tour logic (stops, timing, pause), counter, light-up | `WorldShell` poster buttons and copy (copy needs your approval) | `ModeSwitcher`, `VirtualJoystick`, `ControlsGuide` |
| `WorldList.tsx`, probe, watchdog, `?poster`, `?nav`, `?at=` dev tools | Watchdog: add quality tiers before falling back to the list | `locations.ts`: per-zone framing, label anchor, stand point |

---

## 3. Visual direction: from today to Cozy Miniature

Measured against `poster.webp` and your references:

| Today | 2.0 |
| --- | --- |
| Flat rectangular slab with a thin edge | **A floating island**: an organic rounded outline with a thick layered skirt (grass lip, soil, rock), on a soft gradient background. Taipei sits on a **small islet across the water**, so the ferry crossing is literally from one island to the other. |
| Ground is mostly beige paving | **Grass by default.** Paving only for plazas and the ring road. Curved warm-tan footpaths link the zones. |
| ~25 Kenney cone trees | **150–300 instanced round trees** in 3–4 species and colours, plus bushes, hedges and flower beds. The jacarandas and banyan stay. Trees cluster into small parks between zones. |
| Flat blue river | **Stylised water**: depth tint, a soft foam line along the banks, gentle ripple. A small waterfall over the island edge is optional (P2). |
| Unlit, no shadows | **Warm sun + sky/ground light, soft shadows** baked once at load (§7), light fog for depth, darkened ground rings at building bases. |
| Zones float on the paving | **Each zone gets a plot**: an edged garden bed with hedges, a bench, a lamp, so the zones read as small districts. |
| Cool palette with a strong blue | **Pastel, natural palette tokens** in one file. The site's blue stays as the UI accent only. |
| No signage | **Location labels** in Global view: a small pill with number and name (DOM, so it's accessible). |
| Few people | **Tiny instanced pedestrians** on the footpaths (P2). The buses and CityCat already move. |

**Honesty grammar (WORLD.md §4) is preserved.** Only materials, light and surroundings change. StarLens stays
shuttered, Finance Forms frosted and padlocked, the prototypes stay on plinths, and Formosa's
"never photographed" faces stay grey clay. Every building is re-checked after re-lighting.

---

## 4. Scene architecture

```
WorldShell (poster → scene → list)
└─ Scene
   ├─ WorldCanvas  <Canvas> one PerspectiveCamera, shadows, frameloop pause off-screen
   │   ├─ Lighting          hemisphere + directional sun, static shadow map, fog, background
   │   ├─ Island            terrain top, skirt layers, Taipei islet          (procedural, merged)
   │   ├─ Water             river channel + foam shader
   │   ├─ Roads             existing ring road
   │   ├─ Buildings         existing kit instances + 12 hand-made modules (unchanged geometry)
   │   ├─ Vegetation        instanced trees / bushes / flowers (sway via worldShader)
   │   ├─ Life              Transit, ferry, queue, pedestrians
   │   ├─ Interaction       ObjectHit boxes, hover highlight, proximity detection
   │   ├─ Avatar            Steven (visible in Global view and third person)
   │   ├─ CameraDirector    owns the camera: home / focus / tour / explore poses + flights
   │   │   ├─ GlobalControls     OrbitControls, active only in Global view
   │   │   └─ ExploreController  first person (+ third-person toggle), active only in Explore
   │   └─ Watchdog / ExploreFade / ZoneWatcher   (existing)
   └─ WorldHud  (DOM)
       ├─ WorldHeader + ModeSwitcher + OutLinks
       ├─ LocationLabels (projected), ProximityPrompt, crosshair
       ├─ ExperiencePanel (one component, both modes)
       ├─ TourBar, Counter, camera controls, ControlsGuide
       └─ VirtualJoystick (touch, Explore only)
```

**State.** A small zustand store holds what the UI reacts to: `mode`, `selectedLocation`, `focusedCard`,
`hoveredLocation`, `tour`, `explored`, `quality`, `still`. Zustand is already in the bundle as a dependency
of R3F 9, so it costs 0 kB. It would be declared explicitly in `package.json` at the installed 5.1.0.
Per-frame values (positions, input, camera pose) stay in refs, as now, so nothing re-renders per frame and
the React Compiler stays happy.

**Location data.** `locations.ts` is a thin derived view, not a new copy of content:

```ts
type Location = {
  zoneId: string;              // from zones.ts
  number: number;              // career sequence (zone number)
  name: string;                // zone name
  objectIds: string[];         // from objects.ts, route order → which cards the panel shows
  label: [x, y, z];            // where the pill floats
  framing: { azimuth: number; distance: number; target: [x, y, z] };  // focus camera
  standPoint: [x, z];          // where Explore spawns / Steven walks to
};
```

Card copy stays in the markdown and `src/lib/world.ts`. `page.tsx` validation grows by one check: every
location has at least one object.

---

## 5. Two modes: camera and interaction

### State machine

```
 poster ──"Enter the world"──▶ GLOBAL ◀──────── exit / finish ───────┐
   │                            │  ▲                                  │
   │                  click bldg│  │close / reset                     │
   │                            ▼  │                                  │
   │                         GLOBAL·focus ──"Quick tour"──▶ TOUR (stop i) 
   │                            │
   │               "Explore" (spawns at the focused location, or where Steven stands)
   │                            ▼
   │                         EXPLORE ──"Global view" / Esc menu──▶ GLOBAL (selection kept)
   └─"Read as a list"──▶ LIST (DOM, unchanged)
```

There is **one camera and one scene.** Switching mode is a camera flight (about 1.2 s, eased; a cut under
reduced motion), never a remount.

### Global view (default)

- **Camera:** perspective, **narrow FOV (~22–25°)**, so it still reads as a miniature model rather than a
  wide-angle game. The home pose fits the whole island to the viewport's aspect.
- **Orbit:** three's own `OrbitControls` from `three/examples` (no new package). Free azimuth, pitch clamped
  to about 30°–62° from vertical so the camera never goes under the island, distance clamped, pan clamped
  to the island. Q/E still snap 90°, +/− still zoom. **Reset camera** flies home.
- **Hover:** the building lights up through `worldShader` (a `uHoverZone` uniform brightens that zone's
  footprint, at zero extra draw calls), and its label grows.
- **Click:** the camera flies to the location's framing, the building stays highlighted, and the
  **ExperiencePanel** opens with every card of that location (Ferry landing shows E.SUN, StarLens and the
  crossing). On desktop the framing shifts left so the panel doesn't cover the building.
- **Steven** is in the world as ambient life. When you select a building he walks there (today's
  `openCard → walkTo`), so Explore can start from where he stands. Clicking the ground deselects.
- **Taipei islet:** with free orbit, the binary hide (steps 1–2) becomes a fade that depends on the camera
  angle, so it never stands between the camera and the block.

### Quick tour

The tour keeps today's stops, timing and controls (12 stops, ~75 s, prev/pause/next/exit, a stepper under
reduced motion). What changes: the **CameraDirector** frames each location instead of following Steven,
and the panel shows each stop's card. Steven still walks the route below. Starting the tour from Explore
returns to Global view first. P2: a soft *career-journey line* traces the route on the ground as it plays.

### Explore (first person)

| | Desktop | Touch |
| --- | --- | --- |
| Move | WASD / arrows (move relative to where you look) | left virtual joystick |
| Look | mouse with pointer lock after a click on the canvas; drag-to-look if the lock is refused | drag on the right half |
| Sprint | Shift | push the joystick to its edge |
| Interact | E or click on the target | tap the prompt button |
| Menu / leave | Esc releases the pointer and opens a menu: *Resume · Global view · Controls* | Global view button |
| No mouse | ← → turn, ↑ ↓ move | — |

- **Camera:** eye at 1.6 m on Steven's position, FOV ~70°, pitch ±60°, no head bob (motion sickness and
  reduced motion). The near plane is 0.1 m.
- **Collision:** the existing `nav.ts` grid, built from triangles below 1.9 m and grown for the body, with
  the existing wall slide. You can't walk through walls, into the river or off the island.
- **Interaction:** the nearest object within ~4 m and inside a ~35° cone of the view shows
  *"E · Open StarLens"*. The same ExperiencePanel opens, scrolled to that card. The pointer lock is released
  while the panel is open, so its links can be clicked.
- **Third-person toggle (V)**, if you choose it in D1: same controller, camera 4 m behind Steven, with the
  existing occlusion fade. It keeps the avatar on screen, which is what the "One more thing" card refers to.
- **Phones:** Global view is the default and Explore is offered, never forced (plan §10).

### HUD layout (desktop)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Walk around my career        [ Global view │ Explore ]           CV  Projects │
│ 11 stops · Taipei → Brisbane                                                │
│                                                        ┌──────────────────┐ │
│              ( 3D island )     ╭───────────╮           │ 1 · Ferry landing│ │
│                                │1 Ferry    │           │ E.SUN …          │ │
│                                ╰───────────╯           │ StarLens …       │ │
│                                                        │ The crossing …   │ │
│                                                        └──────────────────┘ │
│ ● 4 of 11 explored          ▶ Quick tour   ⟲ ⟳   ⌂ Reset   ☰ List   ⌨ Keys │
└───────────────────────────────────────────────────────────────────────────┘
Phones: the panel is a bottom sheet (max 60%), controls stack, labels thin out when crowded.
```

**New UI copy** (mode names, subtitle, prompts, the poster button) is new text. It will be listed for your
approval. No card copy changes.

---

## 6. Asset strategy

- **Keep** the Kenney kit (CC0) and all hand-made buildings. They're light (627 KiB for both GLBs) and
  most of the buildings were modelled from your photographs.
- **Procedural, in code**, for everything new: island terrain and skirt (an outline from seeded noise, so
  it's the same every load), water, round low-poly trees, bushes, flowers, rocks, hedges, benches, lamps
  and pedestrians. It's deterministic, costs no download, and is instanced.
- **Kenney Nature Kit is viable again.** v1 rejected it because it's designed to be lit and looked flat
  unlit. Once the world is lit (D2), it's an option. It would need a manual download, because kenney.nl
  refuses scripted downloads. **Plan: procedural first, Nature Kit only if the trees don't reach the quality.**
- **Avatar:** keep `steven.glb`. Its flat `MeshBasicMaterial` becomes a lit toon or Lambert material to match.
- **Housekeeping:** `kit.glb` still carries the crane, scaffolding and cones that are no longer used. They
  drop out the next time the kit is rebuilt from the Kenney zips.
- No paid assets and no generated meshes, in line with WORLD.md §0.

---

## 7. Performance and accessibility

### The lighting approach

- `MeshBasicMaterial` with baked vertex light becomes **`MeshLambertMaterial`** (the cheapest lit
  material). Vertex colours keep only the colour, so `paint()` drops `FACE_LIGHT`.
- **One directional sun with a shadow map rendered once** (`shadowMap.autoUpdate = false`, then a single
  `needsUpdate`). The world is static, so the shadow pass costs nothing per frame. It only re-renders if
  day/night changes. Moving things (Steven, buses, ferry, queue) keep cheap blob shadows.
- The `worldShader` patch hooks `opaque_fragment` and `clipping_planes_fragment`, which Lambert also has,
  so it ports as is.
- **Kenney colormaps have some shading painted in**, which may look doubled once lit. The Phase 1 spike
  checks this before anything else is committed.

### Budgets

| | Last measured (WORLD.md) | 2.0 target |
| --- | --- | --- |
| `/`, `/projects`, `/about` JS | 201.7 kB | **unchanged** |
| `/world` before any click | 208.1 kB | unchanged (poster first) |
| `/world` JS with the scene, on top of shared | ~303 kB (M6), **~47 kB headroom** | ≤ 350 kB. Orbit + pointer-lock controls ~5 kB gzip, zustand 0, new code est. 15–25 kB |
| GLBs | 627 KiB | ≤ 1.5 MB (procedural keeps this flat) |
| Draw calls | 45 at M2; **not re-measured since ~15 hand-made buildings were added** | measure first; ≤ 100 desktop |
| Triangles | 23k at M2 | ≤ 200k desktop, ≤ 120k low tier |
| Frame rate | iPhone 18 Pro 59.8 fps | ≥ 50 fps on a laptop iGPU, ≥ 45 on phones |

### Quality tiers

- **High** (fine pointer): dpr up to 1.75, 2048 shadow map, full vegetation, pedestrians.
- **Low** (coarse pointer, or the watchdog's first step): dpr 1, 1024 shadow map or blob shadows only,
  half the vegetation, no pedestrians.
- **The watchdog chain grows:** lower dpr, then the low tier, then the list (as today).

### Accessibility (all kept)

- The list stays, and the canvas stays `aria-hidden`.
- Tab through objects in Global view, with the camera flying to each.
- The panel is a dialog with a focus trap, Esc and focus restore.
- Explore works without a mouse (arrows turn, WASD moves, E interacts). Pointer lock is never needed on touch.
- Under reduced motion: camera cuts instead of flights, no idle motion, no head bob, and the tour is a stepper.

---

## 8. Implementation sequence

Each phase ends with a report and your approval, as the plan asks. Estimates are AI-assisted part-time
hours, the same unit WORLD.md uses.

### Phase 1 — Visual foundation · L · 18–28 h

1. **Baseline:** measure draw calls, triangles, JS and fps, and take screenshots, so every later number has
   something to compare against.
2. **Look spike behind `?look=v2` (development only):** lit materials, static shadows and the palette, on
   the current slab. Side-by-side screenshots. **→ approval gate.** It's cheap to abandon here.
3. Island terrain, skirt and Taipei islet; water shader.
4. Ground: grass, curved paths, zone plots, hedges.
5. Vegetation and small details, instanced.
6. Palette pass on every hand-made building and the kit; honesty-grammar check per building.
7. Re-render `poster.webp` and `public/projects/World.webp`; record the decisions in WORLD.md.

**The camera, tour and walking stay exactly as they are**, so Phase 1 can ship on its own.
**Done when:** the whole island is visible, all 11 locations are represented, content is unchanged, the art
direction is consistent, budgets hold, and the console is clean.

### Phase 2 — Global view · M–L · 14–20 h

Store and Scene split, perspective camera and CameraDirector, clamped orbit, reset, labels, hover
highlight, focus flights, location-level ExperiencePanel, the tour on the CameraDirector, HUD and
ModeSwitcher, keyboard Tab, reduced motion.
**To keep R2 (self-exploration) in place between phases**, "Explore" temporarily switches to today's
third-person follow walk, now in perspective. Phase 3 replaces it, and it becomes the V toggle.
**Done when:** every location is clickable with the right cards, links work, the tour runs end to end, and
Reset always gets back to the overview.

### Phase 3 — Explore · M–L · 14–20 h

First-person controller on the nav grid, pointer lock with the drag fallback, proximity prompt and E,
joystick and touch look, fly-in and fly-out transitions, selection kept across modes, the third-person
toggle, controls guide, eye-level collision checks at every location.
**Done when:** you can walk to every location, walls and water block you, the panels are the same ones as
in Global view, and switching modes doesn't reload the scene.

### Phase 4 — Polish · M · 8–14 h

Water motion, wind, pedestrians, a day/night toggle, the career-journey line, transition tuning, and
discovery details that only lead to existing cards (Skyveil → Veilcore, UQ → UQGUTS). Sound only with a
mute, off by default (WORLD.md §10).

### Phase 5 — Optimisation and release · M · 6–10 h

- Desktop Chrome and Safari, iOS Safari, Android Chrome, several viewports.
- Forced WebGL failure; budgets.
- `npm run lint`, `npm run build`, `npm run check:links`.
- WORLD.md and a handoff note.
- **Deploy only on your approval.**

**Total: about 60–92 h.**

---

## 9. Risks

| Risk | Guardrail |
| --- | --- |
| **First person exposes low detail.** The kit and the buildings were made for an isometric view from 100 m: plain backs, flat facades. | Eye-level checks in the Phase 1 spike. Add ground-level detail where Explore walks. Keep the FOV at 65–70°. |
| **The lighting pivot recolours everything.** Every hand-made colour was tuned unlit. | The palette pass is a named Phase 1 step, not an afterthought. The spike catches problems first. |
| **The draw-call budget may already be near or over 80.** | Measure in Phase 1 step 1. Merge per material where needed. |
| **About 47 kB of JS headroom.** | Controls come from `three/examples` (no new package) and zustand is already bundled. Measure after each phase. |
| First person on phones (controls, motion sickness) | Global view is the default, Explore is optional, no head bob. |
| Free orbit shows the backs of buildings | The Formosa grey faces are intentional. Other backs get a light detail pass in Phase 1. |
| The poster no longer matches the world | Re-render at the end of Phase 1 (the `?poster` pipeline exists). |
| Time taken from job applications (PLAN.md priorities) | Each phase can ship on its own. Phase 1 alone is the biggest visible win. |

---

## 10. Dependencies

- **No new runtime packages.** `OrbitControls` and `PointerLockControls` ship inside `three/examples/jsm`.
  Zustand (5.1.0) is already installed through R3F and would only be declared explicitly.
- **drei stays out.** Nothing here needs it, and WORLD.md §9 rejects `<Html transform>` for accessibility
  reasons. Labels and panels stay real DOM.
- **No physics engine:** the nav grid already does collision. **No postprocessing:** fog, the gradient
  background and shadows give the depth.
- **Next 16 rules re-checked** in `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`:
  `ssr: false` is still Client-Component-only, which the current `page.tsx → WorldShell → Scene` shape
  already respects. Turbopack only: no `webpack` key.

---

## 11. Decisions needed before Phase 1

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| **D1** | What does Explore look like? | (a) first person only · (b) first person + **V** toggles to a close third-person camera · (c) third person only | **(b).** First person is what you asked for. The toggle costs little (same controller, occlusion fade already exists) and keeps Steven's avatar on screen, which the "One more thing" card is about. |
| **D2** | Switch from unlit, baked light (WORLD.md §6) to real light and soft shadows? | yes, behind the spike gate · no, stay unlit and fake the shadows | **Yes, gated by the Phase 1 spike.** The Cozy look depends on it. |
| **D3** | Switch from orthographic, pitch-locked, 90°-only (WORLD.md §6) to a perspective camera with free orbit? | perspective, narrow FOV, clamped pitch · keep orthographic | **Perspective.** It's needed for first person and for smooth mode flights. Q/E snaps stay. |
| **D4** | World shape? | a floating organic island + Taipei islet · keep the rectangle, nicer edges | **Island + islet.** It's the reference look, and it makes the Taipei → Brisbane crossing visible. |
| **D5** | How do visitors enter? | keep poster first (click to load) · auto-load the scene on desktop | **Keep poster first.** It's why `/world` costs ~6 kB until someone clicks. The poster gets the new look and a primary *Enter the world* button that lands in Global view. |
| **D6** | What does a click open? | the location panel with all its cards · one card per object, as today | **Location panel.** It suits recruiters (one click, the whole stop). Explore's E still opens the panel scrolled to the object you faced. |

All six were approved as recommended on 26 Nov 2026.

---

## 12. Progress

### Phase 1 · step 1: baseline (26 Nov 2026)

Measured on the unchanged code: production build, `next start`, headless Chrome at 1280 × 880, with
`scripts/world-measure.mjs` (draw calls are counted per frame by wrapping the WebGL2 draw functions).

| | Measured | Budget |
| --- | --- | --- |
| `/` script | 192.3 kB | unchanged |
| Scene chunk loaded on the button press | **303.3 kB**, one chunk | ≤ 350 kB → **~47 kB headroom** |
| GLBs over the wire | kit 153.1 kB + avatar 250.1 kB | ≤ 1.5 MB |
| Draw calls, follow view | 45 | < 80 |
| Draw calls, whole-block view | **105** | < 80, **over** |
| Triangles, whole block | 38,630 | < 150k |
| Frame rate | 60 fps headless (capped there; not a device figure) | — |

- **Draw calls are over budget at whole-block zoom.** Frustum culling keeps the follow view at 45.
  Phase 2 makes the overview the default view, so merging per material becomes necessary (step 6 or
  Phase 5).
- **Measure the chunks the press adds, not page totals.** The pre-press total includes `<link>`
  preloads and moves with Next's prefetch timing. One early reading said 170 kB pre-press and
  ~25 kB headroom. That was this noise.

### Phase 1 · step 2: the look spike (26 Nov 2026) — approved the same day

**What:** `/world?look=v2`, development only. Real light and soft shadows on the current slab.
Add `&poster` for the clean whole-block still, or `&eye=x,z,yaw` for a 1.6 m first-person view.

| File | Change |
| --- | --- |
| `scene/look.ts` | new: the flag and the spike's palette and light values |
| `scene/LookV2.tsx` | new: lights, the material swap, static shadows, the eye camera |
| `Scene.tsx` | mounts LookV2 (development only), shadow settings, gradient background |
| `scene/Stage.tsx` | grass and bank colours under the flag; the block's group is named `world-stage` |
| `scene/shading.ts` | under the flag, vertices carry colour only (no baked `FACE_LIGHT`) |
| `scripts/world-measure.mjs` | new: the measurement and screenshot script above |

**Light:**

- **Sun (key):** warm, from the west-south-west at 42°, intensity 2.5, with the only shadows (2048
  map, PCF radius 3).
- **Fill:** shadowless, from the east, 0.7.
- **Sky:** hemisphere light, cool sky over warm ground, 1.2.
- **Tone and backdrop:** Neutral tone mapping; a sky-to-haze CSS gradient behind the canvas.

**Static shadows:** the map redraws only when the set of casters changes. A mesh in the block that
moves (the ferry, the queue, Olie, the turbine) stops casting the moment it moves.

**Verified:**

- **Per-frame cost unchanged:** 105 draw calls and 38,630 triangles at whole block, the same as the
  baseline, because the shadow pass doesn't run per frame.
- **Shipped code unchanged:** production loads the same single scene chunk, +29 bytes. In production
  `?look=v2` is inert: same chunks, the spike's chunk never loads, no style change.
  - A first version cost +5.8 kB of re-chunking because the lazy import's split point survived. The
    literal `process.env.NODE_ENV` test at the import fixed it.
- **No regression:** without the flag, development renders pixel-identical to the baseline
  (poster view).
- **Shadows read strongly:** lit grass against grass in shadow is about 31% in linear light.
- `eslint` and `tsc` are clean. The only console warning is the old R3F `THREE.Clock` one.

**What it showed:**

1. **Sun direction matters most.** A high south-west sun put every shadow behind its building, out of
   the camera's sight. West-south-west at 42° (a Brisbane late-summer afternoon) puts the shadows to
   the right of each building, where the default camera sees them.
2. **Kenney colormaps hold up when lit.** The feared double shading didn't show.
3. **Glowing things now read as paint:** Club Velvet's sign and windows, the control-centre screen,
   the arcade screen. The arcade flicker also stops, because the swap replaces its material behind
   its ref. Step 6 gives these an emissive treatment.
4. **The river doesn't take shadows** (a custom shader), so the tower's shadow stops at the bank.
   Step 3's water shader takes them.
5. **Eye level holds up better than feared.** The street, the Formosa storefront and Club Velvet all
   read at 1.6 m. Weak spots:
   - large blank walls (the data-centre hall);
   - greyed, unexplored zones look odd at eye level. Phase 3 decides whether Explore shows full colour.
6. **Shadow acne** on thin uprights (the noticeboard legs) was fixed with normal bias 0.09.
7. **The slab's edges are now green walls.** The island's skirt (step 3) replaces them.
8. **Moving things cast nothing:** Steven, the buses, the ferry. Blob shadows come later.

**Spike shortcuts, not to be kept:**

- Swapping materials by walking the scene. The real version sets the material where it's made.
- The movement detector. The real version marks moving meshes explicitly.
- The `eye=` camera (it's replaced by Phase 3's controller).

**Next, on approval:** steps 3–7 (island and water, ground, vegetation, palette pass, poster).

### Phase 1 · steps 2–7: the new look, built (26 Nov 2026) — approved the same day

The spike was adopted and rebuilt properly: no flag, no scene-walking material swap. The lit look is the
default.

**What's there now:**

- **Light** (`scene/Lighting.tsx`, `scene/look.ts`): the spike's three lights and Neutral tone mapping.
  - Materials are `MeshLambertMaterial` where they're made (~40 sites, scripted).
  - What should glow stays `MeshBasicMaterial`: the control-centre and arcade screens, Club Velvet's
    neon sign and glow, hover patches, Steven's contact shadow and marker.
  - The Taipei skyline stays unlit, as haze.
- **Lamps** (`shading.ts`, `worldShader.ts`): anything painted in a lamp colour (`#f2d98a` doors,
  `#f2c14e` windows, used for nothing else) is self-lit, so "lit, door open" (WORLD.md §4) still reads
  in shade.
  - The flag rides in `uv.y`: no new attribute, no draw call.
  - `shading.ts` no longer bakes a sun into vertices.
- **Static shadows** (`useStaticShadows`): every lit mesh in the block receives shadows and every
  static one casts. The map redraws on mount and when the skyline toggles, never per frame.
  - Moving parts are marked `userData.dynamic`: the turbine, Gus, the "!", the queue, the ferry,
    Skyveil's notes, JourneyMate's pin, the flags and Olie's head.
  - The bus shelters cast. The buses and Steven receive only.
- **The island** (`scene/Island.tsx`, decision D4):
  - **Brisbane:** a rounded landmass over the old slab's land.
  - **Taipei:** a long islet where the far bank was.
  - **Platform:** a floating platform of water round both, with a near-vertical soil-and-rock skirt
    tapering underneath. Outlines are pushed outwards only, so no walkable cell was lost.
  - **Water:** Lambert, so it takes shadows (the tower's shadow now crosses it). Gentle swell, deeper
    colour away from the shore, and a foam line from two signed-distance rectangles.
  - **The ferry** is clipped at the island's edge.
  - The whole-island zoom was re-fitted in `Player.tsx`.
- **Footpaths** (`scene/Ground.tsx`): two promenades between the rows and five spurs to the streets.
  One mesh; scenery only.
- **Vegetation** (`scene/Vegetation.tsx`), seeded:
  - ~200 round trees in three crown shapes, in noise-shaped groves, plus a fringe round the island's
    edge. Rare poinciana-red and gold accents.
  - Bushes, flower beds, and rocks along both shores.
  - **Clear of the scene's content:** roads, paths and every zone stay clear, with a wider margin on the
    camera side so no facade is hidden.
  - **Walking:** trunks and bushes join the walk grid (`blockDisc` in `nav.ts`). The grid and the
    vegetation are built together in one memo in `Stage.tsx`. `?nav` was checked: every zone is
    still reachable.
- **Poster** re-rendered at 2560 × 1600 from the scene itself, with the sky gradient (the wrapper
  element is screenshotted at 2×; Next's dev badge hidden). Copied to `public/projects/World.webp`.

**Measured** (production build, `scripts/world-measure.mjs`):

| | Baseline | Now |
| --- | --- | --- |
| `/`, `/projects`, `/about` script | 192.3 / 199.2 / 192.3 kB | unchanged (+18 bytes of manifest) |
| Scene chunk | 303.3 kB | **308.8 kB** (+5.5 kB) → ~41 kB headroom |
| GLBs | 403 kB over the wire | unchanged |
| Draw calls, follow / whole island | 45 / 105 | 51 / **111** |
| Triangles, whole island | 38.6k | 59.4k |
| Console | `THREE.Clock` warning | the same, nothing else |

**Checked:**

- `tsc`, `eslint` and `next build` are clean.
- A headless run worked end to end:
  - a tap on the lawn walks Steven there and the camera follows;
  - the occlusion fade still cuts round him;
  - Enter on StarLens opens its card;
  - after 14 s the tour is at stop 3 of 12, on Finance Forms, with 3 of 11 explored.
- Honesty grammar, zone by zone at 3×: StarLens shuttered, Finance Forms frosted and padlocked,
  prototypes on plinths, and the museum, data centre, control centre and restaurants all lit with
  their doors open. Club Velvet's sign and windows glow.

**Acceptance (§8, Phase 1):** whole island visible ✓ · all 11 locations ✓ · card copy unchanged ✓ ·
consistent art direction ✓ · JS and GLB budgets ✓ · clean console ✓ · **draw calls ✗.** The
whole-island view was already over the < 80 budget (105) and is now 111. Phase 2 makes that view the
default, so merging the hand-made buildings' static meshes (one material each, today) belongs at the
start of Phase 2.

**Open:**

1. **Poster alt text is new copy** (`WorldShell.tsx`), for Steven's approval: *"A small floating
   island seen from above, Brisbane on the main island and Taipei's skyline on an islet across the
   water: …"* The rest of the sentence is unchanged.
2. **The link-preview image** (`world/opengraph-image.tsx`, `og-background.jpg`) still shows the old
   look. Phase 5, or sooner if wanted.
3. **No real phone yet.** Frame rate is only measured headless (capped at 60). Phones get a
   1024 shadow map. The watchdog still lowers the pixel ratio, then falls back to the list. A shadows-off
   tier isn't built.
4. **Moving things have no shadow** (Steven keeps his contact blob). Phase 4.
5. Kenney's cone trees stand alongside the new round ones. It reads as mixed planting; noted, not changed.
6. **Explore mode:** unexplored zones are greyed. That looks odd at eye level (spike, point 5).
   Phase 3 decides.

### Phase 2: Global view (26 Nov 2026) — approved the same day, copy included

**Draw calls first.** Phase 2 makes the whole-island view the default, and it was at 111.

- **Static batching** (`scene/batch.ts`, `useStaticBatch`): once the block mounts, every static, opaque
  shared-shader mesh is baked in world space into one geometry per material. That's the kit's
  instanced models per colormap, and every hand-made vertex-coloured model in one. The originals are
  hidden.
  - The world shader works per fragment and the lamp flag rides in `uv`, so the result is
    pixel-identical (3 of 4.5 M pixels differ).
- **The skyline** is baked into one mesh per tint (`KitInstances.tsx`).
- **Result:** whole island **111 → 76** before the rest of Phase 2; **78** with it.

**The camera** (`scene/CameraRig.tsx`, decision D3):

- **Perspective, 24° FOV.** One camera; the canvas never remounts.
- **Global view:** three's own `OrbitControls` (no new package).
  - Drag turns the island; right-drag or two fingers move it.
  - Pitch is held between ~24° and ~64° from straight down, and the aim point can't leave the island.
  - The wheel and pinch zoom through the rig, so at either limit the page scrolls as before.
- **Every change of view is a flight** of ~1.1 s (a cut under reduced motion): reset, focus a location,
  a quarter turn (Q/E or the buttons), switching mode.
- **The home view** is fitted to the screen and opens at exactly the poster's framing.
- **Explore (interim):** v1's follow view in perspective, with Q/E quarter turns. Phase 3 replaces it
  with first person and keeps this as the V toggle.
- **The skyline** hides whenever the camera looks from the river side (with hysteresis), not only at
  fixed azimuths.

**Locations and the panel** (`scene/locations.ts`, `ui.tsx` `LocationPanel`, decision D6):

- **A location is a zone and its cards in route order**, derived from zones.ts, each card's `zone` and
  objects.ts. It's not a new copy of content.
- **Clicking any building or label** opens the location's panel: a right-hand panel on desktop (the
  camera frames the building beside it), a bottom sheet on phones (the camera lifts the building
  above it).
  - The clicked card is marked and scrolled into view; ← / → walk the locations in route order.
  - Focus moves in and is restored on close, Tab is trapped, Esc closes.
- **Card copy is unchanged**, rendered with WORLD.md §7's anatomy.
- **Hover and selection** brighten the zone's buildings (`uHover` / `uSelect` in the world shader; no
  draw calls).
- **Labels:** DOM pills over every location (number + name; number only on phones), projected each
  frame and decluttered. They're mouse shortcuts (`aria-hidden`, out of the Tab order); the
  existing sr-only object list stays the keyboard and screen-reader way in.
- **Clicks that end a drag** (an orbit) never select or deselect anything.

**The tour** runs on camera flights: each stop flies to its location and opens its panel on the stop's
card. Twelve stops at 6 s each take **72 s**. Steven walks the route below at 1.4× pace. The controls are
unchanged, and it's a stepper under reduced motion.

**The HUD:**

- **Top left:** the mode switcher, then the hint or the tour bar.
- **Top right:** CV and Projects, turn left / right, back to the whole island (Global view only),
  the keyboard legend.
- **Bottom left:** the counter and ▶ Quick tour.
- **Removed:** the whole-block button (Global view replaces it).
- **Keys:** walking keys in Global view switch to Explore.

**Also fixed:** the occlusion fade stippled the road in front of Steven, because road tiles use the
shared shader. It existed in v1 too, on kit roads. Now only fragments above 0.3 m are cut.

**The poster** opens with **Enter the world** (primary) and *Take the quick tour* (D5). It was
re-rendered from the new home view.

**Measured** (production build):

| | Phase 1 | Phase 2 |
| --- | --- | --- |
| `/`, `/projects`, `/about` script | 192.3 / 199.3 / 192.3 kB | unchanged |
| Scene chunk | 308.8 kB | **317.3 kB** (+8.5 kB: orbit controls, rig, panel) → ~33 kB headroom |
| Draw calls, whole island | 111 | **78** (default view) |
| Console | `THREE.Clock` only | the same |

**Checked, headless** (`tsc`, `eslint` and `next build` are clean):

- Enter → the Global view with labels.
- The UQ label opens "2 · UQ corner" with its three cards, framed beside the panel. Next goes to the
  government tower.
- Explore and back. Reset closes the panel and returns home.
- **All 12 locations** walked through the panel: 18 cards, 17 links, and every internal link returns 200.
- **The tour end to end:** 72 s, ending on the exit board at 11 of 11 explored.
- **Keyboard:** Tab to Eco Router, then Enter, opens its panel with focus inside; Esc closes it.
- **Phone** (iPhone 13 viewport, touch): number labels; a tap opens the Shopfront sheet with the
  building framed above it.
- **Reduced motion:** the tour is a stepper (no timer, no pause button), the camera cuts.
- **No console errors** in any run.

**Acceptance (§8, Phase 2):** every location clickable with the right cards ✓ · links work ✓ · the tour
runs end to end ✓ · Reset always returns to the overview ✓.

**New UI copy for Steven's approval.** Card copy is untouched.

- Poster: **"Enter the world"**, now primary; "Take the quick tour" is kept, as the secondary button.
- Modes: **"Global view"**, **"Explore"**. The switcher's accessible name: "How to see the world".
- Hints: "Drag to turn · scroll to zoom · click a building to open it" (mouse) and "Drag to turn ·
  pinch to zoom · tap a building" (touch). The Explore hint is unchanged.
- Buttons: "▶ Quick tour", "Turn the view left (Q)" / "right (E)", "Back to the whole island".
- Loading: "Loading the island…" (was "…the block…").
- Keyboard legend:
  - Drag — Turn the island (right-drag moves it)
  - Wheel / + − — Zoom
  - Q / E — Turn by a quarter
  - W A S D / arrows — Walk (switches to Explore)
  - Shift — Run
  - Tab / Enter — Visit each stop, open it
  - Esc — Close the panel
- Panel: the location's name with its number ("2 · UQ corner"); the stop navigation is labelled
  "Other stops".

**Open:**

1. **Explore is still v1's follow camera** (in perspective). First person is Phase 3.
2. **On a phone the island is small in portrait** (the home view fits its width). Labels are number
   badges there. Worth a look on a real device.
3. **Labels can sit under the HUD** at the screen's top edge when zoomed in. Cosmetic.
4. **Housekeeping:** `.next/types/` had byte-identical `… 2.ts` / `… 3.ts` copies (the same
   sync-conflict pattern as the untracked `… 2.jpg` files in the repo) that broke `tsc`. They were
   generated files and were deleted. If the folder is synced (iCloud Desktop), they may come back.
5. Carried over from Phase 1: the link-preview image, no real phone yet, moving things without
   shadows.

### Phase 3: Explore in first person (26 Nov 2026) — approved the same day, copy included

**Two views over one controller** (decision D1). Both share one yaw and pitch, and V switches between
them:

- **First person:** the eye is at 1.6 m on Steven's position, with a 70° FOV and a crosshair. His body
  isn't drawn (he still walks and collides).
- **Third person:** a chase camera ~5.5 m behind and above him (58° FOV). It walks the line behind him
  on the walk grid and pulls in rather than back through a wall. The occlusion fade now sizes its window
  to the camera's distance (~0.8 m up close, 2.4 m from far off).

**The camera** (`scene/CameraRig.tsx`):

- **Flights now ease FOV too**, so Global view swoops down into his eyes and back out. Explore starts
  facing the way the overview looked; Global view comes back facing the way he looked.
  - A bug found on the way: the return flight started from the stale orbit aim, because switching mode
    sets both props in one render. Fixed by starting flights from the mode the last frame was drawn in.
- **At eye level** the near plane drops to 0.15 m (walls are close) and a light fog fades in (70–260 m).
  The fog always exists and only its distances move, so it costs no shader recompile.
- **The skyline stays on in Explore**: it's ahead across the water, and toggling it would re-bake the
  shadows.
- **Unexplored zones grey out less at eye level** (`uDimAmount` 0.35 rather than 0.7), which settles
  Phase 1's open point 6.

**Hands** (`ui.tsx` `ExploreControls`, listeners on the scene's wrapper, so taps and clicks still reach
the canvas):

- **Keyboard:** WASD and ↑↓ walk, ← → turn, Shift runs, E opens what he's facing, V swaps the view.
- **Mouse:** drag to look. **L** locks the pointer for mouse-look; while it's locked, a click opens
  what he's facing and Escape frees it. Opening a panel frees it too, so its links work.
- **Touch:** a joystick wherever the left thumb lands (analog: a gentle push walks slower, the edge
  runs) and drag-to-look on the right. Tap a place to walk there, as before.
- The d-pad is gone; the joystick replaces it. `input.ts` gained an analog stick.

**Opening things** (`scene/Proximity.tsx`):

- **The target:** the object he's next to and facing (within ~4 m; a ~55° cone in first person, roughly
  ahead in third).
- **The prompt:** "E · Open …" with a keyboard, a button on touch.
- **The panel** is the same `LocationPanel` as Global view, scrolled to that card.
- **In Explore, opening a card doesn't walk him anywhere** (the visitor is driving); in Global view he
  still walks over.

**The HUD:**

- **Under the mode switcher:** First person / Third person.
- **The Explore hint:** "WASD to walk · drag to look (L locks the mouse) · E opens what you face" with
  a mouse, "Left thumb walks · drag to look · tap a place to walk there" on touch.
- **The keyboard legend** has its own list in Explore. Q/E turn only in Global view, because E opens
  things in Explore.

**A development hook, `?debug`,** like `?nav` and `?at`: it exposes Steven's position, the walk grid,
its pathfinder and the look controls to test scripts.

**Checked** (headless, development and production; `tsc`, `eslint` and `next build` are clean):

- **Every location can be walked to:** the walk grid's own pathfinder reaches all 18 objects' stand
  points from the start.
- **Walls block:** walking north into the ferry-landing buildings for 4.5 s stops at the facade
  (z −13.5). The camera doesn't clip.
- **Water blocks:** walking north off the bank for 4 s stops at z −22.49, inside the shore.
- **Eye level at every stop:** standing at each of 15 stops and facing it, the prompt offers the right
  card and nothing clips.
  - StarLens stays shuttered, Finance Forms frosted and padlocked, and the lit doors glow.
  - E opens the location's panel.
- **Modes:** V switches view. Global view → Explore → Global view keeps the **same canvas element**
  (no reload), and the selection is kept.
- **Touch** (iPhone 13 viewport, touch pointer events): a left-thumb push walks him ~6.6 m in 2 s (a
  run), he stops on release, and a right-side drag turns the view.
- **No regressions:** Phase 2's run passes unchanged (panels, next, modes, reset, tour). No console
  errors anywhere.

**Measured** (production build):

| | Phase 2 | Phase 3 |
| --- | --- | --- |
| `/`, `/projects`, `/about` script | 192.3 / 199.3 / 192.3 kB | unchanged |
| Scene chunk | 317.3 kB | **319.6 kB** (+2.3 kB) → ~30 kB headroom |
| Draw calls, Global view | 78 | 78 |
| Console | `THREE.Clock` only | the same |

**Acceptance (§8, Phase 3):** walk to every location ✓ · walls and water block ✓ · the same panels as
Global view ✓ · switching modes doesn't reload the scene ✓.

**New UI copy for Steven's approval:**

- "First person" / "Third person", with "Explore view" as the group's accessible name.
- The two Explore hints above.
- The prompt "Open …", plus the E key cap with a keyboard.
- "Esc frees the mouse".
- The Explore keyboard legend:
  - W A S D / ↑ ↓ — Walk
  - Drag / ← → — Look around
  - L — Lock the mouse to look (Esc frees it)
  - Shift — Run
  - E — Open what you're facing
  - V — First or third person
  - Esc — Close the panel

**Open:**

1. **No real device yet.** Joystick feel, look sensitivity (0.0035 rad/px mouse, 0.006 touch) and
   pointer lock in Safari need a real phone and a real Mac.
2. **Close up, some kit facades are plain** (the E.SUN wall). Phase 4's small details can help where
   Explore walks.
3. **Paths may shimmer** where they meet the grass far off at eye level (1.2 cm apart at a 0.15 m
   near plane). The fog mostly hides it. Lift them to ~3 cm if a device shows it.
4. Carried over: the link-preview image; moving things without shadows (Phase 4).

### Phase 4: polish (26 Nov 2026) — approved the same day, copy included

Chosen by what earns its place (§8: "do not add features just because they look impressive"):

- **Day and night** (one of Steven's own ideas). A sun/moon button, top right, eases the lights over
  ~1.2 s (at once under reduced motion):
  - **Light and sky:** moonlight from the same direction, so the baked shadows still fit and nothing
    re-bakes. A night sky crossfades in behind the canvas.
  - **Fog and skyline:** the fog turns blue, and the skyline's haze darkens.
  - **What glows:** the lamps (lit doors and windows), the screens and Club Velvet's sign keep their
    own glow, which is what makes night worth switching to.
  - **Defaults:** day, always in the poster. Not remembered between visits.
- **The career-journey line** (`scene/JourneyLine.tsx`; Steven's "route from Taipei to Brisbane").
  - **What:** during the quick tour, a gold dashed trail draws itself from Taipei's shore across the
    water to the ferry terminal, then on to each stop as the tour reaches it.
  - **Routing:** by the walk grid's own pathfinder, so it follows walkable ground and never cuts
    through a building.
  - **Visibility:** it shows only during the tour, fades out when the tour ends, and is hidden (no draw
    call) the rest of the time. Under reduced motion it jumps stop to stop and the dashes stand still.
- **Pedestrians** (`scene/Pedestrians.tsx`): ten people stroll the footpaths there and back, keeping to
  one side so two can pass, with a slight step bob.
  - Scenery only: no card, no count. They stand still under reduced motion.
  - Three instanced draw calls.
- **Moving contact shadows:** soft shadows under the pedestrians and under every bus car (sized from
  each car's bounds). This closes the "moving things have no shadow" item. Steven already had one.
- **Water:** a soft moving sparkle on open water, away from the shore.
- **Footpaths** lifted from 1.2 to 3 cm (`PATH_Y`), against the far shimmer at eye level (Phase 3,
  open point 3).

**Deliberately not done:**

- **Sound.** There is no audio, and WORLD.md §10 rules out a mute toggle that does nothing. Adding
  sound means sourcing licensed audio; Steven's call.
- **More hidden "discoveries"** (e.g. Skyveil → Veilcore). The stops they'd lead to are already
  clickable, so they'd add clutter without adding information (the plan allows discoveries only if they
  open existing cards). The racquet easter egg stays.
- **Extra wind.** Trees and bushes already sway through the world shader.

**Checked** (`tsc`, `eslint` and `next build` are clean):

- **Day, night and back** in Global view and in first person; night readable, lamps glowing.
- **The tour:** the line drew to stops 1, 4 and 11, following the paths (from UQ across the road to
  Formosa's door).
- **No regressions:**
  - Phase 2's run is unchanged.
  - **The full tour:** all 12 locations through the panel, 17 links with every internal one returning
    200, and the tour end to end in 72 s, ending on the exit board at 11 of 11.
- **No console errors**, development or production (night + tour in production too).

**Measured** (production build):

| | Phase 3 | Phase 4 |
| --- | --- | --- |
| `/`, `/projects`, `/about` script | 192.3 / 199.3 / 192.3 kB | unchanged |
| Scene chunk | 319.6 kB | **322.8 kB** (+3.1 kB) → ~27 kB headroom |
| Draw calls, Global view | 78 | **91**: pedestrians (3), one shadow per bus car, the rest. Within §7's ≤ 100 desktop budget, no longer under v1's 80. |
| Triangles | 59.4k | 61.3k |

**New UI copy for Steven's approval:** "Switch to night" / "Switch to day" (the button's label and
tooltip).

**Open (for Phase 5):**

1. **Draw calls 91:** batching the bus shadows into one instanced mesh would win back ~7.
2. **Night's brightness is a judgement call.** It's moody and still readable; tune `LOOK.night` by eye.
3. **Pedestrians walk through Steven** (no collision). It's rarely noticeable from above, and odd only
   in first person if you walk into one.
4. **Carried over:** the link-preview image (`opengraph-image.tsx`) still shows the v1 look; no real
   device yet.

### Phase 5: optimisation and release prep (26 Nov 2026) — done; live the same day

**Changed:**

- **Bus shadows** are one instanced mesh, updated from the cars' own matrices (`Transit.tsx`). The
  default view went from **91 to 82** draw calls.
- **The link-preview image** (`world/og-background.jpg`) was re-cut from the current poster, so a shared
  `/world` link shows the island. The card's copy is unchanged.

**Checked:**

| Check | Result |
| --- | --- |
| No WebGL (Chrome with WebGL disabled) | no canvas; the list appears with every stop |
| CPU throttled 4× (a mid-range phone's main thread, roughly) | **60 fps, 95th-percentile frame 16.7 ms** in Global view, during the tour, and walking in Explore. The GPU isn't throttled, so this proves the main thread only. |
| Viewports 1440 × 900, 1024 × 768, 768 × 1024, 390 × 844, 844 × 390 (touch for the last three) | all render; the panel opens (right-hand from `sm` up, a bottom sheet below); no errors |
| `npm run build` | passes |
| `tsc` | clean |
| `npm run lint` | **0 problems in the repo.** It reports 15,814 only because ESLint walks `.claude/worktrees/`, two old Claude Code worktrees (`feat/world-og`, `claude/nifty-hertz-02f89c`) with their own build output. Fix: add `".claude/**"` to `globalIgnores` in `eslint.config.mjs`, with Steven's OK. |
| `npm run check:links` | all 8 external project links alive |

**Measured, final** (production build):

| | v1 (baseline, 26 Nov) | 2.0 |
| --- | --- | --- |
| `/`, `/projects`, `/about` script | 192.3 / 199.2 / 192.3 kB | unchanged |
| `/world` before any click | poster only | poster only (unchanged) |
| Scene chunk | 303.3 kB | 322.9 kB (+19.6 kB) → ~27 kB under the 350 kB budget |
| GLBs | 403 kB over the wire | unchanged (everything new is procedural) |
| Draw calls, default view | 45 follow / 105 whole block | **82**, whole island (the default) |
| Triangles | 38.6k | 61.3k |

**Not possible here, and needed before calling it done on devices:**

- **Safari, iOS Safari, Android Chrome.** Only Chromium is available. Playwright's WebKit build
  (~70 MB) could be downloaded as a closer check, but it isn't real Safari either.
- **Things to try on real devices:**
  - pointer lock and touch look in Safari;
  - joystick feel and look sensitivity;
  - frame rate on a mid-range Android GPU;
  - the portrait phone's home view (the island is small);
  - VoiceOver through the list.

**For Steven to decide** (nothing below has been changed):

1. **Commit and deploy.** Nothing is committed. Commits are authored as stevensu04 only, with no AI
   co-author.
2. **The case study (`content/projects/world.md`) is out of date.** It's published copy, so it's left
   unedited. Proposed wording:
   - *summary:* "A small 3D world on this site — a floating island in Brisbane where each building is a
     stop in my career. See it whole from above or walk it in first person; built to stay fast, honest
     and accessible on a phone."
   - *Architecture:* "Next.js 16 · R3F · Kenney CC0 kit batched at load · baked shadows · one shared
     GLSL patch · DOM panels".
   - *solution, first line:* "One small island, seen whole from above or walked at eye level."
   - *"instancing so the whole block draws in 45 calls"* → "static batching so the whole island draws in
     about 80 calls".
   - *"the concept is a wireframe on a blueprint table"* is stale since BrisPulse became a building
     (26 Nov, before 2.0). Drop the clause.
   - Mention day and night, and the tour's journey line, only if wanted.
3. **The ESLint ignore line** above.
4. **Sound** (Phase 4): only if he wants to source licensed audio. If so, it gets a mute toggle, off
   by default.
5. **The sync-conflict copies.** The repo sits in an iCloud-synced Desktop, which keeps creating
   `… 2.ts` copies in `.next/types/` (they break `tsc`; deleted twice, safe to delete again) and the
   untracked `… 2.jpg` / `build-cv 2.py` files in git status. Moving the repo out of the synced folder
   would stop it.

### Release (26 Nov 2026)

- **Committed** as `1b93f7d` on `feat/world-2`, authored as stevensu04 with no AI co-author. Vercel's
  preview built (it sits behind Vercel's login).
- **Fast-forwarded to `main` on Steven's OK and deployed.**
- **Production smoke test** at stevensu-resume.vercel.app/world:
  - *Enter the world* loads the island with its labels.
  - The Shopfront panel opens; Explore and night work.
  - The link-preview image returns 200.
  - No console errors.
  - `/`, `/projects`, `/about`, the World case study and the CV return 200.
- **Follow-ups, the same day, with Steven's approval:**
  - the case study's wording updated to the Phase 5 proposal (without the optional day/night line);
  - `.claude/**` added to ESLint's ignores (`npm run lint` is clean);
  - these status lines.
- **Still open:** real-device checks (Safari, iOS, Android); the optional items in Phase 5's list
  (sound, night tuning, the iCloud-synced folder).

