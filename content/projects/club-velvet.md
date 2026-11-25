---
title: Club Velvet
category: Full-Stack
order: 3
# Cover: a frame of the projector view, rendered from the game's own pixel-art scene code (the
# same frame the team used as its LinkedIn cover). Recognisable at card size.
img: /projects/club-velvet/cover.jpg
summary: A Red Light, Green Light party game for one projector and a room of phones, where Claude plays the bouncer and roasts you by name.

# Team stack, read from the repo's package.json and docs on 26 Nov 2026 (Tanda_Mango).
tech:
  - TypeScript
  - Node.js
  - WebSockets
  - Canvas
  - Vite
  - Anthropic API
  - Vitest
  - Render

# Not placed, so the badge says what it was, not how it ended. Do not upgrade this to a prize.
status:
  label: Built in 24h · Tanda Hackathon 2026
  tone: purple

# The live game is on Render's free tier, so it sleeps when idle: the first request took about 22 s
# on 26 Nov 2026. Said in `meta` so a reviewer isn't left staring at a blank tab.
demo: https://jailbreak-the-bouncer.onrender.com/
# No `repo`: the LinkedIn post deliberately leaves the repo link out, so this follows it.
# The repo name is Jailbreak the Bouncer / Tanda_Mango; the game on screen is called Club Velvet.

# ROLE (26 Nov 2026): Steven says the three of them built it together, mostly on one or two laptops,
# so the repo's commit counts (Wesley 11, Jonathan Hii 5, Steven 1) say nothing about who did what.
# It is credited as a three-way co-creation. Don't split the work per person beyond what is known:
# Wesley drew the pixel art (the team's own LinkedIn post says so).
meta:
  - label: My Role
    value: "Co-creator: game design, build and pitch"
  - label: Context
    value: Tanda AI Hackathon 2026, "Bring an idea to life" · 200+ participants · team of 3
  - label: Timeline
    value: 20–21 Nov 2026 · about 24 hours, Friday-night kickoff to Saturday-night demos
    badge: green
    wide: true
  - label: Architecture
    value: One authoritative Node server (20 Hz) · phones, projector and host over WebSockets · Canvas pixel renderer · Claude Haiku for Gus's lines
    mono: true
    wide: true
  - label: Live demo
    value: On free hosting, so the first load after idle can take about 20 seconds
    wide: true
  - label: Source
    value: Team repository · code walkthrough on request
    wide: true

problem: |
  A hackathon demo has about two minutes and a room of strangers, and every extra step (an app
  install, a sign-up, a text box) loses half of them. The team's first idea was a typing game:
  you wrote a lie, a bribe or a prompt injection, and Claude decided whether the bouncer let you
  in. Playtesters said typing was annoying and the game asked too much thinking.

solution: |
  Club Velvet is a game everyone already knows the rules of. The projector shows the club
  entrance, and each phone becomes one big HOLD TO SNEAK button: hold to creep towards the door,
  let go before Gus the bouncer turns around. Get caught and you have 5 seconds to mash or shake
  your way out. The first player through the rope becomes VIP Owner and picks a chaos rule for
  everyone still outside, a final crowd vote can overthrow them, and the crown holder is
  Tonight's VIP. Claude plays Gus: it writes the roasts, taunts and each player's end-of-round
  mugshot, and a scripted line always covers for it. The three of us made it together, mostly on
  one or two laptops: Wesley drew the pixel art, and the design, code and pitch were shared. My
  share included researching the event's format, API rate limits and hosting, putting the plan's
  rules through an audit for loopholes, and the pitch deck.

result: |
  We built it in about 24 hours at a hackathon of 200-plus people and did not place. Dozens of
  people joined the line at once during our demo, and the game is still live. The repo carries
  100 passing unit tests that never call the API, and a 20-scenario eval of Claude's lines: 27 of 27 calls valid, median 1.3 s,
  95th percentile 2.7 s, about half a cent in all. Not yet shown: whether first-time players let
  go on Moonwalk without coaching, which the team's ten-player linked playtest flagged as needing
  a human playtest. Phone shake only works over HTTPS, so on plain HTTP every phone falls back
  to tapping.

callouts:
  - section: problem
    tone: blue
    quote: true
    body: |
      "Too much brain. People want to play, not think."

  - section: solution
    tone: amber
    icon: "⏱"
    title: "The Game Never Waits on Claude"
    body: |
      Every Claude call has a hard 4-second timeout and returns nothing on any failure, so the
      room keeps the scripted line it already has. A catch roast is generated during the
      5-second challenge, so the result is instant whether you pass or fail. Player names go to
      the model as marked data, and the reply is validated and trimmed to the font's characters.

  - section: solution
    tone: green
    icon: "🎮"
    title: "A Genre as the Tutorial"
    body: |
      The art direction is a late-90s handheld RPG on a single 16-colour palette, and every sprite
      is drawn in code (Wesley's design). The "!" over a guard's head, the face-off screen and the
      text box are conventions players already know, so the genre teaches the rules and the
      room needs no instructions.

  - section: result
    tone: purple
    icon: "🔍"
    title: "Rules Audit Before the Build"
    body: |
      I put the game plan through a rules audit, which came back with 25 loopholes ranked by
      severity. The first was that the plan never said who wins. The plan was then updated so the
      VIP crown decides it, and several other findings appear in the shipped constants: a cap on
      the grace given to laggy phones, cooldowns on lounge powers, and NPCs that never get in.

# The project's card in /world (WORLD.md §7, §8): zone 8, the night street south of the block.
world:
  zone: club
  link: projects
  linkLabel: Read the case study
  card: |
    We built a Red Light, Green Light game for one projector and a room of phones, with Claude as
    the bouncer who roasts you by name. Three of us, about 24 hours, at a hackathon of 200-plus
    people. We didn't place, but dozens joined the queue at once. The game is live; a slow first
    load is the free hosting.

gallery:
  - src: /projects/club-velvet/stare-down.jpg
    alt: The projector view in pixel art. Players' avatars crowd a street under a CLUB VELVET sign while a STARE-DOWN card shows a caught player with a BRIBE! meter, and Gus says NIGHT OWL. I SAW THAT. PAY UP.
    caption: The stare-down. A caught player gets 5 seconds to mash or shake, while Gus calls them out by name.
  - src: /projects/club-velvet/vip-reveal.jpg
    alt: The projector's reveal screen reading TONIGHT'S VIP, SNEAKY PETE, with a crown. Below it, KEPT THE CROWN, CROWN 5 OF 10 NEEDED, KEEP 5, 19 COULD VOTE.
    caption: The reveal. A strict-majority coup vote decided whether the owner kept the crown, here 5 of 10 needed.
  - src: /projects/club-velvet/host-console.jpg
    alt: The host page listing each player's state (outside, caught or lounge), score and progress bar, with a KICK button on every row.
    caption: The host page on the deployed build. It starts rounds and tracks every player's state, and the host can kick anyone.

mediaCredit: Screens from the team's build of Club Velvet (Tanda AI Hackathon 2026, with Wesley and Jonathan Hii). Pixel art by Wesley, drawn in code. The cover and stare-down frames are rendered from the game's own scene code.
---
