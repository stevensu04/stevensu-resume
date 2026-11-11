---
# Project #9 (WORLD.md §0). Copy approved by Steven on 11 Nov 2026. The leading "_" keeps it off
# /projects until /world is listed (§1: "finished, or not shipped"). To publish, in one change:
# rename this to world.md, drop `noindex` from src/app/world/page.tsx, link /world from the nav, and
# change `status` from "Unlisted" to the live wording.

title: Walk Around My Career
category: Full-Stack
order: 9
img: /projects/World.webp   # a copy of src/app/world/poster.webp; refresh it when the poster changes
summary: A small isometric 3D world on this site — a riverside block in Brisbane where each building is a stop in my career, built to stay fast, honest and accessible on a phone.

tech:
  - Three.js
  - React Three Fiber
  - Next.js
  - TypeScript
  - GLSL
  - glTF / meshopt

status:
  label: In Progress · Unlisted
  tone: amber

demo: /world

meta:
  - label: My Role
    value: Design, engineering and content
  - label: Context
    value: Personal project · built with an AI coding assistant
  - label: Budget
    value: ~6 kB JS until you press a button · one compressed kit + avatar, ~400 kB over the wire
    mono: true
    wide: true
  - label: Architecture
    value: Next.js 16 · R3F · instanced Kenney CC0 kit · one shared GLSL patch · DOM cards
    mono: true
    wide: true

problem: |
  A portfolio is a list, and a list makes every project look equally finished. I wanted a way to
  walk someone through the order things actually happened — a bank in Taipei, a degree in Brisbane,
  a government contract, a capstone still under construction — without the format overselling any
  of it, and without costing the visitor who only has a phone and forty-five seconds.

solution: |
  One riverside block, seen from above. Each project is a building, and the geometry carries the
  same honesty as the status badge: shipped work is a whole building, confidential work stays
  shuttered, the capstone is scaffolding, prototypes are scale models on plinths, and the concept is
  a wireframe on a blueprint table. Every card is read from the same markdown as /projects, and the
  build fails if a card has nowhere to stand.

  The page opens on a still image and loads nothing 3D until you ask. Behind that: one compressed
  kit file instead of thirty-six models, instancing so the whole block draws in 45 calls, and one
  shader patch that greys out unexplored zones, stipples away whatever hides the avatar, and sways
  the trees. The avatar came from our DECO7381 storefront, cut from 4.4 MB to 340 kB.

  It works without the 3D, too: no WebGL, a slow phone or a screen reader gets the same content as a
  list, and the keyboard can visit every stop in order.

solutionHeading: What I Built

callouts:
  - section: solution
    tone: blue
    icon: "🧱"
    title: "Technical Highlight: The geometry can't look more finished than the work"
    body: |
      A 3D world makes everything look built, so the scene follows one rule: never more built than
      the status label says. That's authored per project, not derived from a colour, because two
      projects with the same badge tone can be a live app and a Figma prototype.
---
