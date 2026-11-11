# /world — Spec

**What:** a walkable, semi-gamified 3D world at `/world`, where visitors steer Steven's avatar around
one riverside block and learn who he is.
**Status of this doc:** design agreed, nothing built. Written 10 Nov 2026 from a design discussion.
Read alongside `PLAN.md` (positioning, priorities) and `CONTENT.md` (content rules — they apply here
in full).

---

## 0. Decisions already made

| Question | Decision | Why |
| --- | --- | --- |
| Where does it live? | **`/world`, its own route.** `/` is untouched. | `PLAN.md` §9 rejected Three.js on the hero for bundle, LCP and accessibility reasons. A lazy-loaded separate route doesn't contradict that. The recruiter with 45 seconds still gets the fast page. |
| How do you move? | **Steer the avatar**, plus a 60-second guided tour. | Steering is the game feel. The tour is for people who won't steer. Same scene, two drivers. |
| Mobile? | **Full interaction.** Tap-to-move is the primary touch input; a d-pad is secondary. | Tap-to-move behaves the same with a mouse and a finger and doesn't cover the screen. |
| How big? | **One riverside block**, about 80 × 60 m. Not two cities. | One finished block beats three rough districts. Taipei is a backdrop, not a destination. |
| Where do the models come from? | **Kenney, CC0:** City Kit Commercial, Suburban and Roads, plus the Watercraft Kit. A few hand-made blocks fill the gaps. Chosen 11 Nov 2026 after a side-by-side test (§6). | No Meshy subscription. Each kit is shaded through one small palette texture, which is the cheapest route to a consistent art direction for a non-artist. |
| Which avatar? | **The DECO7381 Steven rig**, reused with Team 41's permission. | Rigged, animated and already meshopt-compressed. See §9. |
| Real photos? | **In the Gallery**, unlocked by exploring. | Photos are the reward, never the gate. |
| Confidential projects? | **Generic geometry only**: a shuttered door, frosted glass. | Same rule as `ConfidentialPlaceholder` (`PLAN.md` §13). A modelled screen would be a new disclosure surface. |
| Is it a project? | **Yes, project #9**, with its own case study. | A WebGL scene that is fast, accessible and works with a keyboard is better engineering evidence than anything inside it. |

---

## 1. Why this exists, and the one condition

Three.js already appears in Steven's real work twice: Formosa Bauhaus (DECO7381) and Skyveil Studio
(Veilcore). The world is **evidence for a claim the site already makes**, not a new identity. That's
the only reason worth building it for.

The condition follows from it: **finished, or not shipped.** A janky world argues the opposite of
what it's for. If the art stalls at grey boxes (§13), `/world` stays unlisted until it doesn't.

`PLAN.md` §11 still holds: graduate programs barely read portfolios. This pays off mostly in direct
applications to startups and SMEs, and in interviews he has already reached. It does not outrank
`PLAN.md` §5.

---

## 2. What the visitor experiences

1. **`/world` paints a poster first.** A static isometric render of the block (plain `next/image`),
   the headline, and two buttons: **Take the 60-second tour** and **Walk it yourself**. The WebGL
   bundle only loads on click. A phone visitor who never taps pays almost nothing.
2. **Tour mode.** Steven walks the route himself (the walk animation already exists), the camera
   follows, and the headline card of each zone opens in turn. Next, previous and exit are always
   available. Finishing the tour counts every zone as explored.
3. **Walk mode.** Tap or click the ground and Steven walks there. WASD and arrow keys work on desktop,
   and a d-pad works on touch. Walking into a zone's trigger shows its objects; tap one to open its card.
4. **Always visible, top right:** *Read the CV* and *See all projects*. Never behind a menu.
5. **Bottom left:** the explored counter, `3 of 7`.
6. **The Gallery** fills one photo per explored zone and opens its door at 7 of 7.
7. **The exit noticeboard** is the last stop on the route, and it's reachable any time.

**Never gate information.** Every card can be opened from the first second. Only the photos are a
reward.

---

## 3. The map

```
   ~ ~ ~ ~ ~   Taipei skyline — backdrop, visible, not walkable   ~ ~ ~ ~ ~
   ══════════════════════  Brisbane River  ═══════════════════════════════
   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
   │ 1 Ferry       │ ──► │ 2 UQ corner   │ ──► │ 3 Government  │
   │   landing     │     │               │     │   tower       │
   └───────────────┘     └───────────────┘     └───────┬───────┘
                                                       ▼
   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
   │ 6 Open-source │ ◄── │ 5 Skyveil     │ ◄── │ 4 Building    │
   │   shed        │     │   garage      │     │   site        │
   └───────┬───────┘     └───────────────┘     └───────────────┘
           ▼
   ┌───────────────┐     ┌───────────────┐     ┌───────────────┐
   │ 7 Prototype   │ ──► │   Gallery     │ ──► │   Exit        │
   │   park        │     │   (unlocks)   │     │   noticeboard │
   └───────────────┘     └───────────────┘     └───────────────┘
```

- **Seven content zones** count towards the explorer counter. The Gallery and the exit are
  facilities, not zones. The Gallery can't count towards its own unlock.
- **Scale:** Steven is rigged at 1.72 m. At about 2.2 m/s, the whole route takes 70–90 seconds at
  an easy pace.
- **The snake route is a suggestion, not a rail.** The block is open, so visitors can walk straight to
  any zone. Following it front to back simply tells the career in order.
- **Taipei is past tense only.** The skyline, with Taipei 101 standing over it, and the E.SUN sign
  tell the visitor where he came from.
  Nothing anywhere suggests going back (`PLAN.md` §1, "Not on the site").

| # | Zone | Objects (cards) | Source |
| --- | --- | --- | --- |
| 1 | Ferry landing | E.SUN teller counter · StarLens shuttered door · the crossing | `/about`, `starlens.md`, **new** |
| 2 | UQ corner | Degree · volunteer noticeboard · EventNow stall | `/about`, **mostly new**, `eventnow.md` |
| 3 | Government tower | Finance Forms (frosted, padlocked) | `finance-forms.md` |
| 4 | Building site | Formosa Bauhaus · "one more thing" | `formosa-bauhaus.md`, **new** |
| 5 | Skyveil garage | Veilcore arcade cabinet | `/about` (no project file yet; see §8) |
| 6 | Open-source shed | Eco Router | `eco-router.md` |
| 7 | Prototype park | BrisPulse blueprint table · ParkEase plinth · JourneyMate plinth | the three `.md` files |
| — | Gallery | 7 photos | **new** |
| — | Exit noticeboard | Positioning, availability, work rights, links | `src/lib/site.ts` |

**Easter egg:** one tennis racquet leaning on a fence near the UQ corner (Tamkang Tennis Club
president). Steven reacts to it, and that's all. It has no card and doesn't count.

---

## 4. Honesty grammar

A 3D world makes everything look built. That's the biggest risk in this whole feature, so the
geometry has to say the same thing the status badge says.

| What exists | Geometry | Used for |
| --- | --- | --- |
| Shipped or live | Full building or stall, lit, door open | Eco Router, EventNow |
| Shipped but confidential | Real building, **deliberately opaque**: shuttered, frosted, padlocked | StarLens, Finance Forms |
| In progress | Scaffolding and a crane | Formosa Bauhaus |
| Interactive prototype | **Scale model on a plinth**, not a building | ParkEase, JourneyMate |
| Concept | Blueprint table with a translucent wireframe and no walls | BrisPulse |

Rules:

