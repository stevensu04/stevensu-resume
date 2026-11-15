import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { getProject } from "@/lib/projects";

export const alt = `${site.name} — case study`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Each case study's own link-preview card.
 *
 * Every /projects/* page used to share the homepage card, so when a recruiter forwarded one
 * project ("look at this MCP server") the preview couldn't tell which. The params come from the
 * page's own generateStaticParams (dynamicParams = false), so each card is built at build time.
 *
 * Same satori limits as src/app/opengraph-image.tsx: flexbox only, and any node with more than
 * one child needs an explicit display. Text only, no screenshot — cover images have different
 * aspect ratios and would distort at 1200×630.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const project = getProject(slug);
    if (!project) notFound();

    // The summary has no length limit in markdown and this card can't shrink text, so cap it
    // rather than let it run into the bottom row.
    const summary = project.summary.length > 150 ? `${project.summary.slice(0, 147)}…` : project.summary;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#0b0b0c",
                    padding: "72px 80px",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.12em" }}>
                        {project.category.toUpperCase()}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 64,
                            fontWeight: 800,
                            color: "#ffffff",
                            marginTop: 16,
                            lineHeight: 1.05,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {project.title}
                    </div>
                    <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa", marginTop: 20, maxWidth: 1000, lineHeight: 1.35 }}>
                        {summary}
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {/* First four only: more than that wraps inside 1040px. */}
                    <div style={{ display: "flex", fontSize: 22, color: "#71717a" }}>
                        {project.tech.slice(0, 4).join("  ·  ")}
                    </div>
                    <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#ffffff" }}>
                        {site.name}
                    </div>
                </div>
            </div>
        ),
        size,
    );
}
