import type { Metadata } from "next";
import WorldShell from "./WorldShell";

/**
 * /world — the walkable 3D portfolio. The design lives in WORLD.md.
 *
 * Currently the M0 spike (WORLD.md §11): one spinning cube that proves React Three Fiber runs
 * under this Next.js — Turbopack, the vendored React canary and the React Compiler.
 *
 * This file stays a Server Component so the route can export metadata. Everything 3D sits
 * behind the client shell, because `ssr: false` is not allowed in a Server Component
 * (node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md).
 */
export const metadata: Metadata = {
    title: "World",
    description: "Walk around Steven Su's career as a small 3D world.",
    alternates: { canonical: "/world" },
    // Unlisted until it is finished (WORLD.md §1): a spinning cube is not something to index.
    robots: { index: false, follow: false },
};

export default function WorldPage() {
    return <WorldShell />;
}