1. **Geometry is authored per project, not derived from `status.tone`.** The tones don't map cleanly.
   `eventnow.md` is tone `blue` ("Course Project · Solo Build") but it's live and deployed. ParkEase is
   also `blue`, and it's a Figma prototype. The test for every object is that it must never look more
   built than its status label says.
2. **Print `status.label` on every project card, verbatim**, read from the markdown. Geometry can be
   misread. A sentence can't.
3. **No invented interiors and no invented screens.** Confidential objects stay closed.
4. **No recognisable employer branding.** E.SUN's sign is text on a generic facade. There are no
   government crests or real logos. A playful world can't imply an endorsement nobody gave.
   A city landmark is not a brand: Taipei 101 on the far bank implies nobody's endorsement, so
   it is modelled as itself. The rule covers employers and institutions.
5. **If BrisPulse's walking skeleton ships** (`PLAN.md` §5), it moves from the blueprint table to a
   building. That move is the reward for doing the real work.

---

## 5. "Semi-gamified": the complete list

**In:**
- **Explorer counter:** `N of 7`.
- **Light-up on visit:** zones start slightly desaturated and come to full colour once explored, so
  one glance shows what's left. This is the whole delight budget, and it costs almost nothing.
- **Gallery unlock:** one photo per zone, and the door opens at 7 of 7.
- **One easter egg:** the tennis racquet.

**Out, and not to be revisited:** achievements, badges, XP, levels, scores, timers, inventory,
quests, and any gating of facts. Never gamify a credential. "LVL 6.0 GPA" is the failure mode that
ends the conversation. **Make the interaction playful and keep the text plain.**

---

## 6. Art direction

**A diorama on a table.** The block sits on a floating slab with rounded edges and a soft shadow
underneath. All four reference reels use this frame, and it makes everything in the scene read as a
model, the avatar included.

- **Kit first: Kenney.** City Kit Commercial (2.1), Suburban (2.0) and Roads, plus the Watercraft Kit,
  all CC0. Nothing from any other kit family, Kenney's own Nature Kit included (see the comparison
  below). Hand-make only what the kits don't have: noticeboard, blueprint table, three plinths, exit
  sign, shuttered door, scaffolding, crane, river surface, pier, palm trees and the ferry. All of it
  is box-level work in Blender, coloured from the kits' colormaps.
- **Palette:** six colours plus one accent, picked from the kits' colormaps. The accent is the site's
  `blue-600`.
- **Lighting:** bake it, as a lightmap or vertex colours, and use `MeshBasicMaterial`. No real-time
  lights, no shadow maps, no post-processing. This is both the mobile-performance answer and the look
  itself.
- **The avatar must be brought down to the world's style.** The DECO7381 rig carries a photo-derived
  texture, while the kit is flat-shaded. A realistic figure in a cartoon world looks wrong in a way
  visitors feel but can't name. Fix it on the avatar side: flat or toon material (adapt `relight.ts`)
  and a 256 px texture. At isometric distance he's 60–80 px tall on screen, so detail is invisible
  anyway. Never make the world more realistic to match him.
- **Scale:** one Kenney road tile is 8 m (two lanes plus footpaths), so the city kits run at 8 m per
  unit. On that scale a mid-rise is about 10 m and the tallest skyscraper about 33 m. The Watercraft
  Kit uses its own unit, so it is scaled per model.
- **Camera:** orthographic, **pitch locked**, follows the avatar. Azimuth turns only in 90° steps,
  from two buttons or Q/E. Free orbit destroys the isometric look within seconds.
- **Occlusion:** when a building hides Steven, fade it. A visitor notices this immediately if it's
  missing.
- **Idle motion is what makes it alive,** more than polygon count: water swell (vertex shader), trees
  swaying, the crane turning slowly, the arcade screen flickering, a ferry crossing every ~30 s. All
  of it is cheap. All of it stops under `prefers-reduced-motion`.

### Kit comparison (11 Nov 2026)

All three candidates went side by side on a local test page, at the same real-world scale and
through the §6 camera, with `MeshBasicMaterial` standing in for the shipped look.

| | Kenney City Kit ×3 + Watercraft | KayKit City Builder Bits (free) | Quaternius Downtown City MegaKit |
| --- | --- | --- | --- |
| Format | GLB, external `Textures/colormap.png` | glTF + `.bin` | glTF |
| Texture | One 512 px colormap per kit, four in all | One 1024 px gradient atlas | "Shared texture sets" |
| Unlit | Holds up: the shading is painted into the colormap | Holds up, for the same reason | Not tested |
| Coverage | Skyscrapers, low-detail backdrop towers, bridge and pillars, construction fence and cones, houses, fences, two trees, boats, buoys | 8 low-rise buildings (tallest ~12 m), roads, cars, props, one bush. No trees, water, boats or towers. The park is in the paid EXTRA. | 315 modular pieces; buildings are assembled wall by wall |
| Size | 25 models in the test, 11,074 tris | 13 models, 7,201 tris; the whole free set is 1.7 MB | The free zip alone is 223 MB |

- **Kenney wins on coverage.** It's the only family that covers zones ①, ③ and ④ (boats, towers,
  a building site) without leaving the family.
- **Kenney's Nature Kit is out.** It has no texture: each model has two to four flat PBR colours,
  designed to be lit. Rendered unlit, it goes pastel and flat next to the city kits. The river tiles
  and palms are what it would have added, and they're cheaper to hand-make than to rebake. Use
  Suburban's `tree-large` and `tree-small` instead.
- **No ferry in the Watercraft Kit looks like a CityCat.** The ocean liners read as the Titanic.
  Hand-make a small catamaran, or adapt `boat-speed-*`.
- **Four colormaps, not one.** Either merge them into one atlas in the `gltf-transform` step, or
  accept four materials. That's four draw calls once merged per material, well inside the < 80 budget.
- **Source files:** `kenney_city-kit-commercial_2.1.zip`, `kenney_city-kit-suburban_20.zip`,
  `kenney_city-kit-roads.zip` and `kenney_watercraft-pack.zip` from kenney.nl. They stay out of the repo.
  Only the processed GLBs in `public/world/` get committed. kenney.nl refuses non-browser downloads, so
  fetch them by hand.

---

## 7. Card copy

### Card anatomy

