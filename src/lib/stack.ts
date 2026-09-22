/**
 * Tech stack, grouped by layer.
 *
 * Ring membership is the meaning-carrying signal — it replaces the six arbitrary badge
 * colours the old cloud used (cyan meant Tailwind *and* Power Platform *and* Figma, which
 * is to say it meant nothing). Two tones, two layers, and the graphic ends up arguing the
 * "From the bank floor to full-stack" headline instead of decorating it. See PLAN.md §9.
 *
 * Ring names and contents are now a direct mapping from the "TECHNICAL & CONSULTING
 * COMPETENCIES" section of Steven's Aug 2026 resume — "Technical Stack" and "Data & DevOps"
 * are the resume's own category names, not an invented Frontend/Backend split. That makes
 * this list mechanically checkable against the resume rather than a judgment call: add a
 * line to the resume, add the same string here.
 *
 * Two items that were previously here are gone because the resume itself doesn't put them
 * in these two competency buckets:
 *   - Figma → resume lists it under "Consulting & Delivery" ("UI/UX Prototyping (Figma)"),
 *     so it moved to `professionalSkills` below instead of the hero orbit.
 *   - Power Platform → not listed under any competency bucket on the resume (only mentioned
 *     inside one experience bullet). Dropping it from the hero is consistent with the
 *     resume's own choice to keep low-code tooling out of the headline technical stack.
 */

export interface StackRing {
    id: string;
    label: string;
    /** Orbit radius in px. */
    radius: number;
    /** Vertical offset from the scene centre, px. */
    offset: number;
    /** Multiplier on the shared rotation scalar; negative counter-rotates. */
    speed: number;
    tone: "primary" | "dark";
    items: string[];
}

export const techRings: StackRing[] = [
    {
        id: "technical-stack",
        label: "Technical Stack",
        // Larger radius than the 5-item ring: 10 items around the same circle need more
        // circumference per badge, or neighbours crowd each other near the front of the
        // orbit (where several items sit at similar depth at once). Verified empirically —
        // see PLAN.md §9 — by sweeping --rot and checking bounding-box overlap.
        radius: 250,
        offset: -60,
        speed: 1,
        tone: "primary",
        items: [
            "Python",
            "Java",
            "SQL",
            "JavaScript",
            "TypeScript",
            "HTML/CSS",
            "React",
            "Next.js",
            "Django",
            "RESTful APIs",
        ],
    },
    {
        id: "data-devops",
        label: "Data & DevOps",
        // Bumped from 160 — measured a 44px overlap between "MongoDB" and "Git & GitHub" at
        // rot≈315° with the smaller radius. "Git/GitHub" also shortened to "GitHub" (git is
        // the implied prerequisite) to reduce the pill's footprint further.
        radius: 195,
        offset: 65,
        speed: -0.75,
        tone: "dark",
        items: ["MySQL", "MongoDB", "GitHub", "Docker", "Airflow"],
    },
];

/**
 * Consulting & Delivery — the resume's own third competency bucket, shown on the About page
 * rather than the hero orbit. These are the resume's exact five items (UI/UX Prototyping
 * abbreviated from "UI/UX Prototyping (Figma)" to fit a pill; Figma itself lives here, not
 * in the tech rings — see the note above `techRings`).
 */
export const professionalSkills = [
    "Requirements Elicitation",
    "Stakeholder Engagement",
    "Agile/Scrum Methodologies",
    "UI/UX Prototyping (Figma)",
    "Technical Documentation",
];
