/**
 * Project content schema — shared by the loader and the UI.
 *
 * Deliberately free of `fs` / `gray-matter` imports so client components can import the
 * types and the tone map. The filesystem side lives in `projects.ts`, which is server-only.
 */

export const TONES = ["blue", "purple", "green", "amber"] as const;
export type Tone = (typeof TONES)[number];

export interface ProjectMeta {
    label: string;
    value: string;
    /** Monospace — for stacks, data sources, architecture strings. */
    mono?: boolean;
    /** Render the value as a coloured pill instead of plain text. */
    badge?: Tone;
    /** Span the full width of the meta grid. */
    wide?: boolean;
}

export interface ProjectCallout {
    section: "problem" | "solution";
    tone: Tone;
    /** Emoji or short glyph shown beside the callout. */
    icon?: string;
    title?: string;
    body: string;
    /** Italic pull-quote styling with a left rule. */
    quote?: boolean;
}

export interface Project {
    slug: string;
    title: string;
    /** Free-form. The filter bar is built from whatever categories exist. */
    category: string;
    /** Lower numbers first. */
    order: number;
    /** null renders a branded placeholder rather than a broken image. */
    img: string | null;
    summary: string;
    tech: string[];
    featured?: boolean;
    /** Honest one-word maturity signal, shown on the card. */
    status?: { label: string; tone: Tone };
    /** Live, working URL. Omit rather than guess — a 404 is worse than no link. */
    demo?: string;
    repo?: string;
    meta: ProjectMeta[];
    problem: string;
    solution: string;
    solutionHeading?: string;
    callouts?: ProjectCallout[];
}

/** Filter options, derived from the content so a new category needs no code change. */
export function categoriesFrom(projects: Project[]): string[] {
    return ["All", ...Array.from(new Set(projects.map((p) => p.category)))];
}

/** Static class maps — Tailwind needs complete class strings at build time. */
export const toneClasses: Record<Tone, { badge: string; panel: string; title: string; body: string }> = {
    blue: {
        badge: "bg-blue-50 text-blue-800",
        panel: "bg-blue-50 border-blue-100",
        title: "text-blue-900",
        body: "text-blue-800",
    },
    purple: {
        badge: "bg-purple-50 text-purple-800",
        panel: "bg-purple-50 border-purple-100",
        title: "text-purple-900",
        body: "text-purple-800",
    },
    green: {
        badge: "bg-green-50 text-green-800",
        panel: "bg-green-50 border-green-100",
        title: "text-green-900",
        body: "text-green-800",
    },
    amber: {
        badge: "bg-amber-50 text-amber-800",
        panel: "bg-amber-50 border-amber-100",
        title: "text-amber-900",
        body: "text-amber-800",
    },
};
