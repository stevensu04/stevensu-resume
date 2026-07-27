---
title: BrisPulse
category: Full-Stack
order: 1
featured: true
img: /projects/BrisPulse.jpeg
summary: An event-day spatial pressure-awareness system that translates crowded urban conditions into human-centred movement choices.

# Concept-stage: research and systems design are what exist. The Django/GTFS stack is
# proposed, and lives in `meta` labelled as such. See PLAN.md §3.
tech:
  - Systems Design
  - UX Research
  - Responsive Prototype

status:
  label: Concept & Systems Design
  tone: purple

# TODO(steven): add `repo` and `demo` once the walking skeleton is public. See PLAN.md §5.

meta:
  - label: My Role
    value: Systems Architect (Proposal)
  - label: Stage
    value: Feasibility & Design
    badge: purple
  - label: Proposed Data Architecture
    value: TransLink GTFS-Realtime API • BCC Wi-Fi Probe Density • Venue Gate Egress • Anonymized User-Experience Signals
    mono: true
    wide: true
  - label: Proposed Stack (not yet built)
    value: Django · Python · GTFS-Realtime
    mono: true
    wide: true

problem: |
  Existing mapping tools focus strictly on travel time, failing to capture experienced spatial
  pressure (uncertainty and reduced control) at major Brisbane bottlenecks like station exits and
  narrow pedestrian corridors.

solution: |
  A complementary decision-support layer empowering flexible users with transparent choices between
  Fastest, Balanced, and Calmer routes, strictly constrained by spatial-equity guardrails to protect
  residential streets.

callouts:
  - section: problem
    tone: blue
    icon: "⚖️"
    title: "Architectural Decision: Spatial-Equity Guardrails"
    body: |
      Custom cost penalties designed directly into the routing engine nodes. This mathematical
      firewall constrains alternative calmer routes to high-capacity corridors, preventing the
      harmful redistribution of crowds into residential or commuter paths.
---
