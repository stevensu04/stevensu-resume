---
title: Eco Router
category: Full-Stack
order: 1
# Flagship moved to Formosa Bauhaus (formosa-bauhaus.md), 16 Nov 2026 — the biggest and most
# complete build, with a film standing in for a live demo. Eco Router stays the most verifiable
# project (public source, on npm), so it sits first in the grid. Only one project should carry
# `featured: true` at a time.
img: /projects/EcoRouter.svg
summary: An open-source MCP server that lets AI agents pick the lowest-carbon AWS, Google Cloud or Azure region for a workload — and the lowest-carbon time to run it.

tech:
  - TypeScript
  - Node.js
  - Model Context Protocol
  - Zod
  - Vitest
  - Electricity Maps API

status:
  label: Open Source · v0.1 on npm
  tone: green

repo: https://github.com/stevensu04/eco-router-mcp

meta:
  - label: My Role
    value: Creator & Maintainer
  - label: Context
    value: Hackathon project, rebuilt and released solo
  - label: Coverage
    value: 134 cloud regions · 3 providers
    badge: green
    wide: true
  - label: Data Sources
    value: Ember · US EPA eGRID · Canada NIR · Electricity Maps (live, optional)
    mono: true
    wide: true
  - label: Distribution
    value: npx -y eco-router-mcp · MCP Registry
    mono: true
    wide: true

problem: |
  The same GPU job can emit several times more CO₂ depending on which grid powers the
  datacenter, but cloud region pickers show price and latency, never carbon. AI agents that
  provision infrastructure had no structured way to ask "where is cleanest, given my data
  residency and latency constraints?" — and no way to know when a flexible batch job should run.

solution: |
  Eco Router maps all 134 public AWS, Google Cloud and Azure regions to the electricity grids
  they draw from and exposes three MCP tools. `rank_regions` filters by provider, country (with
  EU/EEA groups), latency and carbon ceilings, then scores the survivors on normalised carbon and
  estimated latency. `find_clean_window` uses 72-hour carbon forecasts to find the lowest-carbon
  start time for a batch job and the savings versus starting now. It works with zero setup on
  published annual averages, and upgrades to hourly grid-level data when given an Electricity
  Maps token — falling back per zone, and saying why, when live data isn't available.

# 03 - Result. Only facts already in this file (meta, solution).
result: |
  Released as an open-source package anyone can run with `npx -y eco-router-mcp`, and listed in
  the MCP Registry. It covers all 134 public AWS, Google Cloud and Azure regions, works with zero
  setup on published annual averages, and upgrades to hourly grid-level data when given an
  Electricity Maps token.

callouts:
  - section: solution
    tone: green
    icon: "🔬"
    title: "Comparable Numbers, Not Just Numbers"
    body: |
      US eGRID reports direct combustion emissions while Ember reports lifecycle emissions, so
      mixing them silently would be wrong. Eco Router rebuilds US and Canadian grid intensities
      from each grid's generation mix using Ember's lifecycle factors, and the update script
      refuses to write new data if the US total drifts more than 5% from Ember's published figure.

# The project's card in /world (WORLD.md §7, §8). Title, status and URLs come from the fields above.
world:
  zone: shed
  link: repo
  linkLabel: Read the source on GitHub
  card: |
    The same GPU job emits several times more CO₂ depending on which grid powers the datacentre, but
    region pickers only show price and latency. Eco Router maps all 134 AWS, Google Cloud and Azure
    regions to their grids so an agent can ask which is cleanest. The source is public — that's the
    point of this one.
---
