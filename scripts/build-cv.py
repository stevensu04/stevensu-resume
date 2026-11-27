#!/usr/bin/env python3
"""
Builds public/StevenSu_Resume.pdf — the CV behind the two "Download CV" buttons
(src/app/page.tsx and src/app/about/page.tsx, both via `site.cv`).

Why this script exists at all: the previous public/StevenSu_Resume.pdf was a one-off
ReportLab artifact with no generator in the repo, so nobody could review or re-cut it.
Its text had drifted badly — the summary ended "...to EY's Technology Consulting
graduate program", which is a cover-letter sentence sitting behind a public download
button on a software-engineering portfolio. The content now lives here as reviewable
text, so a diff shows what changed on the CV.

THE THREE RULES THIS FILE EXISTS TO ENFORCE (scripts/check-cv.mjs re-checks them):

  1. No named employer, programme or location target. This PDF is downloaded by
     everyone who visits the site, so it cannot be tailored to one application.
     Per-application versions (e.g. the Nisient one, which carries "Willing to
     relocate to the Sunshine Coast") are kept outside this repo and must never
     be copied over public/StevenSu_Resume.pdf.

  2. Every /world stop is on it. WorldShell tells visitors "Everything you'll find
     here is also on my CV", so Skyveil Studio (station 6), the E.SUN 10% wait-time
     number (station 1) and Club Velvet (station 8, added 26 Nov 2026) must all stay. Skyveil Studio appears. /world station 6 (src/lib/world.ts) and /about both
     present it as a current role, so a CV without it contradicts the site.

  3. /Title and /Author are set. The old PDF had both as "(anonymous)", which is
     what an ATS and the reader's PDF viewer tab showed.

Also deliberate, and different from the per-application versions:

  - No street suburb, no mobile number. Anyone (crawlers included) can fetch this
    file, and no other page on the site publishes either. Email + LinkedIn only.
  - Work-rights wording is copied verbatim from site.workRights: "Applying for",
    never "holding", "eligible" or "no sponsorship required" (src/lib/site.ts
    records that Steven confirmed this on 11 Nov 2026).
  - The first two skill bucket names, "Technical Stack" and "Data & DevOps", are a
    hard contract with src/lib/stack.ts: the hero orbit's two ring labels and their
    items are a one-to-one mapping of these two lines. Change a bucket here, change
    techRings there in the same commit.

Usage:  python3 scripts/build-cv.py            # writes public/StevenSu_Resume.pdf
        python3 scripts/build-cv.py out.pdf    # writes somewhere else (for diffing)

After rebuilding: set site.cvUpdated (src/lib/site.ts) to the new month, then run
`npm run check:cv`. The same check runs in CI (.github/workflows/check-cv.yml).
"""

import sys
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAME = "PO-CHUN (STEVEN) SU"
ROLE = "Full-Stack Developer"
EMAIL = "stevensu04@gmail.com"
# Keep in sync with site.linkedin / site.github (src/lib/site.ts).
LINKEDIN = "https://www.linkedin.com/in/po-chun-steven-su-446746243"
LINKEDIN_TEXT = "linkedin.com/in/po-chun-steven-su-446746243"
GITHUB = "https://github.com/stevensu04"
GITHUB_TEXT = "github.com/stevensu04"

INK = HexColor("#111111")
MUTED = HexColor("#444444")
RULE = HexColor("#999999")

# ---------------------------------------------------------------------------
# Content. Everything below is the CV's text; the layout code follows after.
# ---------------------------------------------------------------------------

# Line 2 of the header. No suburb, no phone — see rule notes at the top.
CONTACT = f"Brisbane, Australia &nbsp;·&nbsp; {EMAIL} &nbsp;·&nbsp; {LINKEDIN_TEXT} &nbsp;·&nbsp; {GITHUB_TEXT}"

# Line 3. Verbatim from site.availability + site.workRights.
STATUS = (
    "Coursework complete Nov 2026, graduating Dec 2026 &nbsp;·&nbsp; "
    "Applying for a 485 Temporary Graduate visa (full work rights) &nbsp;·&nbsp; "
    "Open to relocating within Australia"
)