- **Line 1:** name · `status.label` for projects; org · role or place · dates for career cards.
- **Body:** at most three sentences, ~45–60 words, first person, the way he'd say it in an interview.
- **Last sentence states the boundary**, where one exists ("proposed, not built", "nothing is wired to
  a sensor", "the glass stays frosted"). Drawing your own line reads as knowing where it is.
- **One link out**, to the real content.
- **No sentence copied from `/projects` or `/about`.** These are the same facts told another way. The
  only repeated line on the whole site is `site.summary`, and it appears once, on the exit noticeboard.
- **Banned words** from `PLAN.md` §1 still apply: no "student", "passionate about" or "freelancer".
  "UQ Graduate Union of Taiwanese Students" is a proper noun and is fine.

### 1 · Ferry landing

> **E.SUN Commercial Bank** · Taipei · Aug 2022 – Apr 2024
> Two years on the customer side of workflows somebody else had designed. I worked with the digital
> banking team to fix the worst of them and cut client wait times by 10%. Then I decided I'd rather
> build them than work around them.
> → See the full timeline

> **StarLens** · Shipped in Production
> Taiwan's green-power trading desk ran on scattered Excel exports and manual crawls. Four weeks, team
> of two: I built nightly Airflow pipelines into MongoDB and took page latency from 4s to under 2s.
> The interface is proprietary, so this door stays shut.
> → Read the case study

> **The crossing** · Taipei → Brisbane
> Banking was stable and structured, and after a while it stopped pulling me forward — so I went
> looking for what would. Once I threw myself into learning IT, I found opportunity and challenge in
> equal measure. The AI era began while I was still at the bank, and I sensed it would start
> replacing the work people do. So I moved to the side that builds it — and that sense keeps
> proving right.

This is the only card on the site that isn't on the CV, and it answers the question interviewers
actually ask. It's translated from Steven's own three points (10 Nov 2026), plus an ending he
approved. At four sentences and ~73 words it's over the card limits, which this one card earns.

- **"while I was still at the bank"** comes from the dates. E.SUN ran Aug 2022 – Apr 2024, which
  spans ChatGPT's launch in Nov 2022, so he saw the shift from inside the industry it was coming for.
- **危機感 means AI replacing people.** Steven confirmed this on 10 Nov 2026. It's rendered as
  "replacing the work people do" rather than "replacing people". The meaning is the same, but on a
  page asking to be hired it reads as an observation, not alarm.
- **"So I moved to the side that builds it"** was added with Steven's approval. It answers "won't AI
  replace developers too?" before anyone asks, and it sets up `site.summary` on the exit board ("I
  write the code that replaces it").
- The word "passion" is deliberately absent. `PLAN.md` §1 bans "passionate about", and "it stopped
  pulling me forward" shows the same thing without the cliché.

### 2 · UQ corner

> **Master of Information Technology** · The University of Queensland · Feb 2025 – Nov 2026
> GPA 6.0/7.0, Distinction average. Databases, HCI, cloud, algorithms, information retrieval.
> Graduating November 2026.
> → Education

> **Off the timetable**
> Vice President of the UQ Graduate Union of Taiwanese Students — strategic planning for 100+ members
> and the university liaison work nobody volunteers for. Social media coordinator for the Australia
> Career Forum, writing the copy that filled rooms of 50+. Both taught me more about stakeholders than
> any course did.
> → Activities

> **EventNow** · Course Project · Solo Build
> Small Brisbane organisers juggle listings, registrations and attendee lists across separate tools.
> EventNow does the lot — type "tech meetup at Fortitude Valley next Friday for 80 people" and an
> agentic parser fills the form, constrained to real venues. Django, HTMX, DRF, Postgres, built solo.
> → Try the demo

### 3 · Government tower

> **Finance Forms Automation** · Shipped in Production
> The department processed invoices on paper, so validation depended on whoever happened to be
> looking. I built the digital approval workflow on Power Apps, Power Automate and SharePoint —
> projected to cut processing time by 30%. It's a government interface, so the glass stays frosted.
> → Read the case study

### 4 · Building site

> **Formosa Bauhaus** · In Progress · Capstone
> Single-image 3D generators turn one product photo into a whole mesh, so most of what a shopper
> rotates was never photographed — it was inferred. Our storefront labels which surfaces came from
> evidence and which the AI invented. Team of six; I built the merchant console and joined it to the
> live backend.
> → Read the case study

> **One more thing**
> The version of me you're walking around came out of this project.

### 5 · Skyveil garage

> **Skyveil Studio** · Co-founder · Aug 2026 – Present
> An independent studio making hand-tracked browser games — webcam in, no controller, no download.
> For our first title, Veilcore, I built the shrinking-target practice mode, the Cradle mini-game and
> the Gauntlet leaderboard. Built with MediaPipe and Three.js — the second of which you're standing in.
> → See the experience

### 6 · Open-source shed

> **Eco Router** · Open Source · v0.1 on npm
> The same GPU job emits several times more CO₂ depending on which grid powers the datacentre, but
> region pickers only show price and latency. Eco Router maps all 134 AWS, Google Cloud and Azure
> regions to their grids so an agent can ask which is cleanest. The source is public — that's the
> point of this one.
> → Read the source on GitHub

### 7 · Prototype park

> **BrisPulse** · Capstone · Concept & Design
> Mapping tools optimise travel time and ignore how crowded a station exit feels. I scoped the system,
> designed the data architecture and prototyped the interface — including spatial-equity guardrails,
> so a "calmer" route never redistributes crowds onto residential streets. The Django and
> GTFS-Realtime stack is proposed, not built.
> → Read the case study

> **ParkEase** · Interactive Prototype
> 86% of the drivers we surveyed at UQ St Lucia and Toowong reported high frustration finding a park.
> Four weeks, three designers: I ran the heuristic evaluation and the usability testing, and designed
> the interface. It's a Figma prototype — clickable, but nothing is wired to a sensor.
> → Open the prototype

> **JourneyMate** · Interactive Prototype
> Travel planning is spread across five or more apps. JourneyMate puts it in one, with a token
> economy — you earn tokens by checking in daily, and they meter what the AI costs to run. Vanilla
> JavaScript, built in the UQ Ventures program.
> → Open the demo

### Gallery

Door, while locked:

> **The gallery**
> Seven places, seven photographs. Opens at 7 of 7.

One line per photo. These captions show the register. Steven supplies the photos and final wording.

> *Headshot* — "This is me. Hello."
> *Tennis* — "Tennis Club president at Tamkang. Still play. Still lose to the same people."
> *Track* — "School team, track and field."
> *GUTS* — "The committee, 2026."
> *Brisbane* — "First week here, February 2025."

### Exit noticeboard

> **Before you go**
> I came from banking, so I ask why the workflow exists before I write the code that replaces it.
> Graduating Nov 2026 · Available for 2027 graduate programs · ⟨work rights⟩
> → Download the CV  → Email  → LinkedIn  → GitHub

`⟨work rights⟩` reads `site.workRights`, which is currently `null`, and the clause is omitted while
it is. Visitors who reach this board are the most likely to get in touch, so leaving the line empty
costs more here than anywhere else on the site.

---

## 8. Where the content lives

The world is **a view over existing content, not a second copy of it.** It follows the same
single-source rule as `CONTENT.md`.

- **Project cards:** add an optional `world` block to the project front matter, validated by
  `src/lib/project-schema.ts` in the same fail-loudly way as everything else:
  ```yaml
  world:
    zone: open-source-shed
    card: |
      The same GPU job emits several times more CO₂ ...
  ```
  `title`, `status.label` and the links come from the existing fields, so they can't drift.
- **Everything else** (career cards, noticeboard, crossing, gallery captions, exit) goes in
  `src/lib/world.ts`, a single source like `site.ts`.
- **Skyveil has no project file.** Its card currently has nothing to read from, so its link points to
  `/about#experience`. Adding `content/projects/veilcore.md` would fix this properly and give the most
  Three.js-relevant work its own entry. **Recommended.**
- **Links out need routes to land on.** Every "Read the case study" wants `/projects/[slug]`
  (`PLAN.md` §6). Until that exists, cards open `/projects` and the visitor has to find the card
  again.

### New content Steven has to produce

| Item | Size |
| --- | --- |
| The crossing: why he left banking | **Done** (§7), from Steven's own three points |
| Noticeboard copy | Draft above; he adjusts the tone |
| Seven photos and seven captions | The real time cost is digging through albums |
| `site.workRights` | One line |
| Veilcore: is it publicly playable, and does it get a `veilcore.md`? | One decision |
| Formosa Bauhaus console screenshot | `formosa-bauhaus.md` still has no `img`, and its "before the 26 Oct showcase" note is now overdue |

About 700 words of English in total, roughly half a focused day. The photos will take longer than the
writing.

---

## 9. Technical architecture

Verified against `node_modules/next/dist/docs/` and the installed tree on 10 Nov 2026. Version numbers
were checked against npm on the same day.

### Stack

```
three@0.187.0
@react-three/fiber@9.8.2
@react-three/drei@10.7.9        deep imports only
@gltf-transform/cli             devDependency, offline asset step
```

- **R3F 9.8.x bundles its own reconciler.** Don't install `react-reconciler`. Its peer range is
  `react >=19 <19.4`, which the declared `19.2.4` satisfies.
- **The App Router runs Next's vendored React** (`19.3.0-canary`, aliased in
  `node_modules/next/dist/build/create-compiler-aliases.js`), not the `react@19.2.4` in
  `package.json`. The internals symbol R3F depends on exists in both builds. The risk is low but not
  zero, which is why M0 exists.
