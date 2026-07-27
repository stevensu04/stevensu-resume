# Adding a project

Projects live in `content/projects/`. **One markdown file per project.** Drop a file in, refresh —
it appears. No TypeScript, no component edits, no imports to remember.

```bash
cp content/projects/_TEMPLATE.md content/projects/my-new-project.md
```

Then edit the new file and save. The dev server picks it up on refresh.

The filename becomes the URL slug (`my-new-project.md` → `my-new-project`), so use lowercase and
hyphens.

---

## The shortest possible project

Everything else is optional. This is the minimum that will build:

```markdown
---
title: My Project
category: Full-Stack
summary: One sentence that shows on hover and in the card.
tech:
  - Python
  - Postgres
problem: |
  What was actually wrong, and for whom.
solution: |
  What you built, and what changed as a result.
---
```

---

## Every field

### Required

| Field | Type | Notes |
| --- | --- | --- |
| `title` | text | Shown on the card and modal |
| `category` | text | Free-form — see [Categories](#categories) |
| `summary` | text | One sentence, appears on card hover |
| `tech` | list | What you **actually built with**. See [Honesty](#honesty) |
| `problem` | text block | Section 01 of the modal |
| `solution` | text block | Section 02 of the modal |

### Optional

| Field | Type | Notes |
| --- | --- | --- |
| `order` | number | Lower shows first. Default 999, then alphabetical |
| `featured` | true/false | Card spans two columns |
| `img` | path | e.g. `/projects/Thing.png`. Omit → branded placeholder, never a broken image |
| `status` | block | Maturity badge on the card — `label` + `tone` |
| `demo` | URL | Live, working link. **Omit rather than guess** |
| `repo` | URL | Public source |
| `meta` | list | The fact grid in the modal |
| `callouts` | list | Highlighted panels under Problem or Solution |
| `solutionHeading` | text | Overrides "Solution & Architecture" |

### Multi-line text

Use `|` and indent. Line breaks inside are fine — they get collapsed into a paragraph:

```yaml
problem: |
  First line of the paragraph, which can run
  across as many lines as you like in the file.
```

### `status`

The maturity badge. Be accurate — this is what stops an interviewer assuming more than exists.

```yaml
status:
  label: Shipped in production
  tone: green
```

`tone` is one of `blue`, `purple`, `green`, `amber`.

### `meta`

The grid of facts in the modal. `wide: true` spans both columns, `mono: true` renders monospace
(good for stacks and data sources), `badge: <tone>` renders a coloured pill.

```yaml
meta:
  - label: My Role
    value: Full Stack Engineer
  - label: Context
    value: UQ Ventures Program
  - label: Architecture
    value: Django · Postgres · Redis
    mono: true
    wide: true
  - label: Impact
    value: +30% Processing Efficiency
    badge: blue
    wide: true
```

### `callouts`

Highlighted panels. `section` places it under `problem` or `solution`. `quote: true` renders it as
an italic pull-quote; otherwise supply `title` and optionally `icon`.

```yaml
callouts:
  - section: problem
    tone: blue
    quote: true
    body: |
      86% of surveyed users reported high frustration with current arrangements.

  - section: solution
    tone: green
    icon: "🪙"
    title: "Technical Highlight: Token Economy"
    body: |
      Users earn tokens via daily check-ins, which meters AI query cost.
```

---

## Categories

`category` is free text and the filter bar is **built from whatever categories exist**. Add a project
with `category: Data & AI` and a "Data & AI" filter button appears automatically.

Current: `Full-Stack`, `Business`, `Product & Research`.

Spelling matters — `Full-Stack` and `Full Stack` become two different filters.

---

## Honesty

`tech` lists what you **actually built with**. Anything planned rather than built goes in `meta`,
explicitly labelled.

BrisPulse is the worked example. It's a concept with a prototype, so:

```yaml
tech:
  - Systems Design
  - UX Research
  - Responsive Prototype

status:
  label: Concept & Systems Design
  tone: purple

meta:
  - label: Proposed Stack (not yet built)
    value: Django · Python · GTFS-Realtime
    mono: true
    wide: true
```

The tags previously claimed `Django · Python · GTFS-Realtime API` for something that was never
built. An interviewer opening with *"walk me through your GTFS integration"* ends the conversation
there, and every other answer you gave gets re-examined. Framing a concept honestly is not a
weakness — "I scoped a system, designed the data architecture and prototyped the interface" is a
legitimate thing to have done.

Same rule for `demo` and `repo`: **omit rather than guess.** A 404 from a portfolio link costs more
credibility than an absent link.

---

## When something is wrong

Content is validated at build time and fails loudly with the file and the field:

```
[content] journeymate.md: callouts[1].tone has tone "teal"; expected one of blue, purple, green, amber
```

That's deliberate. A build that refuses to start is better than a card that renders half-broken on
the day a recruiter opens it.

Common causes:

| Message | Cause |
| --- | --- |
| `"title" is required...` | Missing field, or a typo in the field name |
| `...expected one of blue, purple...` | Invalid `tone` |
| `"tech" is required and must be a list` | Wrote `tech: Python` instead of a `-` list |
| `Duplicate slug` | Two files with the same name |
| YAML parse error | Almost always indentation, or a `:` inside an unquoted value — wrap it in quotes |

Values containing a colon need quotes:

```yaml
title: "Technical Highlight: Token Economy"
```

---

## How it works

```
content/projects/*.md          ← you edit this
        │
        ▼
src/lib/projects.ts            ← reads, validates, throws on bad input (server only)
        │
        ▼
src/app/projects/page.tsx      ← Server Component, runs at build time
        │
        ▼
src/components/ProjectsView.tsx ← client UI: filter, cards, modal
```

`src/lib/project-schema.ts` holds the types and the tone colours, and is safe to import from client
components. `src/lib/projects.ts` touches the filesystem and must never be imported from a client
component.

Files starting with `_` are ignored, which is why `_TEMPLATE.md` doesn't show up as a project.

### Why files and not a database

For a handful of projects, markdown in git beats a database on every axis that matters here: the
site stays fully static (fast, free to host, nothing to keep running), content is version-controlled
and reviewable in a diff, and there is no admin UI to build or secure. A database would add hosting
cost, an auth surface, and a runtime dependency in exchange for nothing at this scale.

The loader is a clean boundary, though. `getProjects()` is the only thing that knows where content
comes from — swapping in Postgres later means rewriting that one function and nothing else.

If the goal is to *demonstrate* backend work, the portfolio's own content layer is the wrong place
to do it: nobody reviewing your application will ever see the admin UI. BrisPulse is where that
effort pays. See PLAN.md §5.