# No company and no programme named here — rule 1.
SUMMARY = (
    "Master of IT student at UQ (GPA 6.0/7.0), graduating December 2026, seeking a 2027 graduate "
    "software engineering role in Australia. Top contributor on a six-person 3D web storefront "
    "capstone — 160 of 589 commits — owning sign-in and roles, a Python deployment-migration CLI "
    "and ~30 test suites. Alongside it, co-founding a browser-games studio, and earlier a "
    "Django/Airflow platform for a green-power trading desk and the data layer of a carbon-aware "
    "routing API."
)

# "Technical Stack" and "Data & DevOps" are mirrored by techRings in src/lib/stack.ts;
# "Delivery & Collaboration" is mirrored by professionalSkills there.
SKILLS = [
    (
        "Technical Stack",
        "Python, TypeScript, JavaScript, Java, SQL, React, Next.js, Three.js, Django, FastAPI, REST APIs",
    ),
    ("Data & DevOps", "PostgreSQL, MongoDB, Airflow (ETL), Docker, GitHub Actions"),
    ("Testing & Tooling", "pytest, Vitest, Playwright, Git, Linux (Ubuntu on GCP), Bash, AWS S3"),
    (
        "Delivery & Collaboration",
        "Stakeholder Engagement, Requirements Elicitation, Agile/Scrum Methodologies, "
        "UI/UX Prototyping (Figma), Technical Documentation",
    ),
]

EDUCATION = [
    (
        "Master of Information Technology",
        "The University of Queensland",
        "Graduating Dec 2026",
        [
            "GPA 6.0/7.0 (Distinction average). Coursework: Algorithms &amp; Data Structures, "
            "Cloud Computing, Information Retrieval, Relational Database Systems, "
            "Human-Computer Interaction.",
        ],
    ),
    (
        "Master of Economics &amp; Finance; Bachelor of Economics",
        "Tamkang University, Taiwan",
        "2018 – 2019",
        [],
    ),
]

# Skyveil Studio is first, and it is required to be here — rule 2. The wording is the
# same set of facts /about (ExperienceItem) and /world station 6 already publish. Veilcore
# is a team build: the line credits Cradle and Archery as Steven's main share and nothing finer.
EXPERIENCE = [
    (
        "Co-founder &amp; Web Developer",
        "Skyveil Studio, Brisbane QLD",
        "Aug 2026 – Present",
        [
            "Co-founded an independent studio building hand-tracked browser games — webcam in, "
            "no controller, no download (MediaPipe, Three.js).",
            "Our first title, Veilcore, is built as a museum and a theatre. The team made it "
            "together, and I worked mostly on its Cradle and Archery rooms.",
        ],
    ),
    (
        "Intelligent System R&amp;D Intern",
        "Star Trade (HDRE Group), Taiwan · team of 2",
        "Jun 2026 – Jul 2026",
        [
            "Built StarLens end-to-end: an internal market-intelligence web app (Django, HTMX) "
            "for a green-power trading desk, replacing client briefs assembled by hand from "
            "Excel exports, PDFs and web crawls.",
            "Engineered nightly Airflow ETL pipelines and optimised MongoDB indices, cutting "
            "page latency from 4s to under 2s.",
            "Injected live database metrics into async OpenAI API calls to draft audit-ready "
            "B2B pitches from real data.",
        ],
    ),
]

