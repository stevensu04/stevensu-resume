import type { Metadata, ResolvingMetadata } from "next";
import Image from "next/image";
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
import { caseStudyHref, type Project, type ProjectGalleryItem, type ProjectVideo } from "@/lib/project-schema";
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

    // Overriding openGraph replaces the parent's object whole, so carry over the site name and
    // locale. Images are not carried over any more: ./opengraph-image.tsx gives every case study
    // its own card, and file-based metadata takes priority over generateMetadata.
    const { openGraph } = await parent;
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
        },
        twitter: {
            card: "summary_large_image",
            title: project.title,
            description: project.summary,
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
                    {project.video ? (
                        <ProjectFilm project={project} video={project.video} />
                    ) : (
                    <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-lg">
                        {project.img ? (
                            // The page replaces the modal's lightbox: the full image is one click away.
                            <a
                                href={project.img}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group/img relative block h-full w-full cursor-zoom-in"
                            >
                                <ProjectImage project={project} sizes="(min-width: 1024px) 45vw, 92vw" loading="eager" />
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
                    )}

                    <ProjectMetaGrid meta={project.meta} className="mt-6" />
                    <ProjectLinks project={project} variant="buttons" className="mt-6" />
                </div>

                <CaseStudyNarrative project={project} />
            </div>

            {(project.gallery?.length || project.mediaCredit) && (
                <ProjectGallery gallery={project.gallery ?? []} credit={project.mediaCredit} />
            )}

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

/**
 * The project's film, in the cover image's slot. The stand-in for a live demo when there can't be
 * one. preload="none" with a poster: nothing downloads until someone presses play, so the page
 * costs the same as an image. Plain <video> controls are keyboard- and screen-reader-accessible.
 */
function ProjectFilm({ project, video }: { project: Project; video: ProjectVideo }) {
    const poster = video.poster ?? project.img ?? undefined;
    return (
        <figure id="film" className="scroll-mt-24">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-gray-100 bg-black shadow-lg">
                <video
                    src={video.src}
                    poster={poster}
                    controls
                    preload="none"
                    playsInline
                    className="h-full w-full object-contain"
                    aria-label={`${project.title} — film`}
                >
                    <a href={video.src}>Download the film</a>
                </video>
            </div>
            {video.caption && (
                <figcaption className="mt-3 text-xs leading-relaxed text-gray-500">{video.caption}</figcaption>
            )}
        </figure>
    );
}

/**
 * Screenshots under the narrative, each a link to the full-size file. object-contain on a grey
 * ground, not object-cover: a diagram or a console screen cropped to 16:9 loses the part that
 * mattered.
 */
function ProjectGallery({ gallery, credit }: { gallery: ProjectGalleryItem[]; credit?: string }) {
    return (
        <section aria-labelledby="gallery-heading" className="mt-16">
            <h2 id="gallery-heading" className="mb-6 text-lg font-extrabold text-black">
                In pictures
            </h2>
            {gallery.length > 0 && (
                <ul className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {gallery.map((item) => (
                        <li key={item.src}>
                            <figure>
                                <a
                                    href={item.src}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group/img relative block aspect-[16/10] cursor-zoom-in overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
                                >
                                    <Image
                                        src={item.src}
                                        alt={item.alt}
                                        fill
                                        sizes="(min-width: 768px) 45vw, 92vw"
                                        className="object-contain p-2"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover/img:opacity-100 group-focus-visible/img:opacity-100">
                                        <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-black shadow-md">
                                            View full image
                                        </span>
                                    </span>
                                </a>
                                {item.caption && (
                                    <figcaption className="mt-3 text-sm leading-relaxed text-gray-600">{item.caption}</figcaption>
                                )}
                            </figure>
                        </li>
                    ))}
                </ul>
            )}
            {credit && <p className="mt-8 text-xs leading-relaxed text-gray-500">{credit}</p>}
        </section>
    );
}
