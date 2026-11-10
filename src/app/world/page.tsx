import type { Metadata } from "next";
import { getProjects } from "@/lib/projects";
import { WORLD_CARDS, projectWorldCards } from "@/lib/world";
import { OBJECTS } from "./objects";
import WorldShell from "./WorldShell";

/**
 * /world — the walkable 3D portfolio. The design lives in WORLD.md; progress is in its §11.
 *
 * This file stays a Server Component so the route can export metadata and read the project files.
 * Everything 3D sits behind the client shell, because `ssr: false` is not allowed in a Server
 * Component (node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md).
 */
export const metadata: Metadata = {
    title: "World",
    description: "Walk around Steven Su's career as a small 3D world.",
    alternates: { canonical: "/world" },
    // Unlisted until it is finished (WORLD.md §1).
    robots: { index: false, follow: false },
};

export default function WorldPage() {
    // The world is a view over existing content (§8): project cards come from front matter.
    const cards = [...projectWorldCards(getProjects()), ...WORLD_CARDS];

    // Fail the build, like the rest of the content pipeline, rather than ship a card nobody can
    // reach or an object that opens nothing.
    const cardIds = new Set(cards.map((c) => c.id));
    const objectIds = new Set(OBJECTS.map((o) => o.id));
    const orphanCards = [...cardIds].filter((id) => !objectIds.has(id));
    const emptyObjects = [...objectIds].filter((id) => !cardIds.has(id));
    if (orphanCards.length || emptyObjects.length) {
        throw new Error(
            `[world] cards without an object: ${orphanCards.join(", ") || "none"}; objects without a card: ${emptyObjects.join(", ") || "none"}`,
        );
    }

    return <WorldShell cards={cards} />;
}
