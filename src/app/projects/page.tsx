import ProjectsView from "@/components/ProjectsView";
import { getProjects } from "@/lib/projects";

/**
 * Server Component: reads and validates `content/projects/*.md` at build time, then hands
 * the result to the client UI. Adding a project is a markdown file — no code change.
 * See CONTENT.md.
 */
export default function ProjectsPage() {
    const projects = getProjects();
    return <ProjectsView projects={projects} />;
}
