"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { FaPlay } from 'react-icons/fa';
import AnimatedText from '@/components/AnimatedText';
import ProjectImage from '@/components/project/ProjectImage';
import HireCta from '@/components/HireCta';
import { ProjectLinks, StatusBadge, TechTags } from '@/components/project/CaseStudy';
import { caseStudyHref, categoriesFrom, type Project } from '@/lib/project-schema';

/**
 * Interactive projects UI. Content is loaded and validated on the server
 * (`lib/projects.ts`) and handed down as props — this component never touches the
 * filesystem, so adding a project means adding a markdown file, not editing JSX.
 *
 * Every card links to its case study at `/projects/<slug>` — a real URL that can be shared,
 * rather than the modal this used to open.
 */
export default function ProjectsView({ projects }: { projects: Project[] }) {
    const [filter, setFilter] = useState<string>("All");

    // Derived from the content, so a brand-new category needs no code change.
    const categories = categoriesFrom(projects);

    // The flagship project gets a full-width hero instead of a wider grid cell — a separate
    // `featured: true` project stretching one CSS Grid row taller than its neighbours (BrisPulse
    // at 2 columns vs. 1) triggered Grid's default `align-items: stretch`, forcing every card in
    // that row to match the tallest one. That's what produced the dead whitespace inside the
    // Finance Forms card. Pulling the flagship out of the grid entirely removes the mechanism,
    // not just today's symptom of it.
    //
    // Hero only shows on "All" — filtering to the flagship's own category shows it as a normal
    // uniform card alongside its category-mates, not as a special case a filter has to route
    // around.
    const heroProject = filter === "All" ? projects.find((p) => p.featured) : undefined;
    const gridProjects = projects.filter((p) =>
        filter === "All" ? p.slug !== heroProject?.slug : p.category === filter
    );

    return (
        // A <div>, not <main>: the root layout already provides the page's one <main> landmark.
        <div className="w-full min-h-screen py-20 px-8 lg:px-32 bg-white text-black relative">
            <div className="flex flex-col items-center mb-16">
                <AnimatedText text="Innovating Through Code." className="!text-4xl md:!text-5xl lg:!text-6xl mb-4" />
                <p className="text-gray-500 font-medium text-lg text-center max-w-2xl">
                    Bridging Economics and Information Technology to build user-centered digital solutions.
                </p>
            </div>

            {/* Phones: one horizontally scrolling row. Wrapped, the four chips stacked into
                three rows (~190px) and the first project started below the fold. Desktop keeps
                the centred, wrapping row. */}
            <div className="-mx-8 mb-10 flex gap-2 overflow-x-auto px-8 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:mb-20 lg:flex-wrap lg:justify-center lg:gap-4 lg:overflow-visible lg:px-0">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        aria-pressed={filter === cat}
                        className={`shrink-0 whitespace-nowrap rounded-full border-2 px-4 py-2 text-sm font-bold transition-all lg:px-6 lg:text-base ${
                            filter === cat ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-100 hover:border-black"
                        }`}
                    >
                        {cat} ({cat === "All" ? projects.length : projects.filter((p) => p.category === cat).length})
                    </button>
                ))}
            </div>

            {heroProject && (
                <ProjectHero project={heroProject} />
            )}

            {/* Uniform grid — every card here is the same size, deliberately. No `featured`
                span, so nothing can trigger the stretch bug again for a future project. */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {gridProjects.map((project) => (
                    <ProjectCard key={project.slug} project={project} />
                ))}
            </div>

            {/* Someone who has just read the projects is at the point of reaching out. */}
            <HireCta className="mt-24 max-w-4xl" />
        </div>
    );
}

/**
 * Full-width banner for the flagship project — replaces the old `md:col-span-2` grid card.
 * Sits entirely outside the uniform grid below, so its size can never again force Grid's
 * default `align-items: stretch` onto a neighbouring card. See the note above `heroProject`.
 */