- **React Compiler is on** (`reactCompiler: true`). It doesn't conflict with R3F, because mutations
  in `useFrame` happen outside render. If a component misbehaves, opt it out with `"use no memo"`.
  Don't switch the whole site to annotation mode.
- **Turbopack is the default for dev and build.** Adding a `webpack` key makes `next build` fail.
  Configure anything extra under `turbopack`.
- **`drei` barrel imports can add 200 kB+.** Add `three` and `@react-three/drei` to
  `experimental.optimizePackageImports`, and still import deep paths by hand.

### Route shape

```
src/app/world/page.tsx      Server Component — exports metadata, renders the shell
  └─ WorldShell.tsx         "use client" — dynamic(() => import('./Scene'),
                              { ssr: false, loading: () => <Poster/> })
       └─ Scene.tsx         <Canvas> and everything 3D
```

That order is required. `ssr: false` isn't allowed in a Server Component
(`01-app/02-guides/lazy-loading.md`), and the same doc notes automatic code splitting isn't supported
when a Server Component dynamically imports a Client Component. `ssr: false` also removes every
hydration hazard: `document`, `devicePixelRatio`, measured canvas size and unseeded randomness. Keep
three out of `src/app/page.tsx`. It's already `"use client"`, so any import there pulls the library
into the homepage chunk.

### Interaction

- **Picking:** R3F's `onClick` and `onPointerOver` on meshes. No manual `Raycaster`. Set
  `raycast = null` on scenery so only the ~15 interactive objects are tested.
- **Cards are real DOM**, positioned from `vector.project(camera)` in `useFrame`. Don't use drei's
  `<Html transform>`, which throws away selection, focus order and the accessibility tree.
- **Movement:** a kinematic controller on the XZ plane, clamped to a hand-authored walkable polygon.
  Tap-to-move raycasts the ground plane and walks a straight line, which is enough for an open block.
  **No physics engine.** Rapier's ~600 kB of WASM would solve a problem this world doesn't have.

### Reused from DECO7381 (with Team 41's permission)

Paths are relative to `DECO7381/team-41-formosa-bauhaus/src/prototype/`. Credit Team 41 in each
ported file's header comment and in the case study.

| File | Reuse | What changes |
| --- | --- | --- |
| `public/models/steven/optimised/*.glb` | The avatar | See the size note below |
| `src/storefront/scene/StevenCharacter.tsx` | Nearly as-is: clip cross-fade, SkeletonUtils clone, hidden until posed | Drop the `../../auth/body` dependency and use the fixed rig body |
| `src/storefront/scene/clipScale.ts` | As-is | — |
| `src/storefront/scene/relight.ts` | Adapted | Flat or toon instead of relit PBR, to match the kit (§6) |
| `src/storefront/scene/JourneyController.tsx` | **Input layer only**: key map, pointer capture, `AvatarMotion` state, `AvatarBoundary` | Its layout (`mallLayout`, `forestLayout`), `journey`, `gardenSound` and camera imports are all replaced |
| `src/storefront/Storefront.tsx` (`storefront__touch`) | The d-pad buttons, as the secondary touch input | Tap-to-move is new code |
| `src/storefront/scene/cameraMode.ts` | **Not reused** | Written for a perspective follow and first-person camera. This world is orthographic. |
| `secret-garden.glb` (18 MB), `garden-walk.glb` (12 MB), `daylight.hdr` (6.9 MB) | **Not reused** | Far too heavy for mobile, and the wrong art style |

**Avatar size note.** All six optimised GLBs embed the full 28k-triangle mesh and its WebP texture,
roughly 1.1 MB each. `StevenCharacter` loads four of them (rigged, idle, walk, run), about **4.4 MB, of
which ~3.3 MB is duplicate**. Fix it with one offline `gltf-transform` pass: keep the mesh only in the
rigged file and strip mesh and texture from the three clip files. Expected total is ~1.1 MB plus small
clip files, but **measure it after the pass**. Reducing to 256 px for the flat look (§6) shrinks it
further.

### Performance budget

| Item | Budget |
| --- | --- |
| `/` and `/projects` first-load JS | **Unchanged.** If either moves, something leaked. |
| `/world` JS on top of the ~200 kB every route shares | ≤ 350 kB gzip (M0 measured ~233 kB) |
| Scene GLB | ≤ 1.5 MB target, 2.5 MB hard ceiling |
| Avatar (after the fix above) | ~1.2 MB |
| Draw calls / triangles | < 80 / < 150k |
| Mid-range Android | 45–60 fps, `dpr={[1, 1.5]}` |
| Poster paint | < 1.5 s |
| Interactive on 4G | ≤ 4.5 s |

The JS rows are measured from M0 onwards (§11). The rest are still planning estimates. **`next build`
no longer prints per-route sizes.** Next 16 removed them (`02-guides/upgrading/version-16.md`), so
measure in the browser instead: run `next start`, load each route, and sum the Resource Timing
`encodedBodySize` of its scripts.

**Assets:** **meshopt over Draco**, because its decoder is smaller and faster on weak ARM cores, and
low-poly models gain little from Draco. The output goes into `public/world/`. Scenery repeats use
`InstancedMesh`. Load in this order: poster, then ground and buildings, then props and the avatar
behind a second `Suspense` boundary.

- **Kit:** `npm run world:kit` (`scripts/build-world-kit.mjs`) reads the four Kenney zips from
  `~/Downloads`, or from a path you pass it. It keeps only the models the block uses and writes
  `public/world/kit.glb`: one named node per model, run through `dedup`, `prune`, `weld`, `reorder`,
  `quantize` and meshopt. Rerun it whenever `placements.ts` needs a model that isn't in the kit yet.

---

## 10. Accessibility and fallbacks: non-negotiable

This site claims HCI credibility. A 3D world that fails here undoes it.

- **Nothing exists only in the world** except the crossing, the noticeboard copy and the Gallery
  photos. Those three should also appear on `/about`, so that losing the canvas loses nothing.
  **The crossing is done:** on 10 Nov 2026, `/about`'s "This sparked my passion…" sentence was
  replaced with a shorter version of it, worded differently so the card isn't a copy (§7).
- **Keyboard:** Tab cycles objects in route order with a visible focus ring, and the camera eases to
  each one. Enter opens, Escape closes, arrows and WASD move, Q and E rotate the view. The open card
  traps focus.
- **Screen readers:** the canvas is `aria-hidden`. Underneath it sits a real ordered list of zones and
  cards as links and buttons.
