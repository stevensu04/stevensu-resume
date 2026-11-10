import type { Metadata, ResolvingMetadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProjectImage from "@/components/project/ProjectImage";
import {
    CaseStudyNarrative,
    ProjectLinks,
    ProjectMetaGrid,
    StatusBadge,
    TechTags,
} from "@/components/project/CaseStudy";
import { caseStudyHref } from "@/lib/project-schema";
import { getProject, getProjects } from "@/lib/projects";

/**
 * /projects/<slug> — one project's full case study, prerendered from its markdown file.
 * A real URL, so a case study can be linked, shared and indexed (PLAN.md §6). Adding a project
 * file adds a page here with no code change.
 */

// Every slug is known at build time. Anything else is a 404, not an on-demand render.
export const dynamicParams = false;

export function generateStaticParams() {
    return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
    { params }: PageProps<"/projects/[slug]">,
    parent: ResolvingMetadata,
): Promise<Metadata> {
    const { slug } = await params;
    const project = getProject(slug);
    if (!project) return {};

    // Overriding openGraph/twitter replaces the parent's objects whole, so carry over the
    // site name, locale and the root opengraph-image rather than silently dropping them.
    const { openGraph, twitter } = await parent;
    const url = caseStudyHref(project.slug);
    return {
        title: project.title,
        description: project.summary,
        alternates: { canonical: url },
        openGraph: {
            type: "article",
            url,
            title: project.title,
            description: project.summary,
            siteName: openGraph?.siteName,
            locale: openGraph?.locale,
            images: openGraph?.images,
        },
        twitter: {
            card: "summary_large_image",
            title: project.title,
            description: project.summary,
            images: twitter?.images,
        },
    };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[slug]">) {
    const { slug } = await params;
    const projects = getProjects();
    const index = projects.findIndex((p) => p.slug === slug);
    if (index === -1) notFound();

    const project = projects[index];
    const next = projects[(index + 1) % projects.length];

    return (
        <article className="w-full min-h-screen py-20 px-8 lg:px-32 bg-white text-black">
            <Link
                href="/projects"
                className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 transition-colors hover:text-blue-600"
            >
                <span aria-hidden="true">←</span> All projects
            </Link>

            <header className="mt-8 mb-12 max-w-3xl">
                <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm font-bold text-blue-600">{project.category}</span>
                    {project.status && <StatusBadge status={project.status} className="shadow-none" />}
                </div>
                <h1 className="mb-5 text-4xl font-bold md:text-5xl">{project.title}</h1>
                <p className="mb-6 text-lg leading-relaxed text-gray-600">{project.summary}</p>
                <TechTags tech={project.tech} />
            </header>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
                <div>
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-lg">
                        {project.img ? (
                            // The page replaces the modal's lightbox: the full image is one click away.
                            <a
                                href={project.img}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/img block h-full w-full cursor-zoom-in"
                            >
                                <ProjectImage project={project} />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover/img:opacity-100 group-focus-visible/img:opacity-100">
                                    <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-black shadow-md">
                                        View full image
                                    </span>
                                </span>
                            </a>
                        ) : (
                            <ProjectImage project={project} />
                        )}
                    </div>

                    <ProjectMetaGrid meta={project.meta} className="mt-6" />
                    <ProjectLinks project={project} variant="buttons" className="mt-6" />
                </div>

                <CaseStudyNarrative project={project} />
            </div>

            {next.slug !== project.slug && (
                <nav aria-label="More projects" className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-8">
                    <Link href="/projects" className="text-sm font-bold text-gray-500 transition-colors hover:text-blue-600">
                        All projects
                    </Link>
                    <Link
                        href={caseStudyHref(next.slug)}
                        className="group text-right"
                    >
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Next project</span>
                        <span className="text-lg font-bold text-black transition-colors group-hover:text-blue-600">
                            {next.title} <span aria-hidden="true">→</span>
                        </span>
                    </Link>
                </nav>
            )}
        </article>
    );
}
