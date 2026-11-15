---
title: Formosa Bauhaus
category: Full-Stack
order: 0
# Flagship since 16 Nov 2026: the largest, most complete build here. Only one project should carry
# `featured: true` at a time (Eco Router held it before).
featured: true
# A frame from 0:02 of the team's showcase film: the avatar walking into the FORMOSA shopfront.
# Also the film's poster. Recognisable at card size, which a console screenshot is not.
img: /projects/FormosaBauhaus.jpg
summary: A walkable 3D store built from single product photos, which tells shoppers how much of each model was actually photographed and how much the AI invented.

# Team stack (src/frontend, src/backend, src/Cloud). Steven's own work is spelled out in
# `solution` and the callouts — keep that split honest; six people built this. Checked against
# `git log` and the team README's ownership table on 16 Nov 2026.
tech:
  - React
  - TypeScript
  - Three.js
  - FastAPI
  - PostgreSQL
  - AWS
  - Meshy API

status:
  label: Completed · UQ Capstone
  tone: green

# Repo is private to the course org (Studio3Build-2026s2) and has six authors — no public link.
# The EC2 deployment (3.25.135.82) is the team's, on plain HTTP, and can go away at any time, so
# it isn't linked as `demo` either. The film below stands in for both.

meta:
  - label: My Role
    value: Full-Stack Developer
  - label: Context
    value: UQ DECO7381 Capstone (Part 2) · team of 6
  - label: Timeline
    value: Semester 2, 2026 · submitted 23 Oct · showcased 26 Oct
    badge: green
    wide: true
  - label: Architecture
    value: React · Three.js · FastAPI · PostgreSQL · AWS (EC2, RDS, S3) · Meshy
    mono: true
    wide: true
  - label: Source
    value: Private course repository · code walkthrough on request
    wide: true

problem: |
  Single-image 3D generators turn one product photo into a full mesh, so most of what a shopper
  rotates was never photographed — it was inferred. Storefronts render that inference with the
  same authority as evidence, and neither the merchant nor the shopper can tell the difference.

solution: |
  Every generated model carries a grounding classification: which surfaces the merchant's
  photographs actually covered, and which the generator invented. A merchant uploads a photo, a
  seven-stage pipeline (cutout, Meshy generation, pose, grounding bake, texturing, optimisation,
  storage) turns it into a model, and the merchant reviews that grounding before publishing it to
  a walkable 3D store, where shoppers can switch to a view that keeps colour only where a
  photograph saw the product. My part: I joined the merchant console (Upload, Review, Inventory)
  to the live API and ran the first photo through it end to end; built the shopper's side of the
  store — sign-in with role-gated routes, picking a product up to turn it and read its
  photographed share, the bag and the footstep sound; wrote the tool that moves finished products
  between deployments without paying for generation again; and wrote ADRs 008, 014 and 015, the
  Sprint 3 plan, and assembled the final team report.

result: |
  Submitted on 23 Oct and shown at the UQ showcase on 26 Oct, with 15 products published on the
  team's AWS deployment. Three evaluators finished every storefront task; the bag and fitting-room
  counters that confused them were fixed before the code freeze. The shop assistant answered 16 of
  20 test questions correctly and invented no products. Not met: on the reference Android phone
  the store's 95th-percentile frame time stayed near 50 ms against a 22 ms target.

callouts:
  - section: solution
    tone: amber
    icon: "🪙"
    title: "Guarding a Shared, Paid AI Budget"
    body: |
      Each Meshy generation spends real credits from one shared account. I added a backend
      guard that checks the live provider balance and refuses to start a run below a reserve,
      replacing a per-machine placeholder budget that couldn't see what teammates had spent.

  - section: solution
    tone: blue
    icon: "🔍"
    title: "The First Run Through the Real Pipeline"
    body: |
      On 5 Sep I sent the first photo from the console through Meshy and back. That one run found
      that the optimise stage called the wrong npm package, proved that a retry resumes without
      paying for generation again, and showed a generation costs 15 credits, not the 30 the plan
      assumed.

  - section: result
    tone: green
    icon: "🧪"
    title: "What Testing Changed"
    body: |
      Paper-prototype participants couldn't read unlabelled tier icons, so the console I built
      gave every tier a permanent text label. In the retest, 4 of 5 participants read all three
      tiers, and all 5 rated the walkable store above flat product photos.

video:
  src: /projects/formosa/film.mp4
  caption: The team's 60-second showcase film — the walkable store, the photographed share of a product, the truth switch, fitting on 11 body types and the shop assistant.

gallery:
  - src: /projects/formosa/review-tiers.jpg
    alt: Merchant console Review screen. A cargo-pants model is coloured only where the photo saw it, beside a panel reading 23% grounded in your photo.
    caption: Review, in the merchant console I built. Before publishing, the merchant sees that 23% of this model was photographed, 59% was invented by the AI and 18% was never visible. The tier calculation is Kaike's.
  - src: /projects/formosa/storefront-truth-toggle.jpg
    alt: The same storefront shelf twice. On the left, products in full colour. On the right, colour remains only on the photographed surfaces.
    caption: The storefront's truth switch. The same shelf as sold (left), and with colour kept only where a photograph saw the product (right).
  - src: /projects/formosa/bag.jpg
    alt: The shopping bag panel open over the 3D garden, listing three garments with a total of $197.00 and a Try on everything button.
    caption: The bag (built with Kaike). Collect garments, then try everything on at once. Checkout is out of scope, and the panel says so.
  - src: /projects/formosa/architecture.jpg
    alt: C4 container diagram. A React app served by Nginx on one EC2 host, a FastAPI application, a generation worker, RDS PostgreSQL, private S3 and the Meshy API.
    caption: The deployed architecture. One EC2 host behind Nginx, with RDS PostgreSQL and private S3. The generation worker is off on the public deployment. Cloud work by Bob.

mediaCredit: Film and screens from Team 41's build (DECO7381, The University of Queensland, 2026). Product photos from Vecteezy under its Free License. 3D product models generated with Meshy. Architecture diagram from the team's final report.

# The project's card in /world (WORLD.md §7, §8). Title, status and URLs come from the fields above.
world:
  zone: site
  link: projects
  linkLabel: Read the case study
  card: |
    Single-image 3D generators turn one product photo into a whole mesh, so most of what a shopper
    rotates was never photographed — it was inferred. Our storefront labels which surfaces came from
    evidence and which the AI invented. Team of six; I built the merchant console and the store's
    shopping flow, and joined them to the live backend.
---
