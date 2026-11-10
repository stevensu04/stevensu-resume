"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
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
import { Counter, DPad, OutLinks, TourBar, WorldCardView } from "./ui";
import FocusAnchor from "./scene/FocusAnchor";
import poster from "./poster.webp";

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
export default function Scene({
    cards,
    start: startMode,
    onFallback,
}: {
    cards: WorldCard[];
    /** Which poster button brought the visitor in (§2). */
    start: "tour" | "walk";
    /** The device can't keep up: WorldShell swaps the scene for the list (§10). */
    onFallback: () => void;
}) {
    const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
    // The scene only exists in the browser (`ssr: false`), so `window` is safe to read here.
    // `?poster` (development only) renders the still frame that becomes the poster image: the whole
    // block, in full colour, nothing moving, no UI. See WORLD.md "M5 results".
    const [posterMode] = useState(() => process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).has("poster"));

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
    const [explored, setExplored] = useState<string[]>(() => (posterMode ? EXPLORE_ZONE_IDS : []));
    const [tour, setTour] = useState<{ index: number; ms: number } | null>(null);
    const [paused, setPaused] = useState(false);
    // Keyboard focus on an object (§10): the camera eases to it and a ring marks it.
    const [focused, setFocused] = useState<string | null>(null);
    const lookAt = useRef<Vector3 | null>(null);
    const ring = useRef<HTMLDivElement>(null);
    // No frames while the tab is hidden or the scene is scrolled out of view (§10).
    const wrapper = useRef<HTMLDivElement>(null);
    const [onScreen, setOnScreen] = useState(true);
    // False until kit.glb has loaded and the block has mounted (Stage suspends until then).
    const [ready, setReady] = useState(false);
    // The scene only exists in the browser (`ssr: false`), so `window` is safe to read here.
    const [still] = useState(() => posterMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches);

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

    useEffect(() => {
        const el = wrapper.current;
        if (!el) return;
        let inView = true;
        const update = () => setOnScreen(inView && document.visibilityState === "visible");
        const observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            update();
        });
        observer.observe(el);
        document.addEventListener("visibilitychange", update);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", update);
        };
    }, []);

    // Leaving the page with an object hovered must not leave the pointer cursor stuck on <body>.
    useEffect(() => () => void (document.body.style.cursor = ""), []);

    const openedCard = open ? cardById.get(open) : undefined;
    const hoverCard = hover ? cardById.get(hover) : undefined;
    const galleryOpen = explored.length === EXPLORE_ZONE_IDS.length;

    return (
        <div ref={wrapper} className="relative h-[calc(100svh-5rem)] min-h-[480px] w-full touch-manipulation overflow-hidden bg-[#eef1f5]">
            {/* The poster stays behind the transparent canvas until the block has loaded. */}
            {!ready && <Image src={poster} alt="" fill sizes="100vw" className="object-cover" />}
            <Canvas
                frameloop={onScreen ? "always" : "never"}
                orthographic
                dpr={posterMode ? 2 : [1, 1.5]}
                gl={{ preserveDrawingBuffer: posterMode }}
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
                            endTour();
                            walkTo(x, z);
                        }}
                        onObject={(object) => {
                            endTour();
                            openCard(object.id);
                        }}
                        onHover={(o) => setHover(o?.id ?? null)}
                    />
                    <Ready
                        onReady={() => {
                            if (ready) return;
                            setReady(true);
                            if (startMode === "tour" && !posterMode) goToStop(0);
                        }}
                    />
                </Suspense>
                <Player position={position} target={target} input={input} pace={pace} solidsRef={solidsRef} step={step} still={still} overview={posterMode} lookAt={lookAt} />
                <FocusAnchor object={focused ? (OBJECT_BY_ID.get(focused) ?? null) : null} ring={ring} />
                {!posterMode && <Watchdog onSlow={onFallback} />}
                <CardAnchor object={open ? (OBJECT_BY_ID.get(open) ?? null) : null} card={card} />
                <ZoneWatcher position={position} onEnter={explore} />
                <ExploreFade explored={explored} still={still} />
            </Canvas>

            {!posterMode && (
            <>
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

            {/* Tab walks the objects in route order (§10). The buttons are visually hidden; the ring
                over the object is what shows focus, and the camera eases there. Enter opens. */}
            <ol aria-label="Things to open, in route order" className="sr-only">
                {OBJECTS.map((o) => {
                    const c = cardById.get(o.id);
                    return (
                        <li key={o.id}>
                            <button
                                type="button"
                                data-object={o.id}
                                onFocus={() => {
                                    setFocused(o.id);
                                    lookAt.current = new Vector3(o.x, 0, o.z);
                                }}
                                onBlur={() => {
                                    setFocused(null);
                                    lookAt.current = null;
                                }}
                                onClick={() => {
                                    endTour();
                                    openCard(o.id);
                                }}
                            >
                                {c?.title}
                            </button>
                        </li>
                    );
                })}
            </ol>
            <div
                ref={ring}
                aria-hidden
                className={`pointer-events-none absolute left-[var(--ring-x)] top-[var(--ring-y)] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-blue-600 bg-blue-600/10 ${focused ? "" : "hidden"}`}
            />

            <Counter explored={explored.length} total={EXPLORE_ZONE_IDS.length} />
            <DPad inputRef={input} />

            {!ready && (
                <p role="status" className="absolute inset-x-0 top-[62%] text-center text-sm font-medium text-gray-500">
                    Loading the block…
                </p>
            )}

            {openedCard && (
                <WorldCardView key={openedCard.id} card={openedCard} cardRef={card} galleryOpen={galleryOpen} onClose={() => setOpen(null)} />
            )}
            </>
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

/**
 * The slow-device fallback (§10). Frame times are sampled once the scene has settled; a gap over
 * 250 ms is a pause (a background tab, a dropped GPU frame), not slowness, and is ignored. Below
 * ~30 fps it first drops the pixel ratio to 1; if that still averages under ~20 fps, it gives up
 * and hands the visitor the list.
 */
function Watchdog({ onSlow }: { onSlow: () => void }) {
    const setDpr = useThree((s) => s.setDpr);
    const sample = useRef({ elapsed: 0, frames: 0, time: 0, lowered: false, done: false });
    useFrame((_, dt) => {
        const s = sample.current;
        if (s.done || dt > 0.25) return;
        s.elapsed += dt;
        if (s.elapsed < 3) return; // let loading, shader compiles and the first layout settle
        s.frames += 1;
        s.time += dt;
        if (s.time < 4) return;
        const fps = s.frames / s.time;
        s.frames = 0;
        s.time = 0;
        if (fps >= 30) s.done = true;
        else if (!s.lowered) {
            s.lowered = true;
            setDpr(1);
        } else if (fps < 20) {
            s.done = true;
            onSlow();
        } else s.done = true;
    });
    return null;
}
