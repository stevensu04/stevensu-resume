import type { Metadata } from "next";

// The page itself is a client component, so route metadata lives here.
export const metadata: Metadata = {
    title: "Projects",
    description:
        "Full-stack and product work — BrisPulse, Queensland Government forms automation, ParkEase and JourneyMate.",
    alternates: { canonical: "/projects" },
};

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