function ProjectHero({ project }: { project: Project }) {
    return (
        <div className="mb-16 grid grid-cols-1 items-center gap-8 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:grid-cols-2 lg:gap-12 lg:p-10">
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
                {/* First screen of /projects on desktop, so eager (next/image defaults to lazy). */}
                <ProjectImage project={project} sizes="(min-width: 1024px) 40vw, 92vw" loading="eager" />
                {project.status && <StatusBadge status={project.status} className="absolute left-4 top-4" />}
            </div>

            <div className="flex flex-col items-start">
                <span className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                    Flagship Project
                </span>
                <h2 className="mb-3 text-3xl font-bold text-black md:text-4xl">{project.title}</h2>
                <p className="mb-5 leading-relaxed text-gray-600">{project.summary}</p>

                <TechTags tech={project.tech} className="mb-6" />

                <div className="flex flex-wrap items-center gap-4">
                    <Link
                        href={caseStudyHref(project.slug)}
                        className="rounded-full bg-black px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600"
                    >
                        View Full Case Study
                    </Link>
                    {/* No live demo for some flagships; the film is the next best proof. */}
                    {project.video && (
                        <Link
                            href={`${caseStudyHref(project.slug)}#film`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 transition-colors hover:text-blue-600"
                        >
                            <FaPlay className="text-[10px]" aria-hidden="true" /> Watch the film
                        </Link>
                    )}
                    <ProjectLinks project={project} variant="inline" />
                </div>
            </div>
        </div>
    );
}

// Every card the same size, deliberately — `featured` now only decides who gets the
// full-width ProjectHero treatment above the grid, not this component's own sizing.
function ProjectCard({ project }: { project: Project }) {
    const href = caseStudyHref(project.slug);

    return (
        <div className="relative group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-500">
            <div className="aspect-video w-full bg-gray-100 overflow-hidden relative">
                <ProjectImage project={project} sizes="(min-width: 1024px) 28vw, (min-width: 768px) 44vw, 92vw" />

                {/* 誠實標籤：maturity stated on the card, not buried in the case study. Faded out on
                    hover — its own vertically-centered content block can grow tall enough (long
                    summary + several tech tags) to reach the top-left corner and overlap this,
                    verified for both Finance Forms and JourneyMate. Fading it avoids the overlap
                    at every content length instead of just padding around today's longest case. */}
                {project.status && (
                    <StatusBadge
                        status={project.status}
                        className="absolute left-4 top-4 z-10 transition-opacity duration-300 group-hover:opacity-0 group-focus-within:opacity-0"
                    />
                )}

                {/* Fully opaque, not /80 — a translucent scrim let the confidential placeholder's
                    own "Under NDA" card ghost through behind the tech tags on hover. Also shown
                    on keyboard focus, so the link inside is never focused while invisible. */}
                <div className="card-hover-overlay absolute inset-0 bg-black opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 flex-col justify-center items-center p-6 text-center">
                    <p className="text-white mb-4 text-sm font-medium">{project.summary}</p>
                    <TechTags tech={project.tech} className="justify-center mb-6" />
                    <Link
                        href={href}
                        className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors"
                    >
                        Read the case study
                    </Link>
                </div>
            </div>

            <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-600 font-bold text-xs uppercase tracking-tighter">{project.category}</span>
                    <Link
                        href={href}
                        aria-label={`View details: ${project.title}`}
                        className="text-black hover:text-blue-600 transition-colors font-bold text-sm flex items-center gap-1"
                    >
                        View Details <span className="text-lg" aria-hidden="true">→</span>
                    </Link>
                </div>
                <h3 className="text-xl font-bold text-black">
                    <Link href={href} className="hover:text-blue-600 transition-colors">{project.title}</Link>
                </h3>

                {/* On touch devices this is the only place the summary and stack appear — the
                    hover overlay never fires there. Hidden by CSS for mouse users, so desktop
                    looks unchanged. See .card-inline-detail in globals.css. */}
                <div className="card-inline-detail">
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{project.summary}</p>
                    <TechTags tech={project.tech} className="mt-3" />
                </div>

                {/* 可驗證性：live demo and source, always visible — never behind a hover state */}
                {(project.video || project.demo || project.repo) && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                        {/* The film, when a project has one, as on the flagship above: it jumps to the player. */}
                        {project.video && (
                            <Link
                                href={`${href}#film`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 transition-colors hover:text-blue-600"
                            >
                                <FaPlay className="text-[10px]" aria-hidden="true" /> Watch the film
                            </Link>
                        )}
                        <ProjectLinks project={project} variant="inline" />
                    </div>
                )}
            </div>
        </div>
    );
}
