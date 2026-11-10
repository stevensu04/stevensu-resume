"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { WorldCard } from "@/lib/world";
import { ZONES } from "./zones";
import { OBJECTS, TOUR, objectStandPoint } from "./objects";
import Stage from "./scene/Stage";
import Player from "./scene/Player";
import CardAnchor from "./scene/CardAnchor";
import type { Rect } from "./scene/KitInstances";
import { clampToGround } from "./scene/walk";
import { EMPTY_INPUT, KEY_MAP, type MovementInput } from "./scene/input";
import { EXPLORE_ZONE_IDS, exploreUniforms } from "./scene/explore";
import { Counter, DPad, Intro, OutLinks, TourBar, WorldCardView } from "./ui";

/** During the tour Steven moves at 1.4× his normal pace: nine stops in about 65 s. */
const TOUR_PACE = 1.4;
/** Seconds a tour stop holds after he arrives, before moving on. Pause is always there. */
const TOUR_DWELL = 3;
const WALK_SPEED = 2.2;
const RUN_SPEED = 4.4;

const OBJECT_BY_ID = new Map(OBJECTS.map((o) => [o.id, o]));

/**
 * The /world scene (WORLD.md §11).
 *  M1  orthographic camera, tap-to-move, DOM cards
 *  M2  the Kenney block, hand-made props, idle motion
 *  M3  the avatar, keyboard and d-pad
 *  M4  real cards from content, explorer counter and light-up, Gallery unlock, the guided tour
 */
