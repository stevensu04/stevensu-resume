---
title: EventNow
category: Full-Stack
order: 4
img: /projects/EventNow.jpg
summary: A Brisbane event-management SaaS where organisers describe an event in plain English and an AI agent fills in the form — with ticketing, attendee management and tiered plans.

# Everything here is in the source (INFS7202/EventNow): requirements.txt, settings.py, events/.
tech:
  - Django
  - HTMX
  - Django REST Framework
  - PostgreSQL
  - OpenAI API
  - Google OAuth 2.0
  - Bootstrap 5

status:
  label: Course Project · Solo Build
  tone: blue

demo: https://event-now-eight.vercel.app
repo: https://github.com/stevensu04/EventNow

meta:
  - label: My Role
    value: Full-Stack Developer (solo)
  - label: Context
    value: UQ Master of IT · INFS7202
  - label: Architecture
    value: Django · HTMX · DRF · PostgreSQL · OpenAI API · django-allauth
    mono: true
    wide: true

problem: |
  Small organisers in Brisbane juggle event listings, registrations, venue capacity and attendee
  lists across separate tools, and writing a polished event page for every listing takes time
  they don't have.

solution: |
  EventNow is a full-stack Django platform covering the whole event lifecycle. Organisers type a
  request like "tech meetup at Fortitude Valley next Friday for 80 people" and an agentic parser
  turns it into structured form fields, constrained to real Brisbane venues and valid categories;
  an AI writer drafts the description. Attendees register without an account and receive a signed
  ticket link with a calendar (.ics) download. Organisers get an HTMX dashboard with sessions,
  attendee status updates and CSV export, behind Free, Pro and Enterprise plans, with Google
  OAuth 2.0 sign-in and a REST API for attendees and notifications.

callouts:
  - section: solution
    tone: green
    icon: "🛡️"
    title: "AI That Can't Run Up the Bill"
    body: |
      Every OpenAI call goes through one wrapper that enforces a per-user daily quota with a
      row-locked counter, uses JSON mode and validates the output against the real venue list, and
      sanitises model-generated Markdown before it reaches a template. The site still boots and
      degrades gracefully when no API key is configured.
---
