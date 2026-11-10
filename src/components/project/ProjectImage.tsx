"use client";
import { useState } from "react";
import { FaLock } from "react-icons/fa";
import type { Project } from "@/lib/project-schema";

/**
 * Renders the project image, or a placeholder when there is no image (or the file failed to
 * load). Two distinct placeholders for two distinct meanings — a plain "FF"-style initials
 * card reads as "no screenshot yet"; that's the wrong message for a client/government project
 * that can never have a public screenshot, so `confidential` projects get their own treatment.
 *
 * A client component only for the `onError` fallback. Shared by the /projects grid and the
 * /projects/[slug] case study pages.
 */
export default function ProjectImage({ project, className = "" }: { project: Project; className?: string }) {
    const [failed, setFailed] = useState(false);

    if (!project.img || failed) {
        if (project.confidential) {
            return <ConfidentialPlaceholder project={project} className={className} />;
        }

        const initials = project.title
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

        return (
            <div
                role="img"
                aria-label={`${project.title} — no cover image`}
                className={`flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-700 ${className}`}
            >
                <span className="text-4xl font-black tracking-tight text-white/90">{initials}</span>
                <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                    {project.category}
                </span>
            </div>
        );
    }

    return (
        <img
            src={project.img}
            alt={project.title}
            onError={() => setFailed(true)}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${className}`}
        />
    );
}

/**
 * "Under NDA" placeholder — a blurred, abstract mock-dashboard (built from plain divs, not a
 * fetched or embedded image) standing in for the real screenshot, with a frosted-glass lock
 * card on top. Reads as "something real is behind this, it's just covered" rather than a
 * blank box, which is a truer signal for a client/government project than plain initials.
 *
 * The mock shapes are deliberately generic (a "nav bar", a few "cards", two "chart" bars) —
 * enough visual weight to survive the blur without implying a specific real interface.
 */
function ConfidentialPlaceholder({ project, className = "" }: { project: Project; className?: string }) {
    return (
        <div
            role="img"
            aria-label={`${project.title} — screenshot withheld under NDA`}
            className={`relative h-full w-full overflow-hidden bg-slate-900 ${className}`}
        >
            {/* Fake dashboard. Scaled up past its own container before blurring, so the blur
                radius doesn't reveal crisp shape edges at the card boundary. */}
            <div className="absolute inset-0 scale-110 opacity-70 blur-lg" aria-hidden="true">
                <div className="absolute inset-x-0 top-0 h-9 bg-slate-700/80" />
                <div className="absolute left-4 top-16 h-20 w-28 rounded-lg bg-blue-500/60" />
                <div className="absolute left-36 top-16 h-20 w-36 rounded-lg bg-emerald-500/50" />
                <div className="absolute right-4 top-16 h-20 w-24 rounded-lg bg-amber-500/50" />
                <div className="absolute inset-x-4 top-40 h-20 rounded-lg bg-slate-600/60" />
                <div className="absolute bottom-8 left-4 h-2 w-2/3 rounded bg-slate-500/70" />
                <div className="absolute bottom-[52px] left-4 h-2 w-1/2 rounded bg-slate-500/50" />
            </div>

            {/* Scrim so the frosted card and its text hold contrast regardless of what the
                mock shapes underneath happen to line up with. */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/70 to-slate-950/90" />

            <div className="absolute inset-0 flex items-center justify-center p-6">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-8 py-6 text-center backdrop-blur-md">
                    <FaLock className="mb-1 text-xl text-white/70" />
                    <span className="text-lg font-bold leading-tight text-white">{project.title}</span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                        Under NDA
                    </span>
                </div>
            </div>
        </div>
    );
}
