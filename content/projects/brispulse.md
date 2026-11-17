---
title: BrisPulse
category: Product & Research
order: 5
# Concept first (2026 capstone, team of 5); rebuilt and deployed as a live product in November 2026.
# The image is a real capture of the live overview (17 Nov 2026). The old prototype mock-up showed
# invented data, so it was retired.
img: /projects/brispulse-live-overview.png
summary: A live dashboard of South East Queensland public transport, built on TransLink's open real-time feeds. It shows what is running now, how late it is predicted to be, and how fresh the data is.

tech:
  - Python
  - FastAPI
  - PostgreSQL
  - GTFS-Realtime (Protobuf)
  - React
  - TypeScript
  - MapLibre GL
  - Docker
  - GitHub Actions

status:
  label: Live · Deployed
  tone: green

# Live URL and public source. Both work today.
demo: https://brispulse.onrender.com
repo: https://github.com/stevensu04/brispulse

meta:
  - label: My Role
    value: Designer and developer. The concept was a team project; the build is my own, with AI coding assistants used for implementation and review.
    wide: true
  - label: Origin
    value: UQ DECO7380 capstone concept · team of 5 · Semester 1, 2026
  - label: Built
    value: Live overview, vehicle map, routes, trips and alerts, with a data-freshness indicator on every view
    wide: true
  - label: Not built
    value: Stored history, trends, route statistics, and the crowd-aware routing from the concept
    wide: true
  - label: Hosting
    value: Free tier. The service sleeps when idle, so the first visit can take one to two minutes.
    wide: true
    mono: false

problem: |
  Timetables say when a service should run, not whether it is running now or how late it is likely
  to be. Existing mapping tools mostly optimise travel time. The capstone started from a related
  question: how crowded and uncertain a station exit or a narrow pedestrian corridor feels.

solution: |
  BrisPulse collects TransLink's three real-time feeds (vehicle positions, trip updates and service
  alerts), checks each record against the published timetable, and shows the result as a live
  dashboard and map. Every figure carries how fresh its data is. A value that cannot be given is
  shown as unavailable, never as zero.

callouts:
  - section: problem
    tone: blue
    title: "Concept dropped: crowd and routing features"
    body: |
      The capstone's crowding score and calmer-route guardrails needed data that TransLink's public
      feeds do not contain: no occupancy, and no gate or Wi-Fi counts. They are not in the built product.
  - section: solution
    tone: amber
    title: "Predictions, not measurements"
    body: |
      Delays are TransLink's predictions for each trip's next stop, not measured arrival times. The
      dashboard says so, and it makes no on-time performance claim.

result: |
  The three live feeds decode and match the published timetable: in a Monday-morning snapshot, 99.8% of the
  85,008 stop predictions checked agreed with the schedule. The app runs as one container on a free
  host, and live data appeared 46 seconds after a cold start under that host's CPU and memory limits
  (measured locally). The test suite has 385 backend tests and 29 frontend tests, including checks
  against a sample of real feed data.

  Not yet: there is no stored history, so no trends, and the delay figures have not been checked
  against measured arrivals.

# The project's card in /world (WORLD.md §7, §8). Title, status and URLs come from the fields above.
world:
  zone: park
  link: projects
  linkLabel: Read the case study
  card: |
    Transit apps show the timetable, not whether the bus is actually late. I built a live dashboard on
    TransLink's real-time feeds: where vehicles are, how late they are predicted to be, and how old the
    data is. It keeps no history yet, and the crowd-aware routing from my capstone is not built.
---