PROJECTS = [
    (
        "Formosa Bauhaus — 3D Web Storefront &amp; AI Pipeline",
        "UQ Capstone · team of 6",
        "Aug – Oct 2026",
        [
            # Same wording as content/projects/formosa-bauhaus.md. Optiver partnered the award;
            # naming it is a credential, not an application target (rule 1).
            "Won the Smart Tech Award, partnered by Optiver, at UQ Illuminate 2026, UQ's "
            "industry-judged end-of-year showcase.",
            "Top contributor — 160 of 589 commits — on a React/Three.js and FastAPI/PostgreSQL "
            "storefront that labels which surfaces of an AI-generated 3D model were photographed "
            "and which the generator inferred; deployed on AWS behind Nginx.",
            "Sole author of catalogue_bundle.py, a 305-line Python CLI migrating finished products "
            "between deployments that share no database or storage: SHA-256 manifests, dry-run and "
            "per-SKU modes, S3 or local storage, IDs reassigned on import.",
            "Built sign-in and the shopper/staff role ladder, the cart, and storefront navigation "
            "and fitting-room interactions, and fixed how accurately the AR mirror's garments follow "
            "the body; wrote ~30 Vitest and pytest suites plus the committed "
            "coverage and smoke reports.",
        ],
    ),
    (
        "Club Velvet — Party Game with a Claude Bouncer",
        "Tanda AI Hackathon · team of 3",
        "Nov 2026",
        [
            "Co-built in 24 hours with two teammates among 200+ participants: a Red Light, Green "
            "Light game for a projector and a room of phones (TypeScript, Node, WebSockets, one "
            "20 Hz authoritative server); dozens of players joined at once in the demo.",
            "Claude writes the bouncer's roasts via structured outputs, with a 4 s timeout and "
            "scripted fallbacks so play never waits on it; 100 unit tests plus an eval of its lines.",
        ],
    ),
    (
        "Eco Router — Carbon-Aware Compute Routing API",
        "UQCS Hackathon · team of 5",
        "Aug 2026",
        [
            "Owned the data layer of the TypeScript/Express backend: a deterministic generator for "
            "100 GPU nodes across 33 real grid zones, plus the Zod schemas five teammates coded "
            "against as the API contract.",
            "Wrote the dataset integrity tests and stress-tested POST /recommend with 30+ malformed "
            "inputs, catching a negative budget that disqualified every node yet still returned "
            "HTTP 200; audited pricing and showed it ran ~8x high.",
        ],
    ),
]

OTHER = [
    (
        "Business Support Partner Intern",
        "IT LANDS, NRMMRRD, Queensland Government",
        "Oct 2025 – Jan 2026",
        [
            "Shipped an automated approval workflow (Power Apps, Power Automate, SharePoint) "
            "replacing a manual financial process, shaped in UI/UX workshops with 10+ "
            "stakeholders; projected 30% efficiency gain.",
        ],
    ),
    (
        "Financial Services Consultant",
        "E.SUN Commercial Bank, Taiwan",
        "Aug 2022 – Apr 2024",
        [
            "Advised 20+ retail clients daily in a regulated environment, delivering 120% of KPIs; "
            "worked with the digital banking team to cut client wait times by 10%.",
        ],
    ),
]

# Same roles /about (ActivityItem) and /world's "Off the timetable" stop publish.
LEADERSHIP = (
    "<b>Vice President</b>, UQ Graduate Union of Taiwanese Students (2025 – 2026) — 100+ members. "
    "<b>Social Media Coordinator &amp; Copywriter</b>, Australia Career Forum "
    "(2026 – Present; event volunteer from 2025)."
)

# ---------------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------------

BODY_SIZE = 8.8
LEADING = 10.5

styles = {
    "name": ParagraphStyle(
        "name", fontName="Helvetica-Bold", fontSize=17, leading=19.5,
        alignment=1, textColor=INK, spaceAfter=1.5,
    ),
    "role": ParagraphStyle(
        "role", fontName="Helvetica", fontSize=9.4, leading=11.5, alignment=1,
        textColor=MUTED, spaceAfter=3.5,
    ),
    "contact": ParagraphStyle(
        "contact", fontName="Helvetica", fontSize=8.4, leading=10.5, alignment=1,
        textColor=INK, spaceAfter=1.5,
    ),
    "status": ParagraphStyle(
        "status", fontName="Helvetica-Oblique", fontSize=8.2, leading=10.2,
        alignment=1, textColor=MUTED,
    ),
    "summary": ParagraphStyle(
        "summary", fontName="Helvetica", fontSize=BODY_SIZE, leading=LEADING,
        alignment=TA_JUSTIFY, textColor=INK,
    ),
    "section": ParagraphStyle(
        "section", fontName="Helvetica-Bold", fontSize=9.2, leading=11,
        textColor=INK, spaceBefore=0, spaceAfter=1.5,
    ),
    "entry": ParagraphStyle(
        "entry", fontName="Helvetica-Bold", fontSize=BODY_SIZE + 0.4, leading=LEADING,
        textColor=INK,
    ),
    "date": ParagraphStyle(
        "date", fontName="Helvetica-Oblique", fontSize=BODY_SIZE - 0.3, leading=LEADING,
        alignment=2, textColor=MUTED,
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName="Helvetica", fontSize=BODY_SIZE, leading=LEADING,
        leftIndent=9, bulletIndent=1, spaceBefore=0.6, textColor=INK,
    ),
    "plain": ParagraphStyle(
        "plain", fontName="Helvetica", fontSize=BODY_SIZE, leading=LEADING, textColor=INK,
    ),
    "skill": ParagraphStyle(
        "skill", fontName="Helvetica", fontSize=BODY_SIZE, leading=LEADING,
        leftIndent=0, spaceBefore=1.2, textColor=INK,
    ),
}

