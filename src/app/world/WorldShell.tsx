"use client";

import dynamic from "next/dynamic";

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

export default function WorldShell() {
    return <Scene />;
}

/** Same box as the canvas, so nothing jumps when the scene arrives. Becomes the poster in M1. */
function ScenePlaceholder() {
    return (
        <div className="flex h-[70vh] min-h-[420px] w-full items-center justify-center bg-gray-50">
            <p className="text-sm font-medium text-gray-500">Loading the world…</p>
        </div>
    );
}
