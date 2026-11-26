"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { WorldCard } from "@/lib/world";
import poster from "./poster.webp";
import WorldList from "./WorldList";

/**
 * The only door three.js has into the site (WORLD.md §2, §9, §10).
 *
 * 1. **Poster first.** A still of the block (rendered from the scene itself with `?poster` in
 *    development), the headline and two buttons. Nothing 3D is downloaded until a button is pressed,
 *    so a phone visitor who never taps pays for one ~90 kB image.
 * 2. **WebGL2 probe** on the press. If it fails, stay here and show the list instead.
 * 3. **The scene**, lazily, behind `ssr: false`. Nothing outside `src/app/world/` imports `./Scene`,
 *    which keeps `/`, `/projects` and `/about` free of three.
 * 4. **The list**, always in the DOM: hidden while the scene runs (the canvas is `aria-hidden`, so
 *    this is what a screen reader gets), shown when there's no WebGL or the device is too slow.
 */
const Scene = dynamic(() => import("./Scene"), {
    ssr: false,
    loading: () => <Poster loading />,
});

type Phase = { kind: "poster" } | { kind: "scene"; start: "tour" | "enter" } | { kind: "list"; reason?: "no-webgl" | "slow" | "chosen" };

export default function WorldShell({ cards }: { cards: WorldCard[] }) {
    const [phase, setPhase] = useState<Phase>({ kind: "poster" });

    const enter = (start: "tour" | "enter") => {
        const probe = document.createElement("canvas").getContext("webgl2");
        setPhase(probe ? { kind: "scene", start } : { kind: "list", reason: "no-webgl" });
    };

    return (
        <>
            {phase.kind === "scene" ? (
                <Scene cards={cards} start={phase.start} onFallback={() => setPhase({ kind: "list", reason: "slow" })} />
            ) : (
                <Poster onTour={() => enter("tour")} onEnter={() => enter("enter")} onList={() => setPhase({ kind: "list", reason: "chosen" })} />
            )}
            <WorldList
                cards={cards}
                visible={phase.kind === "list"}
                reason={phase.kind === "list" ? phase.reason : undefined}
                onRetry={phase.kind === "list" && phase.reason === "slow" ? () => setPhase({ kind: "scene", start: "enter" }) : undefined}
            />
        </>
    );
}

/** The poster, the headline and the two ways in. Also the loading state, so nothing jumps. */
function Poster({ loading = false, onTour, onEnter, onList }: { loading?: boolean; onTour?: () => void; onEnter?: () => void; onList?: () => void }) {
    const btn = "rounded-full px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";
    return (
        <div className="relative h-[calc(100svh-5rem)] min-h-[480px] w-full overflow-hidden bg-[#eef1f5]">
            <Image
                src={poster}
                alt="A small floating island seen from above, Brisbane on the main island and Taipei's skyline on an islet across the water: a ferry pier, a university building, a government tower, a two-shop storefront with a banyan tree, a museum with a theatre behind it, a data centre, a small park, a transit control centre with a dish on its roof, and a nightclub with a queue outside on a street of its own beside two restaurants."
                fill
                preload
                sizes="100vw"
                className="object-cover"
            />
            <div className="absolute inset-x-3 bottom-6 mx-auto max-w-sm rounded-2xl bg-white/95 p-6 shadow-lg ring-1 ring-black/5 sm:inset-x-auto sm:bottom-auto sm:left-10 sm:top-10">
                <h1 className="text-lg font-bold text-gray-900">Walk around my career</h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    Eleven stops, from a bank in Taipei to a 3D storefront, a live transit dashboard and a nightclub queue in Brisbane, plus two part-time jobs. Everything here is on my CV except those two.
                </p>
                {loading ? (
                    <p role="status" className="mt-5 text-sm font-medium text-gray-500">
                        Loading the island…
                    </p>
                ) : (
                    <>
                        <div className="mt-5 flex flex-wrap gap-2">
                            {/* WORLD2.md D5: the primary way in is the overview (Global view); the tour is one click away inside too. */}
                            <button type="button" onClick={onEnter} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
                                Enter the world
                            </button>
                            <button type="button" onClick={onTour} className={`${btn} bg-gray-100 text-gray-800 hover:bg-gray-200`}>
                                Take the quick tour
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={onList}
                            className="mt-3 text-xs font-semibold text-gray-500 underline-offset-2 hover:text-blue-600 hover:underline focus-visible:outline-2 focus-visible:outline-blue-600"
                        >
                            Rather read it as a list?
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
