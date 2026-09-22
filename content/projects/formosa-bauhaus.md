---
title: Formosa Bauhaus
category: Full-Stack
order: 3
# No img yet — add a screenshot of the console or storefront before the 26 Oct showcase.
summary: A photo-to-3D web storefront that tells shoppers which parts of a product's 3D model were actually photographed and which the AI invented.

# Team stack (src/frontend, src/backend, src/Cloud). Steven's own work is spelled out in
# `solution` and the callout — keep that split honest; six people built this.
tech:
  - React
  - TypeScript
  - Three.js
  - FastAPI
  - PostgreSQL
  - AWS
  - Meshy API

status:
  label: In Progress · Capstone
  tone: amber

# Repo is private to the course org (Studio3Build-2026s2) — no public link. Don't add `repo`
# unless it's made public.

meta:
  - label: My Role
    value: Full-Stack / AI Pipeline / Research
  - label: Context
    value: UQ DECO7381 Capstone (Part 2) · team of 6
  - label: Timeline
    value: Semester 2, 2026 · showcase 26 Oct
    badge: amber
    wide: true
  - label: Architecture
    value: React · Three.js · FastAPI · PostgreSQL · AWS (EC2, RDS, S3) · Meshy
    mono: true
    wide: true

problem: |
  Single-image 3D generators turn one product photo into a full mesh, so most of what a shopper
  rotates was never photographed — it was inferred. Storefronts render that inference with the
  same authority as evidence, and neither the merchant nor the shopper can tell the difference.

solution: |
  Every generated model carries a grounding classification: which surfaces the merchant's
  photographs actually covered, and which the generator invented. Merchants upload a photo, it
  runs a seven-stage pipeline (cutout, Meshy generation, pose, grounding bake, texturing,
  optimisation, storage), and comes back for review before it can be published to a walkable 3D
  storefront. My part: I built the merchant console flow (Upload, Processing, Review and
  Inventory) and joined it to the live backend, added sign-in with role-gated routes and the
  storefront's account and shopping bag, and wrote several of the team's architecture decision
  records plus the Sprint 3 plan.

callouts:
  - section: solution
    tone: amber
    icon: "🪙"
    title: "Guarding a Shared, Paid AI Budget"
    body: |
      Each Meshy generation spends real credits from one shared account. I added a backend
      guard that checks the live provider balance and refuses to start a run below a reserve,
      replacing a per-machine placeholder budget that couldn't see what teammates had spent.
---