- **`prefers-reduced-motion`:** no idle motion, no camera easing, no ferry. The tour becomes a stepper
  with cuts, and the avatar stays in idle.
- **No WebGL2:** probe `canvas.getContext('webgl2')` before mounting. If it fails, stay on the poster
  and render the zone list as cards underneath. The site's browser baseline (Chrome 111+, Safari 16.4+)
  has WebGL2 throughout, so this mostly catches blocked GPUs.
- **Slow device:** an FPS watchdog falls back to the poster after a few bad seconds. Pause the render
  loop on `visibilitychange` and when the canvas leaves the viewport.
- **Sound** is off by default, with a toggle. Never autoplay.

---

## 11. Milestones

Planning numbers for AI-assisted part-time work. M3 is smaller than a from-scratch estimate because of
the reuse in §9.

| | Milestone | Hours |
| --- | --- | --- |
| **M0** | **Gate.** A `<Canvas>` renders a spinning cube on `/world` under Turbopack and the React Compiler. A click fires. Prod build and Vercel deploy are green. Measure per-route JS in the browser (§9). | 4–6 |
| M1 | Ortho camera, slab, placeholder blocks, tap-to-move on a flat plane, click opens a DOM card | 10–14 |
| M2 | Scene built from the kit, palette, baked light, idle motion | 15–25 |
| M3 | Avatar ported, clip-only GLBs, flat relight, keyboard + d-pad + tap-to-move | 6–10 |
| M4 | `world` schema field, `world.ts`, all cards, tour, counter, Gallery unlock | 8–12 |
| M5 | Mobile performance pass, fallbacks, keyboard, screen reader, reduced motion | 12–18 |
| M6 | Occlusion fade, easter egg, sound toggle, case study write-up | 8–12 |
| | **Total** | **~63–97** |

### M0 results (11 Nov 2026)

**Passed locally.** `src/app/world/` has the Server page, the client shell with `ssr: false`, and a
spinning cube. These are script bytes, gzip, measured on `next start` in the browser:

| Route | Before | After |
| --- | --- | --- |
| `/` | 210.0 kB | 210.0 kB |
| `/projects` | 199.8 kB | 199.8 kB |
| `/about` | 199.4 kB | 199.4 kB |
| `/world` | — | 432.7 kB in total. One 238.1 kB chunk (904 kB raw) is three + R3F. |

- R3F renders under the vendored React canary with the compiler on. `useFrame` animates. Clicking the
  cube counts, and clicking empty space doesn't. The `dpr` clamp holds: a 1024 px canvas gets a
  1536 px backing store.
- The three + R3F chunk falls inside the §3 estimate of 215–250 kB. Its size is consistent with R3F
  pulling in the whole three namespace, so `optimizePackageImports` for `three` probably won't shrink
  it. Revisit in M5 only if the budget gets tight.
- `@react-three/drei` isn't installed yet because M0 didn't need it. Add it when M1 needs a specific
  helper, and use deep imports only.
- Pinned: `three@0.187.0`, `@react-three/fiber@9.8.2`, `@types/three@0.187.0`. No `react-reconciler`
  was hoisted, and `npm audit` flags nothing new from them.
- One console warning, `THREE.Clock: This module has been deprecated`. It comes from R3F's internals
  on three 0.187, not this code. It's harmless and will go away when R3F moves to `THREE.Timer`.
- **Vercel:** deployed from `988151b` and checked live. The cube renders, clicks count, the page is
  `noindex, nofollow`, and the console is clean.