FRAME_WIDTH = A4[0] - 2 * 14 * mm


def section(label):
    """A small-caps-ish section heading with a hairline under it."""
    # Escape per character, then letter-space: escaping the joined string would turn
    # every "&nbsp;" separator into a literal "&amp;nbsp;".
    spaced = "&nbsp;".join("&amp;" if c == "&" else c for c in label.upper())
    return [
        Spacer(1, 6),
        Paragraph(spaced, styles["section"]),
        HRFlowable(width="100%", thickness=0.6, color=RULE, spaceBefore=0, spaceAfter=3.5),
    ]


def entry(title, org, date, bullets):
    """One role/project: bold title, organisation, right-aligned date, then bullets."""
    left = f"<b>{title}</b>" + (f" &nbsp;|&nbsp; {org}" if org else "")
    head = Table(
        [[Paragraph(left, styles["entry"]), Paragraph(date, styles["date"])]],
        colWidths=[FRAME_WIDTH * 0.78, FRAME_WIDTH * 0.22],
    )
    head.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ])
    )
    flow = [head]
    for b in bullets:
        flow.append(Paragraph(b, styles["bullet"], bulletText="•"))
    flow.append(Spacer(1, 3.2))
    # KeepTogether stops a heading from being orphaned if the content ever grows
    # past one page — it fails loudly as a second page instead of silently splitting.
    return [KeepTogether(flow)]


def build(out_path):
    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=8 * mm,
        bottomMargin=8 * mm,
        title=f"Po-Chun (Steven) Su — {ROLE}",
        author="Po-Chun (Steven) Su",
        subject="Resume",
        creator="scripts/build-cv.py",
        keywords="software engineer, full-stack, Python, TypeScript, Django, Next.js",
    )

    story = [
        Paragraph(NAME, styles["name"]),
        Paragraph(ROLE, styles["role"]),
        Paragraph(
            CONTACT.replace(EMAIL, f'<link href="mailto:{EMAIL}" color="#111111">{EMAIL}</link>')
            .replace(LINKEDIN_TEXT, f'<link href="{LINKEDIN}" color="#111111">{LINKEDIN_TEXT}</link>')
            .replace(GITHUB_TEXT, f'<link href="{GITHUB}" color="#111111">{GITHUB_TEXT}</link>'),
            styles["contact"],
        ),
        Paragraph(STATUS, styles["status"]),
        Spacer(1, 7),
        Paragraph(SUMMARY, styles["summary"]),
    ]

    story += section("Technical Skills")
    for label, items in SKILLS:
        story.append(Paragraph(f"<b>{label}:</b> &nbsp;{items}", styles["skill"]))

    story += section("Engineering Experience")
    for e in EXPERIENCE:
        story += entry(*e)

    story += section("Engineering Projects")
    for p in PROJECTS:
        story += entry(*p)

    story += section("Education")
    for e in EDUCATION:
        story += entry(*e)

    story += section("Other Experience")
    for o in OTHER:
        story += entry(*o)

    story += section("Leadership & Activities")
    story.append(Paragraph(LEADERSHIP, styles["plain"]))

    doc.build(story)


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "public" / "StevenSu_Resume.pdf"
    build(target)
    print(f"wrote {target}")
