/**
 * Single source of truth for site-wide messaging.
 *
 * The positioning is one sentence, repeated everywhere:
 *   "Full-stack developer who came from banking — I ask why the workflow exists
 *    before I write the code that replaces it."
 *
 * Change the pitch here and it changes on every surface. See PLAN.md §1.
 */

export const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const site = {
    name: "Steven Su",
    role: "Full-Stack Developer",
    location: "Brisbane, Australia",

    /** Hero headline. Six words — suits the word-stagger animation. */
    headline: "From the bank floor to full-stack.",

    /** Hero sub-paragraph. Carries the credentials and the stack. */
    intro:
        "I spent two years at E.SUN Bank before moving into engineering — now I'm completing a Master of IT at UQ (6.14/7) and building with Next.js, TypeScript, Python and Django. I've shipped software inside Queensland Government.",

    /** One-line version, used for metadata and the footer. */
    summary:
        "Full-stack developer who came from banking. I ask why the workflow exists before I write the code that replaces it.",

    /** Numbers, above the fold. Proof beats adjectives. */
    proof: [
        { value: "30%", label: "projected efficiency gain", context: "QLD Government automation" },
        { value: "10%", label: "reduction in client wait times", context: "E.SUN Bank" },
        { value: "6.14/7", label: "Master of IT GPA", context: "UQ, Distinction average" },
    ],

    availability: "Graduating Nov 2026 · Available for 2027 graduate programs",

    /**
     * TODO(steven): set this once confirmed — e.g. "Full working rights (subclass 485 on graduation)".
     * Left null so the clause is omitted rather than guessed. This is the line most likely to get an
     * application filtered before a human reads it. See PLAN.md §9.
     */
    workRights: null as string | null,

    /**
     * Rotating text on the floating contact badge. No "designer", no "freelancer".
     *
     * Length-constrained: it is laid out on a circular `textPath` of ~232 user units. Anything
     * longer laps its own start — the previous string measured 250 units and rendered as
     * "Brisbane, AFull-Stack Developer". This one measures ~197, leaving a ~15% gap so it still
     * fits when font rendering differs across machines. Re-measure if you change it:
     * `textEl.getComputedTextLength()` vs `pathEl.getTotalLength()`.
     */
    rotator: "Full-Stack Developer • Next.js, Python, SQL •",

    email: "stevensu04@gmail.com",
    github: "https://github.com/stevensu04",
    linkedin: "https://www.linkedin.com/in/po-chun-steven-su-446746243/",

    /** TODO(steven): export the CV to PDF and place it here. See PLAN.md §3. */
    cv: "/StevenSu_Resume.pdf",
} as const;