- **Not yet verified:** the reduced-motion branch (the test browser can't emulate the media query) and
  a real phone.

**Asset kit decided: Kenney** (§6). Ship M1 behind the unlisted URL within the first week, so something
real exists on the internet early.

### M1 results (11 Nov 2026)

**Passed locally**, in dev and on `next start`. The parts:

- `zones.ts`: the §3 layout as data (metres, +z away from the river), plus the slab, river and walkable
  bounds.
- `scene/Stage.tsx`: the slab, river, Taipei skyline and one grey block per zone.
- `scene/Player.tsx`: the kinematic walk and the camera rig.
- `scene/CardAnchor.tsx`: projects the open zone onto its DOM card.
- `scene/shading.ts`: boxes whose faces carry fixed light in vertex colours, so even the placeholders
  use `MeshBasicMaterial` with no real-time light (§6).

What works:

- Tap or click the ground and Steven walks there at 2.2 m/s. Clicking the river clamps the target to
  the bank.
- Tap a block and its card opens at once while he walks over (§2: never gate information).
- Focus moves to the card's close button. Escape or tapping the ground closes the card.
- Q, E and two buttons rotate the view in 90° steps, with easing. Under reduced motion there is no
  easing and he moves instantly.
- On `sm` and up the card is pinned above its block. On a phone it is a bottom sheet.

Bundle:

- `/`, `/projects` and `/about` load byte-identical chunks to the M0 build (same hashes). To check
  this, M1 was stashed, M0 rebuilt, and the two compared.
- `/world` totals 446.7 kB against the shared 201.7 kB, so it adds about 245 kB, still inside the
  350 kB budget. All the world code lives in the three + R3F chunk (247 kB gzip).
- **Measure on a second navigation.** The first page load after `next start` over-counted by about
  13 kB, and that is where M0's 210.0 kB came from. The real shared baseline is 201.7 kB.

Decisions made while building:

- **The skyline hides when the camera looks from the river side** (azimuth steps 1 and 2). From there
  it would stand between the camera and the block, and a backdrop only works behind.
- **Zoom:** about 48 m across on a desktop, so Steven is about 37 px tall. Pixels per metre never drop
  below 14, so on a phone he stays about 24 px tall, and the camera follows him. That is shorter than
  §6's 60–80 px, which was a texture-budget estimate. Revisit with the real avatar in M3.
- **Walkable area is a rectangle** for now. The polygon arrives with the real buildings in M2.

Not in M1, per §11: the poster (cards render once the scene loads), the counter, the tour, real card
copy (M4), WASD and d-pad (M3), the screen-reader list and focus trap (M5).

### M2 results (11 Nov 2026)

**Passed locally** in dev and on `next start`. The grey blocks are gone. The block is now built from
the Kenney kit plus hand-made props.

- **`public/world/kit.glb`:** 36 models in 4 materials (one colormap per kit). The file is 291 KiB,
  and 153 kB goes over the wire with gzip. That's about a tenth of the 1.5 MB scene budget.
- **`placements.ts`:** every model placement, in metres. A placement names a model, its centre and
  quarter turns. The kit's own bounding box stands the model on the ground and gives its collision
  footprint. The file can't be called `layout.ts`, because Next would treat that as the route's
  layout.
- **`scene/KitInstances.tsx`:** one `InstancedMesh` per model part. **`scene/Props.tsx`:** the
  hand-made parts.
  - Pier, CityCat-style ferry, StarLens shutter, frosted door with padlock, volunteer and exit
    noticeboards, building-site core with scaffolding and crane, arcade cabinet, park grass, blueprint
    table and two plinths.
  - Every static box is merged into one mesh, with colour and light both baked into vertex colours.
- **Honesty grammar (§4) in geometry:**
  - EventNow and Eco Router: open, full buildings.
  - StarLens: shuttered. Finance Forms: frosted and padlocked.
  - Formosa Bauhaus: a concrete core, scaffolding and a crane.
  - ParkEase and JourneyMate: scale models on plinths.
  - BrisPulse: a translucent wireframe on a blueprint table.
- **Idle motion (§6):**
  - The river swells in a vertex shader.
  - A ferry crosses every 30 s and spends 8 s at the pier.
  - The crane's jib turns, and the arcade screen flickers softly.
  - All of it stops under reduced motion.
  - Trees don't sway yet. They're instanced, so swaying needs a shader. That's left for M6.
- **Walking:** Steven slides round building and prop footprints, can walk out onto the pier, and
  clicking the river clamps his target to the bank. Tapping a zone opens its card and walks him to a
  point just south of it.
- **Taipei** uses Kenney's 188-triangle low-detail towers, scaled, tinted towards the sky, and set
  further back. It still hides when the camera faces it from the river side.
- **Loading:** a "Loading the block…" status shows until the kit has mounted.

Measured:

| | Budget (§9) | M2 |
| --- | --- | --- |
| Draw calls | < 80 | 45, down from 91 before the props were merged |
| Triangles | < 150k | 23,179 |
| Scene GLB | ≤ 1.5 MB | 291 KiB (153 kB over the wire) |
| `/world` JS on top of shared | ≤ 350 kB | ~271 kB (472.6 vs 201.7). GLTFLoader and the meshopt decoder added ~26 kB. |
| `/`, `/projects`, `/about` | unchanged | `/` is still 201.7 kB |

Not yet:

- The E.SUN sign text and any lettering. That needs a font, and comes with the M4 cards.
- Zone light-up on visit (M4), occlusion fade (M6) and the racquet on its fence (M6).
- A real phone. The FPS numbers on a mid-range Android are the open M5 question.

### M3 results (11 Nov 2026)

**Passed locally** in dev and on `next start`. The blue box is gone and Steven walks the block.

- **`public/world/steven.glb`** is built by `npm run world:avatar` (`scripts/build-world-avatar.mjs`)
  from the DECO7381 optimised GLBs.
  - It keeps one copy of the mesh and moves the Idle, Walk and Run clips onto that skeleton, matching
    bones by name.
  - The mesh is simplified from 28,166 to 9,310 triangles. UV seams stop it going lower.
  - The texture is now a 256 px JPEG instead of a 2048 px WebP.
  - **Result: 340 KiB, and 250 kB over the wire, against the 4.4 MB the storefront loaded.** Gzip
    barely helps because the data is already meshopt-compressed.
  - The texture step uses macOS `sips`, so the script is macOS-only. That's fine for a one-off asset
    step.
- **`scene/Avatar.tsx`** adapts Team 41's `StevenCharacter`. It keeps the clip cross-fade and the
  rule that he stays hidden until posed. What changed:
  - `useLoader` and a plain `AnimationMixer` replace drei, so drei is still not installed.
  - The material is a flat `MeshBasicMaterial`, so the relight step is no longer needed.
  - It uses the fixed rig body.
  - `clipScale.ts` is ported unchanged, so he no longer grows 18 cm when he stops.
- **Figure scale is 1.2**, so he stands about 2 m tall against Kenney's ~2.5 m doors. A soft contact
  shadow sits under him, because a light-clothed figure on light pavement disappeared without one.
- **Camera zoom:** about 34 m across on a desktop, so he's ~55 px tall, close to §6's 60–80 px. The
  floor is 16 px/m on phones, where he's ~30 px tall.
- **Input:**
  - Tap-to-move works as before. A tap more than 14 m away makes him run at 4.4 m/s instead of
    walking at 2.2 m/s.
  - WASD and the arrow keys move relative to the view, and Shift runs. A held key cancels any tap
    target. Arrow keys no longer scroll the page.
  - Releasing keys on window blur stops him, so he doesn't keep walking.
  - On coarse pointers there's a d-pad, Team 41's `storefront__touch` buttons with pointer capture.
- **Fallback:** while `steven.glb` loads, the old box stands in. An error boundary, Team 41's
  `AvatarBoundary`, keeps the box if the file fails.
- **Reduced motion:** he holds the first frame of Idle and moves without a walk cycle.

Measured:

| | Budget (§9) | M3 |
| --- | --- | --- |
| Avatar | ~1.2 MB | 340 KiB, 250 kB over the wire |
| Scene GLBs total | ≤ 1.5 MB | 627 KiB (kit + avatar), 403 kB over the wire |
| `/world` JS on top of shared | ≤ 350 kB | ~290 kB (491.7 vs 201.7). SkeletonUtils and the avatar code added ~19 kB. **About 60 kB of headroom is left.** |
| `/`, `/projects`, `/about` | unchanged | `/` is still 201.7 kB |

Not yet:

- **Walk-cycle speed versus ground speed.** The clips play at their authored rate. At 2.2 m/s his
  feet slide a little. Tune `timeScale` per clip once it can be watched on a real screen at 60 fps.
- The camera doesn't ease on Tab between objects yet. That's M5's keyboard pass.
- A real phone, still.

### M4 results (11 Nov 2026)

**Passed locally** in dev and on `next start`. The world now says something.

- **Content is single-source (§8).**
  - The eight project cards live in each project's front matter as `world: { zone, link, linkLabel,
    card }`. `projects.ts` validates them: the zone and link kind must be known, the linked URL
    must exist, and the body must be 75 words or fewer.
  - The other eight cards live in `src/lib/world.ts`: E.SUN, the crossing, the degree, off the
    timetable, one more thing, Skyveil, the Gallery and the exit.
  - The server page joins both sets and **fails the build** if a card has no object or an object
    has no card. `CONTENT.md` documents the field.
- **Tapping an object opens its card.** `objects.ts` places 16 tappable objects, one per card, over
  the model or prop that stands for it. Zones are no longer tappable as a whole.
  - Each card follows the §7 anatomy: name · status or org line, body, one way out.
  - External links open in a new tab and say so to screen readers.
- **The explorer counter** sits bottom left (`3 of 7 explored`). A zone counts as explored when
  Steven walks into it (with 2 m of slack) or when one of its cards is opened.
- **Light-up on visit (§5)** comes from one shader patch, `scene/explore.ts`, on the four kit
  materials and the merged props.
  - Inside an unexplored zone, colour is pulled 70% towards grey. It fades to full colour over
    about 0.8 s, or instantly under reduced motion.
  - The street, trees outside zones and the skyline stay in colour.
- **The Gallery unlocks at 7 of 7.** It shows seven slots with the draft captions from §7. The photos
  are `null` until Steven supplies them, and each empty slot says "Photo to come".
- **The exit board** shows `site.summary`, the availability line, and CV, Email, LinkedIn and GitHub
  links. `site.workRights` is still `null`, so that clause is left out.
- **The intro** appears once the block loads, with two buttons: *Take the one-minute tour* and *Walk
  it yourself*.
- **The tour** has nine stops: the crossing, degree, Finance Forms, Formosa Bauhaus, Skyveil, Eco
  Router, BrisPulse, the Gallery and the exit.
  - Steven moves at 1.4× pace, with the walk cycle sped up to match. Each stop holds 3 s after he
    arrives. The estimate is about 64 s, so the button says "one-minute", not "60-second".
  - Previous, Pause, Next and Exit are always there (WCAG 2.2.2).
  - Tapping the ground or pressing a movement key ends the tour.
  - Finishing it explores every zone. Under reduced motion it becomes a stepper with no
    auto-advance.
- **Top right, always:** *Read the CV* and *All projects*, shortened to *CV* and *Projects* on phones.
  On phones the controls stack in two rows.

Measured:

- `/world` JS is 494.8 kB, so M4 added about 3 kB, and **about 57 kB of headroom is left.**
- `/` is 201.7 kB and `/projects` is 204.5 kB, both unchanged. The `world` types added to
  `project-schema.ts` are constants only.

Still open. All of it is content, not code:

1. **Seven Gallery photos** and their final captions (`GALLERY_PHOTOS` in `src/lib/world.ts`).
2. **`site.workRights`**, shown on the exit board.
3. **Veilcore** (§14 Q1). Skyveil's card links to `/about#experience` until there's a project file.
4. **`/projects/[slug]`** (`PLAN.md` §6). Every "Read the case study" link lands on `/projects`
   until that route exists.
