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
import { EMPTY_INPUT, KEY_MAP, type MovementInput } from "./scene/input";

/**
 * The /world scene (WORLD.md §11). M1 gave it the orthographic camera, tap-to-move and DOM cards;
 * M2 the Kenney block, hand-made props and idle motion; M3 the avatar, the keyboard and the d-pad.
 * Real card copy, the counter and the tour arrive in M4.
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
    const input = useRef<MovementInput>({ ...EMPTY_INPUT });

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

    // Keyboard (§10): arrows and WASD move, Shift runs, Q and E rotate the view, Escape closes the
    // card. Held keys are tracked as a set, so releasing one of two keys bound to the same move
    // (W and ↑) doesn't stop him.
    useEffect(() => {
        const pressed = new Set<string>();
        const typing = (e: KeyboardEvent) =>
            e.target instanceof HTMLElement && !!e.target.closest("input, textarea, select, [contenteditable='true']");
        const onKey = (e: KeyboardEvent) => {
            if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
            const control = KEY_MAP[e.code];
            if (control) {
                e.preventDefault(); // arrows would scroll the page
                if (e.type === "keydown") pressed.add(e.code);
                else pressed.delete(e.code);
                input.current[control] = [...pressed].some((code) => KEY_MAP[code] === control);
                return;
            }
            if (e.type !== "keydown") return;
            if (e.code === "KeyQ") setStep((s) => (s + 3) % 4);
            else if (e.code === "KeyE") setStep((s) => (s + 1) % 4);
            else if (e.key === "Escape") setOpen(null);
        };
        // A key released while the window is unfocused never fires keyup: don't keep walking.
        const release = () => {
            pressed.clear();
            Object.assign(input.current, EMPTY_INPUT);
        };
        window.addEventListener("keydown", onKey);
        window.addEventListener("keyup", onKey);
        window.addEventListener("blur", release);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("keyup", onKey);
            window.removeEventListener("blur", release);
        };
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
                <Player position={position} target={target} input={input} solidsRef={solidsRef} step={step} still={still} />
                <CardAnchor zone={open} card={card} />
            </Canvas>

            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                <p className="pointer-events-auto rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                    {hover ? zoneLabel(hover) : "Tap the ground to walk · tap a building to open it"}
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

            <DPad inputRef={input} />

            {!ready && (
                <p role="status" className="absolute inset-x-0 top-[62%] text-center text-sm font-medium text-gray-500">
                    Loading the block…
                </p>
            )}

            {open && <ZoneCard key={open.id} zone={open} cardRef={card} onClose={() => setOpen(null)} />}
        </div>
    );
}

/**
 * The secondary touch input (§0: tap-to-move first, d-pad second), shown on coarse pointers only.
 * Directions are relative to the view, like the arrow keys. Adapted from DECO7381 Team 41's
 * `storefront__touch` buttons, with permission: pointer capture keeps a held button pressed even
 * when the thumb slides off it.
 */
function DPad({ inputRef }: { inputRef: React.RefObject<MovementInput> }) {
    const buttons = [
        ["forward", "↑", "Walk away from the camera", "col-start-2 row-start-1"],
        ["left", "←", "Walk left", "col-start-1 row-start-2"],
        ["right", "→", "Walk right", "col-start-3 row-start-2"],
        ["backward", "↓", "Walk towards the camera", "col-start-2 row-start-3"],
    ] as const;
    const set = (control: keyof MovementInput, on: boolean) => {
        inputRef.current[control] = on;
    };
    return (
        <div aria-label="Movement controls" role="group" className="absolute bottom-4 right-4 hidden select-none grid-cols-3 grid-rows-3 gap-1 pointer-coarse:grid">
            {buttons.map(([control, icon, label, place]) => (
                <button
                    key={control}
                    type="button"
                    aria-label={label}
                    className={`${place} h-12 w-12 touch-none rounded-full bg-white/90 text-lg font-bold text-gray-700 shadow-sm active:bg-blue-600 active:text-white`}
                    onPointerDown={(e) => {
                        e.preventDefault();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        set(control, true);
                    }}
                    onPointerUp={() => set(control, false)}
                    onPointerCancel={() => set(control, false)}
                    onLostPointerCapture={() => set(control, false)}
                >
                    {icon}
                </button>
            ))}
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

