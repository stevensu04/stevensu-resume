---
# Copy this file to content/projects/<your-slug>.md and edit.
# Files starting with "_" are ignored by the loader.
# Full field reference: CONTENT.md

title: Project Name
category: Full-Stack          # free text — a new value creates a new filter button
order: 10                     # lower shows first
featured: false               # true = card spans two columns

# Path under public/. Delete the line entirely if you have no image —
# a branded placeholder renders instead, never a broken image.
img: /projects/YourImage.png

summary: One sentence, shown when someone hovers the card.

# What you ACTUALLY built with. Anything planned rather than built belongs
# in `meta`, labelled as proposed. See CONTENT.md → Honesty.
tech:
  - TypeScript
  - Python

# Maturity badge on the card. tone: blue | purple | green | amber
status:
  label: Shipped in production
  tone: green

# Omit rather than guess — a 404 costs more credibility than a missing link.
# demo: https://example.com
# repo: https://github.com/you/repo

meta:
  - label: My Role
    value: Full Stack Engineer
  - label: Context
    value: Where this happened
  - label: Architecture
    value: Django · Postgres · Redis
    mono: true                # monospace — good for stacks and data sources
    wide: true                # span both columns
  # - label: Impact
  #   value: +30% faster
  #   badge: blue             # render as a coloured pill

problem: |
  What was actually wrong, and for whom. Concrete beats abstract — a number here
  is worth a paragraph of adjectives.

solution: |
  What you built and what changed as a result.

# Optional. Overrides the "Solution & Architecture" heading.
# solutionHeading: Solution & Interactive Prototype

# Optional highlighted panels. Delete the whole block if unused.
# callouts:
#   - section: problem        # problem | solution
#     tone: blue
#     quote: true             # italic pull-quote
#     body: |
#       A striking research finding or user quote.
#
#   - section: solution
#     tone: green
#     icon: "🪙"
#     title: "Technical Highlight: Something"   # quote any value containing a colon
#     body: |
#       The one engineering decision worth explaining.
---
