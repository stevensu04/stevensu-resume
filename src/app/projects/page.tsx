import type { Metadata } from "next";
import ProjectsView from "@/components/ProjectsView";
import { getProjects } from "@/lib/projects";

// Here rather than in a layout: a layout's plain-string title would stop the root
// `%s · Steven Su` template from reaching the /projects/[slug] pages below it.
export const metadata: Metadata = {
    title: "Projects",
    description:
        "Full-stack and product work — BrisPulse, Queensland Government forms automation, ParkEase and JourneyMate.",
    alternates: { canonical: "/projects" },
};

/**
 * Server Component: reads and validates `content/projects/*.md` at build time, then hands
 * the result to the client UI. Adding a project is a markdown file — no code change.
 * See CONTENT.md.
 */
export default function ProjectsPage() {
    const projects = getProjects();
    return <ProjectsView projects={projects} />;
}
