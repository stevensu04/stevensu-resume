import { FaExternalLinkAlt, FaGithub, FaCode, FaLightbulb } from "react-icons/fa";
import { toneClasses, type Project, type ProjectCallout } from "@/lib/project-schema";

/**
 * Presentation pieces shared by the /projects grid (a client component) and the
 * /projects/[slug] case study pages (Server Components). No hooks and no "use client", so they
 * render on the server where they can and cost nothing extra where the grid already ships them.
 */

export function StatusBadge({ status, className = "" }: { status: NonNullable<Project["status"]>; className?: string }) {
    return (
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${toneClasses[status.tone].badge} ${className}`}>
            {status.label}
        </span>
    );
}

export function TechTags({ tech, className = "" }: { tech: string[]; className?: string }) {
    return (
        <div className={`flex flex-wrap gap-2 ${className}`}>
            {tech.map((t) => (
                <span key={t} className="rounded bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">
                    #{t}
                </span>
            ))}
        </div>
    );
}

/**
 * Live demo and source links. `inline` is the small text style used on cards; `buttons` is the
 * full-size pair on the case study page. Renders nothing when the project has neither.
 */
export function ProjectLinks({
    project,
    variant,
    className = "",
}: {
    project: Pick<Project, "demo" | "repo">;
    variant: "inline" | "buttons";
    className?: string;
}) {
    if (!project.demo && !project.repo) return null;

    const inline = "inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-blue-600 transition-colors";
    const demoClass = variant === "inline"
        ? inline
        : "inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600";
    const repoClass = variant === "inline"
        ? inline
        : "inline-flex items-center gap-2 rounded-lg border-2 border-black px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-black hover:text-white";

    return (
        <div className={`flex flex-wrap items-center ${variant === "inline" ? "gap-4" : "gap-3"} ${className}`}>
            {project.demo && (
                // A demo on this site (/world) opens in place; anything else in a new tab.
                <a href={project.demo} {...(project.demo.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })} className={demoClass}>
                    <FaExternalLinkAlt className={variant === "inline" ? "text-[10px]" : "text-xs"} /> Live Demo
                </a>
            )}
            {project.repo && (
                <a href={project.repo} target="_blank" rel="noopener noreferrer" className={repoClass}>
                    <FaGithub className="text-xs" /> {variant === "inline" ? "Source" : "View Source"}
                </a>
            )}
        </div>
    );
}

/** 資料驅動：meta comes from the markdown file, not from JSX. */
export function ProjectMetaGrid({ meta, className = "" }: { meta: Project["meta"]; className?: string }) {
    if (meta.length === 0) return null;
    return (
        <dl className={`grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm ${className}`}>
            {meta.map((m) => (
                <div key={m.label} className={m.wide ? "col-span-2" : ""}>
                    <dt className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                        {m.label}
                    </dt>
                    <dd>
                        {m.badge ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${toneClasses[m.badge].badge}`}>
                                {m.value}
                            </span>
                        ) : (
                            <span className={m.mono
                                ? "font-mono text-[11px] text-gray-600 block leading-tight"
                                : "font-bold text-black"}>
                                {m.value}
                            </span>
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function Callout({ callout }: { callout: ProjectCallout }) {
    const tone = toneClasses[callout.tone];

    if (callout.quote) {
        return (
            <div className={`mt-4 p-4 rounded-xl border-l-4 ${tone.panel} border-l-current ${tone.title}`}>
                <p className="text-sm font-semibold italic">&ldquo;{callout.body}&rdquo;</p>
            </div>
        );
    }

    return (
        <div className={`mt-4 flex items-start gap-3 p-4 rounded-xl border ${tone.panel}`}>
            {callout.icon && <div className="text-sm mt-0.5" aria-hidden="true">{callout.icon}</div>}
            <div>
                {callout.title && (
                    <p className={`text-xs font-bold mb-1 uppercase tracking-wider ${tone.title}`}>
                        {callout.title}
                    </p>
                )}
                <p className={`text-xs leading-relaxed ${tone.body}`}>{callout.body}</p>
            </div>
        </div>
    );
}

/** 01 Problem / 02 Solution, each followed by its callouts. */
export function CaseStudyNarrative({ project }: { project: Project }) {
    const calloutsFor = (section: ProjectCallout["section"]) =>
        (project.callouts ?? []).filter((c) => c.section === section);

    return (
        <div className="space-y-8">
            <section>
                <h2 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                    <FaLightbulb className="text-yellow-500" aria-hidden="true" /> 01 - Problem &amp; Challenge
                </h2>
                <p className="text-gray-600 leading-relaxed">{project.problem}</p>
                {calloutsFor("problem").map((c, i) => (
                    <Callout key={i} callout={c} />
                ))}
            </section>

            <section>
                <h2 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                    <FaCode className="text-blue-600" aria-hidden="true" />
                    02 - {project.solutionHeading ?? "Solution & Architecture"}
                </h2>
                <p className="text-gray-600 leading-relaxed">{project.solution}</p>
                {calloutsFor("solution").map((c, i) => (
                    <Callout key={i} callout={c} />
                ))}
            </section>
        </div>
    );
}
