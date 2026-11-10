/**
 * Single source for every /world card that isn't a project (WORLD.md §7, §8), like `site.ts` is
 * for site-wide copy. Project cards live in each project's front matter (`world:`) and are turned
 * into the same shape by `projectWorldCards`.
 *
 * Client-safe: no `fs`. The /world page reads projects on the server and passes plain cards down.
 */
import { caseStudyHref, type Project, type WorldZone } from "./project-schema";
import { site } from "./site";

export type WorldLink = { label: string; href: string };

export type WorldCard = {
    /** Matches an object in `src/app/world/objects.ts`. */
    id: string;
    zone: WorldZone | "gallery" | "exit";
    /** Line 1, bold: the name. */
    title: string;
    /** Line 1, after the name: `status.label` for projects; org · place · dates for career cards. */
    subtitle?: string;
    body: string;
    links: WorldLink[];
};

export type GalleryPhoto = {
    /** Under public/. null until Steven supplies the photo: the slot says so instead of guessing. */
    src: string | null;
    alt: string;
    caption: string;
};

/** Career and story cards. Copy from WORLD.md §7, which is where it is reviewed. */
export const WORLD_CARDS: WorldCard[] = [
    {
        id: "esun",
        zone: "ferry",
        title: "E.SUN Commercial Bank",
        subtitle: "Taipei · Aug 2022 – Apr 2024",
        body: "Two years on the customer side of workflows somebody else had designed. I worked with the digital banking team to fix the worst of them and cut client wait times by 10%. Then I decided I'd rather build them than work around them.",
        links: [{ label: "See the full timeline", href: "/about#experience" }],
    },
    {
        id: "crossing",
        zone: "ferry",
        title: "The crossing",
        subtitle: "Taipei → Brisbane",
        // The one card over the §7 limits, which it earns: it answers the question interviewers ask.
        body: "Banking was stable and structured, and after a while it stopped pulling me forward — so I went looking for what would. Once I threw myself into learning IT, I found opportunity and challenge in equal measure. The AI era began while I was still at the bank, and I sensed it would start replacing the work people do. So I moved to the side that builds it — and that sense keeps proving right.",
        links: [],
    },
    {
        id: "degree",
        zone: "uq",
        title: "Master of Information Technology",
        subtitle: "The University of Queensland · Feb 2025 – Nov 2026",
        body: "GPA 6.0/7.0, Distinction average. Databases, HCI, cloud, algorithms, information retrieval. Graduating November 2026.",
        links: [{ label: "Education", href: "/about#education" }],
    },
    {
        id: "timetable",
        zone: "uq",
        title: "Off the timetable",
        body: "Vice President of the UQ Graduate Union of Taiwanese Students — strategic planning for 100+ members and the university liaison work nobody volunteers for. Social media coordinator for the Australia Career Forum, writing the copy that filled rooms of 50+. Both taught me more about stakeholders than any course did.",
        links: [{ label: "Activities", href: "/about#activities" }],
    },
    {
        id: "one-more-thing",
        zone: "site",
        title: "One more thing",
        body: "The version of me you're walking around came out of this project.",
        links: [],
    },
    {
        // No project file yet (WORLD.md §8, §14 Q1), so it links to the timeline.
        id: "skyveil",
        zone: "garage",
        title: "Skyveil Studio",
        subtitle: "Co-founder · Aug 2026 – Present",
        body: "An independent studio making hand-tracked browser games — webcam in, no controller, no download. For our first title, Veilcore, I built the shrinking-target practice mode, the Cradle mini-game and the Gauntlet leaderboard. Built with MediaPipe and Three.js — the second of which you're standing in.",
        links: [{ label: "See the experience", href: "/about#experience" }],
    },
    {
        id: "gallery",
        zone: "gallery",
        title: "The gallery",
        body: "Seven places, seven photographs. Opens at 7 of 7.",
        links: [],
    },
    {
        id: "exit",
        zone: "exit",
        title: "Before you go",
        // The only line repeated anywhere on the site (§7): site.summary, once, here.
        body: site.summary,
        links: [
            { label: "Download the CV", href: site.cv },
            { label: "Email", href: `mailto:${site.email}` },
            { label: "LinkedIn", href: site.linkedin },
            { label: "GitHub", href: site.github },
        ],
    },
];

/** The exit board's second line: availability, plus work rights once they are confirmed. */
export const EXIT_FOOTNOTE = [site.availability, site.workRights].filter(Boolean).join(" · ");

/**
 * One photo per content zone. Captions are drafts in Steven's register (§7); he supplies the
 * photos and the final wording. `src: null` renders an honest empty slot.
 */
export const GALLERY_PHOTOS: GalleryPhoto[] = [
    { src: null, alt: "Steven, headshot", caption: "This is me. Hello." },
    { src: null, alt: "Steven on a tennis court", caption: "Tennis Club president at Tamkang. Still play. Still lose to the same people." },
    { src: null, alt: "Steven's school track and field team", caption: "School team, track and field." },
    { src: null, alt: "The UQ Graduate Union of Taiwanese Students committee", caption: "The committee, 2026." },
    { src: null, alt: "Brisbane in February 2025", caption: "First week here, February 2025." },
    { src: null, alt: "Photo to come", caption: "Caption to come." },
    { src: null, alt: "Photo to come", caption: "Caption to come." },
];

/** A project's front-matter `world:` block, as a card. Title, status and URLs are the project's own. */
export function projectWorldCards(projects: Project[]): WorldCard[] {
    return projects.flatMap((p) => {
        if (!p.world) return [];
        const href = p.world.link === "projects" ? caseStudyHref(p.slug) : p.world.link === "demo" ? p.demo! : p.repo!;
        return [
            {
                id: p.slug,
                zone: p.world.zone,
                title: p.title,
                subtitle: p.status?.label,
                body: p.world.card,
                links: [{ label: p.world.linkLabel, href }],
            },
        ];
    });
}