5. The E.SUN sign lettering, carried over from M2.

### M5 results (11 Nov 2026)

**Passed locally** in dev and on `next start`. Each item below checks off a §10 or §2 requirement.

- **Poster first (§2.1).** `/world` now opens on a still of the block with the headline and three
  ways in: *Take the one-minute tour*, *Walk it yourself*, and *Rather read it as a list?*. **No
  three.js is downloaded until a button is pressed.**
  - The poster is `src/app/world/poster.webp`, 2560 × 1600 and 92 kB. `next/image` serves it at
    about 47 kB.
  - The page itself costs 208.1 kB of JS against the shared 201.7 kB, about 6 kB extra.
  - Once a button is pressed, the poster stays behind the transparent canvas until the block has
    loaded, so nothing flashes.
  - **Re-render the poster whenever the block changes:**
    1. Open `/world?poster` in `npm run dev`. That mode is development-only: the whole block, full
       colour, nothing moving, no UI, `preserveDrawingBuffer` on.
    2. Size the window to about 1280 × 880.
    3. Composite the canvas onto `#eef1f5` and save it as WebP over the old poster.
- **WebGL2 probe (§10).** It runs on the button press. If it fails, the visitor stays on the poster and
  gets the list.
- **The list (§10).** `WorldList.tsx` is always in the DOM: an ordered list of the 9 zones and all 16
  cards in route order, with the full copy and links. While the scene runs it's `sr-only` and the
  canvas is `aria-hidden`, so this is what a screen reader reads. With no WebGL, a slow device or a
  visitor who chose it, the list becomes visible, scrolls into view and takes focus.
- **Keyboard (§10).** Tab walks the 16 objects in route order. The camera eases to each one and a
  blue ring marks it.
  - Enter opens the card. Focus moves into the card and Tab is trapped inside it.
  - Escape closes it and returns focus to the object.
  - Arrows/WASD, Shift, and Q/E work as before.
  - Verified with real key presses on Finance Forms.
- **Pause when unseen (§10).** `frameloop` is `never` while the tab is hidden or the scene has
  scrolled out of view, checked with IntersectionObserver plus `visibilitychange`.
- **Slow device (§10).** A watchdog in the canvas works in two steps:
  - It waits 3 s, then averages fps over 4 s, ignoring gaps over 250 ms.
  - Under 30 fps it drops the pixel ratio to 1. If the next window is still under 20 fps, it swaps
    the scene for the list, which offers *Try the 3D view anyway*.
  - **The thresholds are guesses until a mid-range Android has been measured (§14 Q5).**
- **Reduced motion:** unchanged from M2–M4. Nothing idles, the camera cuts, he holds Idle, and the
  tour is a stepper.

Not verified:

- **A real phone, a real screen reader, and the OS reduced-motion setting.** The test browser can
  emulate none of them faithfully.
- The watchdog's fallback. It can't be triggered without a genuinely slow GPU.
- First-paint timings. The test pane runs in the background and throttles frames, so its LCP
  numbers mean nothing. Measure on Vercel from a phone, against §9's poster < 1.5 s budget.

### M6 results (11 Nov 2026)

**Passed locally** in dev and on `next start`. This was the last build milestone. What's left before
`/world` is listed is content and a phone (see "To launch" below).

- **One shared shader, three jobs.** `scene/explore.ts` became `scene/worldShader.ts`. It is still
  one patch on the kit materials and the merged props, and still adds no draw calls.
  - **Light-up on visit**, as in M4.
  - **Occlusion fade (§6).** A fragment nearer the camera than Steven and within ~2.4 m of him on
    screen is dithered away in a soft-edged circle. When he walks behind a building he shows through
    it. Verified behind StarLens. It works per-fragment, so it works across instancing, where fading
    whole objects couldn't.
  - **Tree sway.** Trees get their own copy of the kit material with `WORLD_SWAY` on: a slow lean that
    grows with height and is offset per instance. It stops under reduced motion along with
    everything else.
- **The easter egg (§3).** A red racquet leans on the fence by the UQ corner. When Steven stops within
  2.2 m he turns to it and hops once (a turn only under reduced motion), and it re-arms when he walks
  away. It has no card and doesn't count. *The hop wasn't watched: the background test pane runs at
  about 1 fps, so the walk there takes minutes. The placement and the turn logic were checked.*
- **Feet no longer slide.** I measured the clips from `steven.glb`: Walk carries the rig 1.22 m/s at
  its authored rate, and Run 2.41 m/s. Each clip now plays at ground speed ÷ (clip speed × 1.2 figure
  scale), about 1.5× for both, times the tour pace. `WALK_SPEED` and `RUN_SPEED` now live in
  `scene/input.ts`, shared by the controller, the tour timer and the avatar.
- **The case study is drafted, not published.** It's `content/projects/_world.md`. The leading `_`
  keeps it off `/projects`, because listing it would list `/world` before it's finished (§1).
  - The copy is a draft for Steven to rewrite.
  - The `meta` line about AI assistance is his to word.
  - `img` expects the poster copied to `public/projects/World.webp`.
- **The sound toggle (§10) is not built, on purpose.** The world has no sound. A toggle that does
  nothing would be the kind of dishonest UI the rest of the world avoids. If sound is ever added,
  build the toggle with it, off by default.

Measured: `/world` is 208.1 kB before a button is pressed (unchanged). With the scene loaded it's
504.6 kB, about 303 kB on top of the shared bundle, which leaves **~47 kB of headroom**. `/` is
still 201.7 kB.

### After M6: first phone test (11 Nov 2026)

Steven recorded `/world` on an iPhone 18 Pro. The recording averages 59.8 fps, and the poster,
walking, d-pad, cards and counter all worked. There is no Android in the set, so the watchdog's
mid-range thresholds stay unverified. That doesn't block launch.

Fixed from what the recordings showed:

- **The racquet seemed not to work.** It did fire, but a 0.3 m hop is about 5 px at phone zoom, and it
  only fired once he had fully stopped. Now coming within 2.5 m sets it off: a 🎾 bubble shows over
  his head for 2.5 s, he turns to the racquet, and he hops twice at 0.55 m. Under reduced motion he
  only turns, with no hop. It re-arms at 5 m. Verified with `?at=17.6,-12.6`, a development-only
  start position for testing a spot without walking there.
- **The ferry now looks like a CityCat**, modelled on a photo of one: white twin hulls, a royal-blue
  body with a raked bow, the yellow stripe sweeping up to the cabin, a dark window band, a white
  roof, a wheelhouse forward and a mast. It is about 24 m long.
  - It's built from side profiles extruded across the beam. `paint()` in `shading.ts` bakes the same
    fixed sun into any shape from its normals, and all the parts merge into one draw call.
  - It docks alongside the pier's east side.
- **The rotate buttons rendered as empty circles on iOS.** iOS fonts have no ⟲ or ⟳, so the buttons
  now use inline SVG arrows.

