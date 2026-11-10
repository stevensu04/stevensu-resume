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
| Where do the models come from? | **CC0 low-poly kits** (Kenney, Quaternius, Poly Pizza) plus a few hand-made blocks. | No Meshy subscription. Kits share one palette texture, which is the cheapest route to a consistent art direction for a non-artist. |
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
- **Taipei is past tense only.** The skyline and the E.SUN sign tell the visitor where he came from.
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

- **Kit first.** Use one CC0 kit family for buildings, roads, trees, props and water, and stick to it.
  Mixing kits breaks the palette. Hand-make only what kits don't have: noticeboard, blueprint table,
  three plinths, exit sign, shuttered door, scaffolding. All of it is box-level work in Blender.
- **Palette:** six colours plus one accent. The accent is the site's `blue-600`.
- **Lighting:** bake it, as a lightmap or vertex colours, and use `MeshBasicMaterial`. No real-time
  lights, no shadow maps, no post-processing. This is both the mobile-performance answer and the look
  itself.
- **The avatar must be brought down to the world's style.** The DECO7381 rig carries a photo-derived
  texture, while the kit is flat-shaded. A realistic figure in a cartoon world looks wrong in a way
  visitors feel but can't name. Fix it on the avatar side: flat or toon material (adapt `relight.ts`)
  and a 256 px texture. At isometric distance he's 60–80 px tall on screen, so detail is invisible
  anyway. Never make the world more realistic to match him.
- **Camera:** orthographic, **pitch locked**, follows the avatar. Azimuth turns only in 90° steps,
  from two buttons or Q/E. Free orbit destroys the isometric look within seconds.
- **Occlusion:** when a building hides Steven, fade it. A visitor notices this immediately if it's
  missing.
- **Idle motion is what makes it alive,** more than polygon count: water swell (vertex shader), trees
  swaying, the crane turning slowly, the arcade screen flickering, a ferry crossing every ~30 s. All
  of it is cheap. All of it stops under `prefers-reduced-motion`.

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

**Assets:** single GLB per group, **meshopt over Draco** (a smaller decoder that's faster on weak ARM
cores, and low-poly gains little from Draco), produced by `gltf-transform` (`dedup`, `join`, `weld`,
`meshopt`, `resize`) into `public/world/`. Scenery repeats use `InstancedMesh`. Load in order: poster,
then ground and buildings, then props and avatar behind a second `Suspense` boundary.

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
- **Not yet verified:** the Vercel deploy (needs a push), the reduced-motion branch (the test browser
  can't emulate the media query) and a real phone.

**Decide the asset kit before M1.** Ship M1 behind the unlisted URL within the first week, so
something real exists on the internet early.

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
4. **Which kit family?** Kenney City Kit, Quaternius, or a mix within one palette. Look at them side by
   side before M1.
5. **Test devices.** Which phone, and is there a mid-range Android in the set? That device decides
   whether the fallbacks matter.
