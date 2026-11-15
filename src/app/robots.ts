import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Recruiters often start by searching the candidate's name; let crawlers in and point them at the sitemap. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", allow: "/" },
        sitemap: `${SITE_URL}/sitemap.xml`,
    };
}