- **Steven got stuck on walls, and the racquet only fired from one side.** Both had the same cause.
  Collision used each model's bounding box, so an L-shaped fence blocked the whole 3.5 × 10 m yard it
  encloses, and trees, parasols and planters were all bigger than they looked. Walking was a straight
  line that gave up at the first corner. Coming from the government tower, he stopped on the
  invisible edge of a planter, more than 2.5 m from the racquet.
  - **`scene/nav.ts`** builds a 0.5 m walk grid from the solid models' own triangles below head
    height (1.9 m), plus the hand-made solids, grown one cell for his body.
  - **Tap-to-move now plans a route**: Dijkstra over the grid, 8-connected, no corner cutting, with
    the corners pulled tight by line-of-sight. When the target can't be reached he goes to the
    nearest spot that can.
  - The keyboard still slides along walls, now against the true shapes.
  - Verified: from (26, −9.5) in front of the tower, a tap by the racquet routes round the planter,
    he arrives, and the 🎾 shows.
  - `?nav` (development only) draws the blocked cells in red, to check the grid against the models.

- **Taipei moved to the far bank, and the visitor can zoom.** Taipei used to stand 20-odd metres
  beyond the river, so at the follow zoom it was always off screen and only showed in the poster.
  - It now stands on a narrow far bank (`FAR_BANK` in `zones.ts`) right across the water, with a
    line of trees along the edge. It's still tinted towards the sky and never walkable, and it
    still hides when the camera faces it from the river side. This matches the §3 map, and it
    frames the crossing card: the ferry comes over from Taipei's side.
  - **Zoom** works as one continuous level, between "whole block" (the slab and Taipei in frame)
    and 1.6× the follow zoom, eased. As it widens, the camera drifts from Steven to the middle of
    the block. You can drive it with the mouse wheel or trackpad, two-finger pinch on touch
    screens (instead of zooming the page), the + and − keys, or a whole-block button next to the
    rotate buttons.
  - At either limit the wheel scrolls the page as normal, so the world never traps the scroll.
    §6 rules out free orbit, not zoom.
  - Verified: the follow view shows Taipei across the river from the ferry landing, the button
    toggles to the whole block, the wheel limits pass through, and a pinch prevents page zoom on a
    phone-sized viewport.
  - **The poster was re-rendered** with Taipei on its new bank, which also brings in the CityCat and
    the racquet.

- **Taipei 101 is the tallest building on the far bank**, at Steven's request. It replaces the
  generic tall tower that §4 rule 4 had been stretched to cover; that rule is about employers and
  institutions, not city landmarks.
  - `scene/Taipei101.tsx` builds it box-level: a podium, a base that narrows as it rises, the eight
    flared bamboo sections, the crown and the spire. It's about 28 m to the tip, roughly twice the
    towers round it.
  - It's tinted like the rest of the far bank, merged into one draw call, and hidden with the
    skyline.
  - The poster was re-rendered with it.

- **The Gallery is hidden until it has photos**, so a public page never shows seven "Photo to come"
  slots (§1: finished, or not shipped). `GALLERY_READY` in `src/lib/world.ts` is true only once
  every one of the seven `src` values is filled in. Until then:
  - the Gallery building is scenery, with no card and no tap target;
  - the tour has eight stops and ends at the exit board;
  - the list view skips it;
  - at 7 of 7 the counter reads "you've seen it all".
  Filling in the photos switches all of it back on, with no other change.

### Launched (11 Nov 2026)

`/world` is listed. Steven chose to launch before the on-device reduced-motion and VoiceOver
checks; both remain on the list below.

- **Nav:** World sits to the right of Projects, on desktop and in the mobile menu.
- **`noindex` is dropped**, so the route is indexable, with its canonical on the production domain.
- **Project #9:** `content/projects/world.md` is published as *Walk Around My Career*, with
  status "Live on this site" and the poster as its card image. Its "Live Demo" opens `/world` in
  the same tab, because on-site demos no longer open a new tab.

### To launch (all content or devices, no code)

*Kept for the record. What's still open, all non-blocking:*

- On-device checks of reduced motion and VoiceOver.
- The Gallery photos.
- Veilcore's project file.
- A mid-range Android.

1. **A real phone**, ideally a mid-range Android. *iPhone 18 Pro done (see above); no Android
   available.* Check:
   - the poster appears in under 1.5 s;
   - the frame rate holds;
   - the watchdog thresholds are right;
   - the feet look right at 60 fps.
2. **A screen reader** (VoiceOver on iOS or macOS) through the list and a card, and the OS
   reduced-motion setting.
3. ~~Seven Gallery photos~~ **Not blocking any more:** the Gallery stays hidden until all seven are in
   (`GALLERY_PHOTOS` in `src/lib/world.ts`).
4. **`site.workRights`** for the exit board.
5. **Veilcore** (§14 Q1). Skyveil's card links to `/about#experience` until there's a project file.
6. **The case study.** Rewrite `_world.md` in your own words, add its image, and rename it to
   `world.md`.
7. **Then list it.** Drop `robots: { index: false }` from `src/app/world/page.tsx` and add `/world`
   to the nav.

Nice to have, not blocking:

- **`/projects/[slug]`** (`PLAN.md` §6), so "Read the case study" lands on the case study itself.
- The E.SUN sign lettering.

---

## 12. Do these first (from `PLAN.md`)

Each one is cheaper than the world and is costing more right now. A design-literate reviewer will hit
all of them before ever reaching `/world`.

1. `site.workRights`: still `null`.
2. `/projects` content that only appears on hover, which touch devices never see.
3. `/projects/[slug]` routes (`PLAN.md` §6), so cards have somewhere to land.
4. The outstanding `prefers-reduced-motion` work. Only `TechOrbit` respects it today; the
   word-stagger and `animate-pulse` still run regardless (`PLAN.md` §8). A 3D world on a site that
   hasn't finished this is indefensible.
5. Modal accessibility (`PLAN.md` §8): Escape, focus trap, `aria-modal`, focus restore. The world's
   cards need exactly the same behaviour, so build it once and use it in both places.
6. The Formosa Bauhaus image.

---

## 13. Risks

| Risk | Guardrail |
| --- | --- |
| **The art stalls at grey boxes** (the most likely way this dies) | Commit to one kit family and the palette before M1. Ship M1 unlisted in week one. |
| Reads as a toy and undercuts the career-change positioning | Plain text, a boundary sentence on every card, no gamified credentials (§5, §7) |
| The world looks more finished than the work | The honesty grammar (§4), with `status.label` printed on every project card |
| Hurts the pages that convert | Separate route, poster first, `ssr: false`, homepage JS watched (§9) |
| Content drifts from the markdown | `world` field in project front matter, and no second copy (§8) |
| An NDA leak through a modelled interior | Opaque geometry only (§4) |
| The avatar clashes with the world | Bring the avatar down to the kit's style, never the reverse (§6) |
| Time taken from what decides interviews | It doesn't outrank `PLAN.md` §5. If it's this or BrisPulse's walking skeleton, the skeleton wins. |

---

## 14. Open questions

1. **Veilcore.** Is it publicly playable? Does it get `content/projects/veilcore.md`?
2. **Which seven photos?**
3. **Work rights:** the line for `site.workRights`.
4. ~~Which kit family?~~ **Resolved 11 Nov 2026: Kenney** City Kit ×3 + Watercraft (§6).
5. **Test devices.** Which phone, and is there a mid-range Android in the set? That device decides
   whether the fallbacks matter.
