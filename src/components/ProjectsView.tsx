"use client";
import React, { useState } from 'react';
import AnimatedText from '@/components/AnimatedText';
import { AnimatePresence, motion } from 'framer-motion';
import { FaTimes, FaExternalLinkAlt, FaGithub, FaCode, FaLightbulb } from "react-icons/fa";
import {
    categoriesFrom,
    toneClasses,
    type Project,
    type ProjectCallout,
} from '@/lib/project-schema';

/**
 * Interactive projects UI. Content is loaded and validated on the server
 * (`lib/projects.ts`) and handed down as props — this component never touches the
 * filesystem, so adding a project means adding a markdown file, not editing JSX.
 */
export default function ProjectsView({ projects }: { projects: Project[] }) {
    const [filter, setFilter] = useState<string>("All");
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Derived from the content, so a brand-new category needs no code change.
    const categories = categoriesFrom(projects);
    const visible = projects.filter((p) => filter === "All" || p.category === filter);

    return (
        <main className="w-full min-h-screen py-20 px-8 lg:px-32 bg-white text-black relative">
            <div className="flex flex-col items-center mb-16">
                <AnimatedText text="Innovating Through Code." className="!text-6xl mb-4" />
                <p className="text-gray-500 font-medium text-lg text-center max-w-2xl">
                    Bridging Economics and Information Technology to build user-centered digital solutions.
                </p>
            </div>

            <div className="flex justify-center flex-wrap gap-4 mb-20">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        aria-pressed={filter === cat}
                        className={`px-6 py-2 rounded-full font-bold transition-all border-2 ${
                            filter === cat ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-100 hover:border-black"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visible.map((project) => (
                    <ProjectCard
                        key={project.slug}
                        project={project}
                        onOpen={() => setSelectedProject(project)}
                    />
                ))}
            </div>

            <AnimatePresence>
                {selectedProject && (
                    <ProjectModal
                        project={selectedProject}
                        onClose={() => setSelectedProject(null)}
                    />
                )}
            </AnimatePresence>
        </main>
    );
}

/**
 * Renders the project image, or a branded placeholder when there is no image (or the file is
 * missing). Previously a missing file rendered a broken-image icon.
 */
function ProjectImage({ project, className = "" }: { project: Project; className?: string }) {
    const [failed, setFailed] = useState(false);

    if (!project.img || failed) {
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

function ProjectCard({ project, onOpen }: { project: Project; onOpen: () => void }) {
    return (
        <div className={`relative group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-500 ${project.featured ? "md:col-span-2" : ""}`}>
            <div className="aspect-video w-full bg-gray-100 overflow-hidden relative">
                <ProjectImage project={project} />

                {/* 誠實標籤：maturity stated on the card, not buried in the modal */}
                {project.status && (
                    <span className={`absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm ${toneClasses[project.status.tone].badge}`}>
                        {project.status.label}
                    </span>
                )}

                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-6 text-center">
                    <p className="text-white mb-4 text-sm font-medium">{project.summary}</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {project.tech.map((t) => (
                            <span key={t} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold">#{t}</span>
                        ))}
                    </div>
                    <button
                        onClick={onOpen}
                        className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors"
                    >
                        View Project Info
                    </button>
                </div>
            </div>

            <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-600 font-bold text-xs uppercase tracking-tighter">{project.category}</span>
                    <button
                        onClick={onOpen}
                        className="text-black hover:text-blue-600 transition-colors font-bold text-sm flex items-center gap-1"
                    >
                        View Details <span className="text-lg">→</span>
                    </button>
                </div>
                <h3 className="text-xl font-bold text-black">{project.title}</h3>

                {/* 可驗證性：live demo and source, always visible — never behind a hover state */}
                {(project.demo || project.repo) && (
                    <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
                        {project.demo && (
                            <a
                                href={project.demo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-blue-600 transition-colors"
                            >
                                <FaExternalLinkAlt className="text-[10px]" /> Live Demo
                            </a>
                        )}
                        {project.repo && (
                            <a
                                href={project.repo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-blue-600 transition-colors"
                            >
                                <FaGithub className="text-xs" /> Source
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
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
            {callout.icon && <div className="text-sm mt-0.5">{callout.icon}</div>}
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

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
    const [isZoomed, setIsZoomed] = useState(false);

    const calloutsFor = (section: ProjectCallout["section"]) =>
        (project.callouts ?? []).filter((c) => c.section === section);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl relative p-6 md:p-12 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={onClose} aria-label="Close project details" className="absolute right-6 top-6 text-2xl hover:text-blue-600 transition-colors">
                        <FaTimes />
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Left Side: Visuals & Meta */}
                        <div>
                            <div
                                className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50 cursor-zoom-in relative group/img aspect-video"
                                onClick={() => project.img && setIsZoomed(true)}
                            >
                                <ProjectImage project={project} />
                                {project.img && (
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-white/95 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-md">Click to View Full Image 🔍</span>
                                    </div>
                                )}
                            </div>

                            {/* 資料驅動：meta comes from the markdown file, not from JSX */}
                            <div className="mt-6 grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm">
                                {project.meta.map((m) => (
                                    <div key={m.label} className={m.wide ? "col-span-2" : ""}>
                                        <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                                            {m.label}
                                        </span>
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
                                    </div>
                                ))}
                            </div>

                            {(project.demo || project.repo) && (
                                <div className="mt-6 flex flex-wrap gap-3">
                                    {project.demo && (
                                        <a
                                            href={project.demo}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-600"
                                        >
                                            <FaExternalLinkAlt className="text-xs" /> Live Demo
                                        </a>
                                    )}
                                    {project.repo && (
                                        <a
                                            href={project.repo}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 rounded-lg border-2 border-black px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-black hover:text-white"
                                        >
                                            <FaGithub /> View Source
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Side: Narrative */}
                        <div className="flex flex-col">
                            <span className="text-blue-600 font-bold text-sm mb-2">{project.category}</span>
                            <h2 className="text-4xl font-bold mb-6 text-black">{project.title}</h2>

                            <div className="space-y-8">
                                <section>
                                    <h4 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                                        <FaLightbulb className="text-yellow-500" /> 01 - Problem &amp; Challenge
                                    </h4>
                                    <p className="text-gray-600 leading-relaxed">{project.problem}</p>
                                    {calloutsFor("problem").map((c, i) => (
                                        <Callout key={i} callout={c} />
                                    ))}
                                </section>

                                <section>
                                    <h4 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                                        <FaCode className="text-blue-600" />
                                        02 - {project.solutionHeading ?? "Solution & Architecture"}
                                    </h4>
                                    <p className="text-gray-600 leading-relaxed">{project.solution}</p>
                                    {calloutsFor("solution").map((c, i) => (
                                        <Callout key={i} callout={c} />
                                    ))}
                                </section>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Lightbox */}
            <AnimatePresence>
                {isZoomed && project.img && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out"
                        onClick={() => setIsZoomed(false)}
                    >
                        <button aria-label="Close image" className="absolute right-8 top-8 text-white text-3xl hover:text-gray-300" onClick={() => setIsZoomed(false)}>
                            <FaTimes />
                        </button>
                        <motion.img
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            src={project.img} alt={project.title}
                            className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
