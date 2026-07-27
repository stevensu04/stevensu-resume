/**
 * Tech stack, grouped by layer.
 *
 * Ring membership is the meaning-carrying signal — it replaces the six arbitrary badge
 * colours the old cloud used (cyan meant Tailwind *and* Power Platform *and* Figma, which
 * is to say it meant nothing). Two tones, two layers, and the graphic ends up arguing the
 * "From the bank floor to full-stack" headline instead of decorating it. See PLAN.md §9.
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
        id: "frontend",
        label: "Frontend",
        radius: 168,
        offset: -70,
        speed: 1,
        tone: "primary",
        items: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Figma"],
    },
    {
        id: "backend",
        label: "Backend & Data",
        radius: 190,
        offset: 70,
        speed: -0.75,
        tone: "dark",
        items: ["Python", "Django", "Java", "SQL", "GitHub", "Power Platform"],
    },
];

/**
 * TEMPORARY placement — parked on the About page until Steven's latest resume is reviewed
 * and a permanent home is chosen (likely inside the banking narrative). PLAN.md §9.
 *
 * These left the hero for two reasons: they are 4× the width of the tech names, which is what
 * actually broke the old cloud's symmetry; and they are business-analyst vocabulary competing
 * with the engineering signal in a hero aimed at graduate SWE roles.
 */
export const professionalSkills = [
    "Stakeholder Engagement",
    "Process Analysis",
    "Business Documentation",
    "Cross-cultural Communication",
];
