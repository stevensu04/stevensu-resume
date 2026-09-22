---
title: StarLens
category: Business
order: 1
# Flagship moved to Eco Router (eco-router.md). Only one project should carry `featured: true`.
img: null

# Proprietary enterprise software built for HDRE (HD Renewable Energy) / Star Trade — internal
# market data and real counterparty figures, so no public screenshot. See CONTENT.md → confidential.
confidential: true

summary: An internal market-intelligence platform for Taiwan's green-power (T-REC) trading desk — a live data pipeline feeding a context-aware AI engine that drafts audit-ready B2B pitches.

tech:
  - Django
  - HTMX
  - Apache Airflow
  - MongoDB
  - OpenAI API

status:
  label: Shipped in Production
  tone: green

# No demo/repo — proprietary enterprise software under IP/NDA, confirmed with Steven.

meta:
  - label: My Role
    value: Full-Stack Engineer
  - label: Context
    value: Star Trade (HDRE Group) · 4-week sprint, team of 2
  - label: Performance Impact
    value: Page latency 4s → <2s (−50%)
    badge: blue
    wide: true
  - label: Platform Architecture
    value: Django · HTMX · MongoDB · Apache Airflow · OpenAI API
    mono: true
    wide: true

problem: |
  Star Trade's T-REC market and policy-compliance data lived across scattered Excel exports,
  PDFs and manual web crawls — no single view of trading flow, market share or regulatory
  capacity caps existed, and producing a client-ready market brief meant assembling it by hand
  every time.

solution: |
  Built StarLens end-to-end. Nightly Apache Airflow ETL pipelines ingest and reconcile the raw
  sources into optimised MongoDB indices, cutting page latency from 4s to under 2s with zero
  mock data. On top of that pipeline, a Context-Aware Intelligence Engine injects live database
  context — entity metrics, market share, regulatory capacity — into the OpenAI and Databricks
  APIs to asynchronously generate audit-ready B2B pitches and executive summaries, surfaced
  through a Django and HTMX interface built for real-time interactivity without a heavy
  client-side framework.

callouts:
  - section: solution
    tone: green
    icon: "🧠"
    title: "Context-Aware, Not a Chatbot"
    body: |
      Rather than a generic LLM wrapper, the Intelligence Engine dynamically injects live
      database context — entity metrics, market share, regulatory capacity thresholds — into
      each prompt, producing audit-ready B2B pitches instead of generic AI text.
---
