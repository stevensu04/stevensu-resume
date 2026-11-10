"use client";

import dynamic from "next/dynamic";
import type { WorldCard } from "@/lib/world";

/**
 * The only door three.js has into the site. `ssr: false` keeps the library out of the server
 * render and removes every hydration hazard a WebGL canvas brings (`document`,
 * `devicePixelRatio`, a measured canvas size). Nothing outside `src/app/world/` may import
 * `./Scene` — that is what keeps `/`, `/projects` and `/about` free of three.
 */
const Scene = dynamic(() => import("./Scene"), {
    ssr: false,
    loading: () => <ScenePlaceholder />,
});

export default function WorldShell({ cards }: { cards: WorldCard[] }) {
    return <Scene cards={cards} />;
}

/** Same box as the canvas, so nothing jumps when the scene arrives. Becomes the poster in M5. */
function ScenePlaceholder() {
    return (
        <div className="flex h-[calc(100svh-5rem)] min-h-[480px] w-full items-center justify-center bg-[#eef1f5]">
            <p className="text-sm font-medium text-gray-500">Loading the world…</p>
        </div>
    );
}
