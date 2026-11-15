import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { getProjects } from "@/lib/projects";
import { caseStudyHref } from "@/lib/project-schema";

/** Every page, with case studies generated from content/projects so new projects are listed automatically. */
export default function sitemap(): MetadataRoute.Sitemap {
    const routes = ["/", "/about", "/projects", "/world"];
    return [
        ...routes.map((route) => ({ url: `${SITE_URL}${route}`, priority: route === "/" ? 1 : 0.8 })),
        ...getProjects().map((p) => ({ url: `${SITE_URL}${caseStudyHref(p.slug)}`, priority: 0.6 })),
    ];
}