export default function Scene({ cards }: { cards: WorldCard[] }) {
    const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

    // Steven starts on the ferry landing's side of the street, where the career starts (§3).
    const [start] = useState(() => new Vector3(-26, 0, -10.8));
    const position = useRef(start.clone());
    const target = useRef(start.clone());
    const pace = useRef(1);
    const card = useRef<HTMLDivElement>(null);
    const solidsRef = useRef<Rect[]>([]);
    const input = useRef<MovementInput>({ ...EMPTY_INPUT });

    const [open, setOpen] = useState<string | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const [step, setStep] = useState(0);
    const [explored, setExplored] = useState<string[]>([]);
    const [intro, setIntro] = useState(true);
    const [tour, setTour] = useState<{ index: number; ms: number } | null>(null);
    const [paused, setPaused] = useState(false);
    // False until kit.glb has loaded and the block has mounted (Stage suspends until then).
    const [ready, setReady] = useState(false);
    // The scene only exists in the browser (`ssr: false`), so `window` is safe to read here.
    const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const explore = (zone: string) => setExplored((prev) => (prev.includes(zone) || !EXPLORE_ZONE_IDS.includes(zone) ? prev : [...prev, zone]));

    const walkTo = (x: number, z: number) => {
        const [cx, cz] = clampToGround(x, z);
        target.current.set(cx, 0, cz);
    };

    /** Never gate information (§2): the card opens at once, and Steven walks over to it. */
    const openCard = (id: string) => {
        const object = OBJECT_BY_ID.get(id);
        const c = cardById.get(id);
        if (!object || !c) return;
        setOpen(id);
        explore(c.zone);
        const [x, z] = objectStandPoint(object);
        walkTo(x, z);
    };

    const endTour = () => {
        setTour(null);
        setPaused(false);
        pace.current = 1;
    };

    const goToStop = (index: number) => {
        if (index >= TOUR.length) {
            // Finishing the tour counts every zone as explored (§2), so the Gallery opens.
            endTour();
            setExplored(EXPLORE_ZONE_IDS);
            return;
        }
        const id = TOUR[index];
        const object = OBJECT_BY_ID.get(id)!;
        const [x, z] = objectStandPoint(object);
        // Same rule as Player: a leg over 14 m is run, a shorter one walked.
        const distance = Math.hypot(x - position.current.x, z - position.current.z);
        const travel = distance / ((distance > 14 ? RUN_SPEED : WALK_SPEED) * TOUR_PACE);
        pace.current = TOUR_PACE;
        setIntro(false);
        setTour({ index, ms: (travel + TOUR_DWELL) * 1000 });
        openCard(id);
    };

    // Auto-advance (§2). Under reduced motion the tour is a stepper: no timer, cuts between stops.
    useEffect(() => {
        if (!tour || paused || still) return;
        const timer = setTimeout(() => goToStop(tour.index + 1), tour.ms);
        return () => clearTimeout(timer);
        // goToStop is recreated each render; the stop and its duration are what matter here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tour, paused, still]);

    // Keyboard (§10): arrows and WASD move, Shift runs, Q and E rotate the view, Escape closes the
    // card. Held keys are tracked as a set, so releasing one of two keys bound to the same move
    // (W and ↑) doesn't stop him. Taking the controls ends the tour.
    useEffect(() => {
        const pressed = new Set<string>();
        const typing = (e: KeyboardEvent) =>
            e.target instanceof HTMLElement && !!e.target.closest("input, textarea, select, [contenteditable='true']");
        const onKey = (e: KeyboardEvent) => {
            if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
            const control = KEY_MAP[e.code];
            if (control) {
                e.preventDefault(); // arrows would scroll the page
                if (e.type === "keydown") {
                    pressed.add(e.code);
                    setTour(null);
                    pace.current = 1;
                    setIntro(false);
                } else pressed.delete(e.code);
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

    // Leaving the page with an object hovered must not leave the pointer cursor stuck on <body>.
    useEffect(() => () => void (document.body.style.cursor = ""), []);

    const openedCard = open ? cardById.get(open) : undefined;
    const hoverCard = hover ? cardById.get(hover) : undefined;
    const galleryOpen = explored.length === EXPLORE_ZONE_IDS.length;

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
                            setIntro(false);
                            endTour();
                            walkTo(x, z);
                        }}
                        onObject={(object) => {
                            setIntro(false);
                            endTour();
                            openCard(object.id);
                        }}
                        onHover={(o) => setHover(o?.id ?? null)}
                    />
                    <Ready onReady={() => setReady(true)} />
                </Suspense>
                <Player position={position} target={target} input={input} pace={pace} solidsRef={solidsRef} step={step} still={still} />
                <CardAnchor object={open ? (OBJECT_BY_ID.get(open) ?? null) : null} card={card} />
                <ZoneWatcher position={position} onEnter={explore} />
                <ExploreFade explored={explored} still={still} />
            </Canvas>

            {/* Phones: links and rotation on the first row, the hint or tour bar under them. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col-reverse items-start gap-2 p-4 sm:flex-row sm:justify-between">
                {tour ? (
                    <TourBar
                        index={tour.index}
                        total={TOUR.length}
                        paused={paused}
                        autoAdvance={!still}
                        onPrev={() => goToStop(Math.max(0, tour.index - 1))}
                        onNext={() => goToStop(tour.index + 1)}
                        onPause={() => setPaused((p) => !p)}
                        onExit={endTour}
                    />
                ) : (
                    <p className="pointer-events-auto rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                        {hoverCard ? hoverCard.title : "Tap the ground to walk · tap a building to open it"}
                    </p>
                )}
                <div className="pointer-events-auto flex items-center gap-2 self-end sm:flex-col sm:items-end sm:self-auto">
                    <OutLinks />
                    <div className="flex gap-2">
                        <RotateButton label="Rotate view left (Q)" glyph="⟲" onClick={() => setStep((s) => (s + 3) % 4)} />
                        <RotateButton label="Rotate view right (E)" glyph="⟳" onClick={() => setStep((s) => (s + 1) % 4)} />
                    </div>
                </div>
            </div>

            <Counter explored={explored.length} total={EXPLORE_ZONE_IDS.length} />
            <DPad inputRef={input} />

            {!ready && (
                <p role="status" className="absolute inset-x-0 top-[62%] text-center text-sm font-medium text-gray-500">
                    Loading the block…
                </p>
            )}

            {ready && intro && !openedCard && (
                <Intro
                    onTour={() => goToStop(0)}
                    onWalk={() => setIntro(false)}
                />
            )}

            {openedCard && (
                <WorldCardView key={openedCard.id} card={openedCard} cardRef={card} galleryOpen={galleryOpen} onClose={() => setOpen(null)} />
            )}
        </div>
    );
}

function RotateButton({ label, glyph, onClick }: { label: string; glyph: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="h-9 w-9 rounded-full bg-white text-sm font-bold text-gray-700 shadow-sm hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
            {glyph}
        </button>
    );
}

/** Mounts inside the Suspense boundary, so its effect runs once everything above it has loaded. */
function Ready({ onReady }: { onReady: () => void }) {
    useEffect(() => onReady(), [onReady]);
    return null;
}

/** Walking into a content zone explores it (§2). Fires only when the zone underfoot changes. */
function ZoneWatcher({ position, onEnter }: { position: RefObject<Vector3>; onEnter: (zone: string) => void }) {
    const last = useRef<string | null>(null);
    useFrame(() => {
        const { x, z } = position.current;
        // A little slack round each zone: standing at its door counts.
        const zone = ZONES.find((r) => Math.abs(x - r.x) < r.w / 2 + 2 && Math.abs(z - r.z) < r.d / 2 + 2)?.id ?? null;
        if (zone !== last.current) {
            last.current = zone;
            if (zone) onEnter(zone);
        }
    });
    return null;
}

/** Eases each explored zone from grey to full colour over ~0.8 s; instantly under reduced motion. */
function ExploreFade({ explored, still }: { explored: string[]; still: boolean }) {
    useFrame((_, dt) => {
        const lit = exploreUniforms.uZoneLit.value;
        EXPLORE_ZONE_IDS.forEach((id, i) => {
            const goal = explored.includes(id) ? 1 : 0;
            lit[i] = still ? goal : lit[i] + (goal - lit[i]) * Math.min(1, dt * 4);
        });
    });
    return null;
}
