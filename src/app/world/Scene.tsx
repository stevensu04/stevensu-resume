"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Vector3 } from "three";
import { ZONES, standPoint, type Zone } from "./zones";
import Stage from "./scene/Stage";
import Player from "./scene/Player";
import CardAnchor from "./scene/CardAnchor";
import type { Rect } from "./scene/KitInstances";
import { clampToGround } from "./scene/walk";

/**
 * The /world scene (WORLD.md §11). M1 gave it the orthographic camera, tap-to-move and DOM cards;
 * M2 the Kenney block, hand-made props and idle motion. The avatar arrives in M3; real card copy,
 * the counter and the tour in M4.
 */
export default function Scene() {
    // Steven starts at the ferry landing, where the career starts (§3).
    const [start] = useState(() => {
        const [x, z] = standPoint(ZONES[0]);
        return new Vector3(x, 0, z);
    });
    const position = useRef(start.clone());
    const target = useRef(start.clone());
    const card = useRef<HTMLDivElement>(null);
    const solidsRef = useRef<Rect[]>([]);

    const [open, setOpen] = useState<Zone | null>(null);
    const [hover, setHover] = useState<Zone | null>(null);
    const [step, setStep] = useState(0);
    // False until kit.glb has loaded and the block has mounted (Stage suspends until then).
    const [ready, setReady] = useState(false);
    // The scene only exists in the browser (`ssr: false`), so `window` is safe to read here.
    const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const walkTo = (x: number, z: number) => {
        const [cx, cz] = clampToGround(x, z);
        target.current.set(cx, 0, cz);
    };

    // Q and E rotate the view; Escape closes the card (§10).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === "q" || e.key === "Q") setStep((s) => (s + 3) % 4);
            else if (e.key === "e" || e.key === "E") setStep((s) => (s + 1) % 4);
            else if (e.key === "Escape") setOpen(null);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // Leaving the page with a block hovered must not leave the pointer cursor stuck on <body>.
    useEffect(() => () => void (document.body.style.cursor = ""), []);

    return (
        <div className="relative h-[calc(100svh-5rem)] min-h-[480px] w-full touch-manipulation overflow-hidden bg-[#eef1f5]">
            <Canvas
                orthographic
                dpr={[1, 1.5]}
                camera={{ zoom: 20, near: 1, far: 400, position: [80, 80, 80] }}
                aria-hidden
                onPointerMissed={() => setOpen(null)}
            >
                <Suspense fallback={null}>
                    <Stage
                        still={still}
                        solidsRef={solidsRef}
                        // Steps 1 and 2 put the camera on the river side, where the skyline would stand
                        // between the camera and the block. It is a backdrop, so it only exists behind.
                        skyline={step === 0 || step === 3}
                        onGround={(x, z) => {
                            setOpen(null);
                            walkTo(x, z);
                        }}
                        onZone={(zone) => {
                            // Never gate information (§2): the card opens at once, and Steven walks over.
                            setOpen(zone);
                            const [x, z] = standPoint(zone);
                            walkTo(x, z);
                        }}
                        onHover={setHover}
                    />
                    <Ready onReady={() => setReady(true)} />
                </Suspense>
                <Player position={position} target={target} solidsRef={solidsRef} step={step} still={still} />
                <CardAnchor zone={open} card={card} />
            </Canvas>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                <p className="pointer-events-auto rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                    {hover ? zoneLabel(hover) : "Tap the ground to walk · tap a block to open it"}
                </p>
                <div className="pointer-events-auto flex gap-2">
                    <button
                        type="button"
                        onClick={() => setStep((s) => (s + 3) % 4)}
                        aria-label="Rotate view left (Q)"
                        className="h-9 w-9 rounded-full bg-white text-sm font-bold text-gray-700 shadow-sm hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                        ⟲
                    </button>
                    <button
                        type="button"
                        onClick={() => setStep((s) => (s + 1) % 4)}
                        aria-label="Rotate view right (E)"
                        className="h-9 w-9 rounded-full bg-white text-sm font-bold text-gray-700 shadow-sm hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                        ⟳
                    </button>
                </div>
            </div>

            {!ready && (
                <p role="status" className="absolute inset-x-0 top-[62%] text-center text-sm font-medium text-gray-500">
                    Loading the block…
                </p>
            )}

            {open && <ZoneCard key={open.id} zone={open} cardRef={card} onClose={() => setOpen(null)} />}
        </div>
    );
}

/** Mounts inside the Suspense boundary, so its effect runs once everything above it has loaded. */
function Ready({ onReady }: { onReady: () => void }) {
    useEffect(() => onReady(), [onReady]);
    return null;
}

function zoneLabel(zone: Zone): string {
    return zone.number === null ? zone.name : `${zone.number} · ${zone.name}`;
}

/**
 * Pinned above its block on wider screens (CardAnchor writes --card-x/--card-y), a bottom sheet on
 * phones so it never covers the zone you just tapped. Copy is a placeholder until M4 (§7, §8).
 */
function ZoneCard({ zone, cardRef, onClose }: { zone: Zone; cardRef: React.RefObject<HTMLDivElement | null>; onClose: () => void }) {
    const close = useRef<HTMLButtonElement>(null);
    useEffect(() => close.current?.focus(), []);
    const titleId = `zone-card-${zone.id}`;

    return (
        <div
            ref={cardRef}
            role="dialog"
            aria-labelledby={titleId}
            data-testid="zone-card"
            className="absolute inset-x-3 bottom-3 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-black/5 sm:inset-x-auto sm:bottom-auto sm:left-[var(--card-x,50%)] sm:top-[var(--card-y,50%)] sm:w-80 sm:-translate-x-1/2 sm:-translate-y-[calc(100%+12px)]"
        >
            <div className="flex items-start justify-between gap-3">
                <h2 id={titleId} className="text-base font-bold text-gray-900">
                    {zoneLabel(zone)}
                </h2>
                <button
                    ref={close}
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="-m-1 rounded-full p-1 text-gray-400 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                    ✕
                </button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {zone.number === null ? "A facility, not a zone." : `Zone ${zone.number} of 7.`} The card copy arrives in M4.
            </p>
        </div>
    );
}

