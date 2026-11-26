"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PCFShadowMap, Vector3 } from "three";
import type { WorldCard } from "@/lib/world";
import { ZONES } from "./zones";
import { OBJECTS, TOUR, objectStandPoint } from "./objects";
import { LOOK } from "./scene/look";
import Lighting from "./scene/Lighting";
import { NightSky, StreetLights } from "./scene/NightLife";
import Stage from "./scene/Stage";
import Transit from "./scene/Transit";
import Player from "./scene/Player";
import CameraRig, { FOV, type CameraRequest, type Mode, type RigApi, type View } from "./scene/CameraRig";
import Proximity from "./scene/Proximity";
import Pedestrians from "./scene/Pedestrians";
import JourneyLine from "./scene/JourneyLine";
import { buildLocations, type Location } from "./scene/locations";
import { canStandAt, findPath, type Nav } from "./scene/nav";
import { clampToGround } from "./scene/walk";
import { EMPTY_INPUT, KEY_MAP, type MovementInput } from "./scene/input";
import { EXPLORE_ZONE_IDS, worldUniforms } from "./scene/worldShader";
import { Counter, EXPLORE_KEYS, ExploreControls, GLOBAL_KEYS, KeysHelp, LocationPanel, ModeSwitcher, OutLinks, RideBar, TourBar, ViewSwitcher } from "./ui";
import { NO_RIDE, type RideInfo, type RideState } from "./scene/ride";
import FocusAnchor from "./scene/FocusAnchor";
import PlayerAnchor from "./scene/PlayerAnchor";
import poster from "./poster.webp";

/** During the tour Steven walks at 1.4× his normal pace, so he keeps up with the camera. */
const TOUR_PACE = 1.4;
/** Each tour stop: the camera's flight (~1.1 s) and time to read. Twelve stops ≈ 72 s (WORLD2.md §5). */
const TOUR_STOP_MS = 6000;
/** A press that moves further than this is a drag (orbit), not a click. Pixels. */
const DRAG_PX = 6;

const OBJECT_BY_ID = new Map(OBJECTS.map((o) => [o.id, o]));

// Shadows are drawn only when the block asks (useStaticShadows in Lighting.tsx): it's static.
const SHADOWS = { enabled: true, type: PCFShadowMap, autoUpdate: false };

/**
 * The /world scene. v1's milestones are in WORLD.md §11; 2.0's phases in WORLD2.md §8.
 *
 * Two modes over one scene (WORLD2.md §5): **Global view** (the default: the whole island, orbit,
 * click a building for its location panel) and **Explore** (walk it; Phase 2 keeps v1's follow
 * camera, in perspective, until Phase 3's first person). Switching is a camera flight, never a reload.
 */
export default function Scene({
    cards,
    start: startMode,
    onFallback,
}: {
    cards: WorldCard[];
    /** Which poster button brought the visitor in (§2): the overview, or the quick tour. */
    start: "tour" | "enter";
    /** The device can't keep up: WorldShell swaps the scene for the list (§10). */
    onFallback: () => void;
}) {
    const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
    const locations = useMemo(() => buildLocations(cards), [cards]);
    const locationOf = useMemo(() => new Map(locations.flatMap((l) => l.cards.map((id) => [id, l] as const))), [locations]);
    // The scene only exists in the browser (`ssr: false`), so `window` is safe to read here.
    // `?poster` (development only) renders the still frame that becomes the poster image: the whole
    // island, in full colour, nothing moving, no UI. See WORLD.md "M5 results".
    const [posterMode] = useState(() => process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).has("poster"));

    // Steven starts on the ferry landing's side of the street, where the career starts (§3).
    // `?at=x,z` (development only) starts him somewhere else, to test a spot without walking there.
    const [start] = useState(() => {
        const at = process.env.NODE_ENV === "development" ? new URLSearchParams(window.location.search).get("at") : null;
        const [x, z] = at?.split(",").map(Number) ?? [];
        return Number.isFinite(x) && Number.isFinite(z) ? new Vector3(x, 0, z) : new Vector3(-26, 0, -10.8);
    });
    const position = useRef(start.clone());
    const target = useRef(start.clone());
    const pace = useRef(1);
    const navRef = useRef<Nav | null>(null);
    const input = useRef<MovementInput>({ ...EMPTY_INPUT });

    const [mode, setMode] = useState<Mode>("global");
    // Explore's view (WORLD2.md D1): through his eyes, or just behind him (V).
    const [view, setView] = useState<View>("first");
    // What Explore offers to open: the object he's next to and facing (Proximity.tsx).
    const [facing, setFacing] = useState<string | null>(null);
    // The Brisbane Metro (ride.ts): a bus offering its door, or the ride itself. Transit decides both.
    const ride = useRef<RideState>({ ...NO_RIDE });
    const [rideInfo, setRideInfo] = useState<RideInfo | null>(null);
    const riding = rideInfo?.kind === "riding";
    // Boarding always puts him in the car, whichever view he walked up in; stepping off puts the view back.
    // V still swaps to the view from outside during the ride.
    const viewBeforeRide = useRef<View | null>(null);
    // The open location (its panel) and the card in it that was clicked or toured.
    const [selected, setSelected] = useState<string | null>(null);
    const [focusCard, setFocusCard] = useState<string | null>(null);
    const [hover, setHover] = useState<string | null>(null);
    const [explored, setExplored] = useState<string[]>(() => (posterMode ? EXPLORE_ZONE_IDS : []));
    const [tour, setTour] = useState<{ index: number } | null>(null);
    const [paused, setPaused] = useState(false);
    const [skyline, setSkyline] = useState(true);
    // Day or night (WORLD2.md Phase 4). The poster is always day.
    const [night, setNight] = useState(false);
    // The racquet easter egg's bubble over Steven's head (§3).
    const [cheer, setCheer] = useState(false);
    const emote = useRef<HTMLDivElement>(null);
    // Keyboard focus on an object (§10): the camera eases to it and a ring marks it.
    const [focused, setFocused] = useState<string | null>(null);
    const lookAt = useRef<Vector3 | null>(null);
    const ring = useRef<HTMLDivElement>(null);
    // No frames while the tab is hidden or the scene is scrolled out of view (§10).
    const wrapper = useRef<HTMLDivElement>(null);
    const [onScreen, setOnScreen] = useState(true);
    // False until kit.glb has loaded and the block has mounted (Stage suspends until then).
    const [ready, setReady] = useState(false);
    const [still] = useState(() => posterMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // The camera (CameraRig.tsx): flight requests, Explore's zoom, the view's azimuth, the zoom API.
    const [request, setRequest] = useState<CameraRequest | null>(null);
    const requests = useRef(0);
    const ask = (r: Omit<CameraRequest, "n">) => setRequest({ ...r, n: ++requests.current });
    const zoom = useRef(1);
    const viewAzimuth = useRef(Math.PI / 4);
    const rig = useRef<RigApi | null>(null);
    const labels = useRef(new Map<string, HTMLElement>());
    const pressAt = useRef<[number, number] | null>(null);

    const selectedLocation = selected ? (locations.find((l) => l.id === selected) ?? null) : null;

    const explore = (zone: string) => setExplored((prev) => (prev.includes(zone) || !EXPLORE_ZONE_IDS.includes(zone) ? prev : [...prev, zone]));

    const walkTo = (x: number, z: number) => {
        const [cx, cz] = clampToGround(x, z);
        target.current.set(cx, 0, cz);
    };

    /**
     * Open a location's panel, marking one of its cards. Never gate information (§2): it opens at
     * once, Steven walks over, and in Global view the camera flies to frame it beside the panel.
     */
    const openLocation = (l: Location, cardId: string | null, fly: boolean) => {
        setSelected(l.id);
        setFocusCard(cardId ?? l.cards[0]);
        explore(l.id);
        // In Global view Steven walks over (ambient); in Explore the visitor is driving, so he stays put.
        const object = OBJECT_BY_ID.get(cardId ?? l.cards[0]);
        if (object && fly) walkTo(...objectStandPoint(object));
        if (fly) ask({ kind: "focus", location: l });
    };

    const openCard = (id: string, fly = mode === "global") => {
        const l = locationOf.get(id);
        if (l && cardById.has(id)) openLocation(l, id, fly);
    };

    const closePanel = () => {
        setSelected(null);
        setFocusCard(null);
    };

    const endTour = () => {
        setTour(null);
        setPaused(false);
        pace.current = 1;
    };

    // Riding is an Explore thing: leaving it (Global view, the tour) sets him down at the nearest stop.
    const leaveBus = () => {
        if (ride.current.bus >= 0) ride.current.command = "eject";
    };

    const switchMode = (next: Mode) => {
        if (next === mode) return;
        if (next === "global") leaveBus();
        if (next === "explore") {
            endTour();
            ask({ kind: "explore" });
        } else ask({ kind: "global", location: selectedLocation });
        setMode(next);
    };

    const goToStop = (index: number) => {
        if (index >= TOUR.length) {
            // Finishing the tour counts every zone as explored (§2), which opens the Gallery once it has photos.
            endTour();
            setExplored(EXPLORE_ZONE_IDS);
            return;
        }
        // The tour is a Global view thing: the camera frames each stop beside its panel.
        leaveBus();
        if (mode !== "global") setMode("global");
        pace.current = TOUR_PACE;
        setTour({ index });
        openCard(TOUR[index], true);
    };

    // A quarter turn: Global view flies round the island; Explore eases the look round (CameraRig).
    const turn = (quarter: 1 | -1) => ask({ kind: "turn", quarter });

    const resetView = () => {
        endTour();
        closePanel();
        ask({ kind: "home" });
    };

    // Auto-advance (§2). Under reduced motion the tour is a stepper: no timer, cuts between stops.
    useEffect(() => {
        if (!tour || paused || still) return;
        const timer = setTimeout(() => goToStop(tour.index + 1), TOUR_STOP_MS);
        return () => clearTimeout(timer);
        // goToStop is recreated each render; the stop is what matters here.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tour, paused, still]);

    // Hover and selection light up their zone's buildings (worldShader.ts).
    useEffect(() => {
        worldUniforms.uHover.value = hover ? EXPLORE_ZONE_IDS.indexOf(hover) : -1;
        worldUniforms.uSelect.value = selected ? EXPLORE_ZONE_IDS.indexOf(selected) : -1;
    }, [hover, selected]);
    useEffect(
        () => () => {
            worldUniforms.uHover.value = -1;
            worldUniforms.uSelect.value = -1;
        },
        [],
    );

    // E (or the prompt button): get off, board, or open what he faces, in that order. A bus's door is
    // only ever in reach while it stands at its stop, so it can't shadow a building for long.
    const interact = () => {
        if (rideInfo) ride.current.command = rideInfo.kind === "riding" ? "alight" : "board";
        else if (facing) openCard(facing, false);
    };
    const toggleView = () => setView((v) => (v === "first" ? "third" : "first"));

    // Unexplored zones grey out less at eye level, where the grey reads as odd rather than as a hint.
    useEffect(() => {
        worldUniforms.uDimAmount.value = mode === "explore" ? 0.35 : 0.7;
        return () => void (worldUniforms.uDimAmount.value = 0.7);
    }, [mode]);

    // The keyboard handler is registered once; it reaches the current actions through this ref.
    const actions = useRef({ switchMode, turn, closePanel, endTour, interact, toggleView, mode });
    useEffect(() => {
        actions.current = { switchMode, turn, closePanel, endTour, interact, toggleView, mode };
    });

    // Keyboard (§10). Global view: Q and E turn the view, + and − zoom, and any walking key switches to
    // Explore. Explore: WASD and ↑↓ walk, ← → turn, Shift runs, E opens what he's facing, V swaps first
    // and third person (L, mouse lock, is ExploreControls'). Escape closes the panel. Held keys are a
    // set, so releasing one of two keys bound to the same move (W and ↑) doesn't stop him. Taking the
    // controls ends the tour.
    useEffect(() => {
        const pressed = new Set<string>();
        const turning = new Set<string>();
        const typing = (e: KeyboardEvent) =>
            e.target instanceof HTMLElement && !!e.target.closest("input, textarea, select, [contenteditable='true']");
        const onKey = (e: KeyboardEvent) => {
            if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
            const exploring = actions.current.mode === "explore";
            if (exploring && (e.code === "ArrowLeft" || e.code === "ArrowRight")) {
                e.preventDefault();
                if (e.type === "keydown") turning.add(e.code);
                else turning.delete(e.code);
                rig.current?.setTurn(Number(turning.has("ArrowRight")) - Number(turning.has("ArrowLeft")));
                return;
            }
            const control = KEY_MAP[e.code];
            if (control) {
                e.preventDefault(); // arrows would scroll the page
                if (e.type === "keydown") {
                    pressed.add(e.code);
                    actions.current.endTour();
                    if (actions.current.mode === "global") actions.current.switchMode("explore");
                } else pressed.delete(e.code);
                input.current[control] = [...pressed].some((code) => KEY_MAP[code] === control);
                return;
            }
            if (e.type !== "keydown") return;
            if (exploring && e.code === "KeyE") actions.current.interact();
            else if (exploring && e.code === "KeyV") actions.current.toggleView();
            else if (!exploring && e.code === "KeyQ") actions.current.turn(-1);
            else if (!exploring && e.code === "KeyE") actions.current.turn(1);
            else if (e.key === "+" || e.key === "=") rig.current?.dolly(1.25);
            else if (e.key === "-" || e.key === "_") rig.current?.dolly(1 / 1.25);
            else if (e.key === "Escape") actions.current.closePanel();
        };
        // A key released while the window is unfocused never fires keyup: don't keep walking.
        const release = () => {
            pressed.clear();
            turning.clear();
            rig.current?.setTurn(0);
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

    // Wheel and trackpad zoom over the scene; at either limit the wheel scrolls the page as usual,
    // so the world never traps the scroll. Two-finger pinch on touch screens, instead of zooming the
    // whole page. Native listeners, because React's wheel and touch handlers are passive.
    useEffect(() => {
        const el = wrapper.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            // A trackpad pinch arrives as a wheel event with ctrlKey set, in much smaller steps.
            const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
            if (rig.current?.dolly(factor)) e.preventDefault();
        };
        let pinch: number | null = null;
        const spread = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) pinch = spread(e.touches);
        };
        const onTouchMove = (e: TouchEvent) => {
            if (pinch === null || e.touches.length !== 2) return;
            e.preventDefault();
            const now = spread(e.touches);
            rig.current?.dolly(now / pinch);
            pinch = now;
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) pinch = null;
        };
        // Safari's own pinch-to-zoom for the page.
        const onGesture = (e: Event) => e.preventDefault();
        // Remember where a press started, so a drag (an orbit) isn't taken for a click on empty space.
        const onDown = (e: PointerEvent) => void (pressAt.current = [e.clientX, e.clientY]);
        el.addEventListener("wheel", onWheel, { passive: false });
        el.addEventListener("touchstart", onTouchStart, { passive: true });
        el.addEventListener("touchmove", onTouchMove, { passive: false });
        el.addEventListener("touchend", onTouchEnd);
        el.addEventListener("touchcancel", onTouchEnd);
        el.addEventListener("gesturestart", onGesture);
        el.addEventListener("pointerdown", onDown);
        return () => {
            el.removeEventListener("wheel", onWheel);
            el.removeEventListener("touchstart", onTouchStart);
            el.removeEventListener("touchmove", onTouchMove);
            el.removeEventListener("touchend", onTouchEnd);
            el.removeEventListener("touchcancel", onTouchEnd);
            el.removeEventListener("gesturestart", onGesture);
            el.removeEventListener("pointerdown", onDown);
        };
    }, []);

    // `?debug` (development only): Steven's position and the walk grid's own pathfinder, for the
    // Phase 3 checks (walls and water block him; every location can be walked to). See WORLD2.md §12.
    useEffect(() => {
        if (process.env.NODE_ENV !== "development" || !new URLSearchParams(window.location.search).has("debug")) return;
        (window as unknown as { __world?: unknown }).__world = { position, target, navRef, rig, ride, viewAzimuth, findPath, canStandAt, objects: OBJECTS, standPoint: objectStandPoint };
    }, []);

    // Leaving the page with an object hovered must not leave the pointer cursor stuck on <body>.
    useEffect(() => () => void (document.body.style.cursor = ""), []);

    // The one thing E does right now, as the prompt's button reads.
    const prompt =
        rideInfo?.kind === "riding"
            ? { label: rideInfo.here ? "Get off here" : rideInfo.requested ? "Cancel stop request" : "Request stop" }
            : rideInfo?.kind === "offer"
              ? { label: "Board the Brisbane Metro" }
              : facing && cardById.get(facing)
                ? { label: `Open ${cardById.get(facing)!.title}` }
                : null;

    const hoverLocation = hover ? locations.find((l) => l.id === hover) : undefined;
    const galleryOpen = explored.length === EXPLORE_ZONE_IDS.length;
    const routeIndex = selectedLocation ? locations.indexOf(selectedLocation) : -1;
    const ui = !posterMode;

    return (
        <div
            ref={wrapper}
            className={`relative h-[calc(100svh-5rem)] min-h-[480px] w-full overflow-hidden bg-[#eef1f5] ${mode === "explore" ? "touch-none select-none" : "touch-manipulation"}`}
            style={{ background: LOOK.background }}
        >
            {/* Night's sky, crossfading over the day gradient behind the transparent canvas. */}
            <div
                aria-hidden
                className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${night ? "opacity-100" : "opacity-0"}`}
                style={{ background: `${LOOK.night.stars}, ${LOOK.night.background}` }}
            >
                {/* The moon over Global view's backdrop (Explore has its own, in the 3D sky). */}
                <div
                    className={`absolute right-[11%] top-[9%] h-14 w-14 rounded-full transition-opacity duration-700 sm:h-20 sm:w-20 ${mode === "global" ? "opacity-100" : "opacity-0"}`}
                    style={{ background: "radial-gradient(circle at 38% 38%, #fffbe6 0%, #f6efcf 55%, #e3dcb8 100%)", boxShadow: "0 0 40px 14px rgba(214,226,255,0.35), 0 0 120px 40px rgba(214,226,255,0.15)" }}
                />
            </div>
            {/* The poster stays behind the transparent canvas until the island has loaded. */}
            {!ready && <Image src={poster} alt="" fill sizes="100vw" className="object-cover" />}
            <Canvas
                frameloop={onScreen ? "always" : "never"}
                shadows={SHADOWS}
                dpr={posterMode ? 2 : [1, 1.5]}
                gl={{ preserveDrawingBuffer: posterMode }}
                camera={{ fov: FOV, near: 1.5, far: 1500, position: [200, 240, 200] }}
                aria-hidden
                onPointerMissed={(e) => {
                    const p = pressAt.current;
                    if (!p || Math.hypot(e.clientX - p[0], e.clientY - p[1]) < DRAG_PX) closePanel();
                }}
            >
                <Lighting night={night} still={still} />
                <NightSky night={night} still={still} />
                <Suspense fallback={null}>
                    <Stage
                        still={still}
                        navRef={navRef}
                        skyline={skyline}
                        night={night}
                        onGround={(x, z) => {
                            closePanel();
                            endTour();
                            // In Global view a click on the ground only closes the panel; in Explore he walks there.
                            if (mode === "explore") walkTo(x, z);
                        }}
                        onObject={(object) => {
                            endTour();
                            openCard(object.id);
                        }}
                        onHover={(o) => setHover(o ? (locationOf.get(o.id)?.id ?? null) : null)}
                    />
                    <StreetLights night={night} still={still} />
                    <Ready
                        onReady={() => {
                            if (ready) return;
                            setReady(true);
                            if (startMode === "tour" && !posterMode) goToStop(0);
                        }}
                    />
                </Suspense>
                <CameraRig
                    mode={mode}
                    view={view}
                    navRef={navRef}
                    rideRef={ride}
                    request={request}
                    player={position}
                    zoomRef={zoom}
                    lookAt={lookAt}
                    still={still}
                    poster={posterMode}
                    panelOpen={!!selectedLocation}
                    viewAzimuthRef={viewAzimuth}
                    apiRef={rig}
                    onSkyline={setSkyline}
                    locations={locations}
                    labels={labels}
                />
                <Player
                    position={position}
                    target={target}
                    input={input}
                    pace={pace}
                    navRef={navRef}
                    viewAzimuth={viewAzimuth}
                    still={still}
                    occlude={mode === "explore" && view === "third" && !posterMode}
                    hidden={mode === "explore" && view === "first"}
                    rideRef={ride}
                    onRacquet={setCheer}
                />
                {mode === "explore" && <Proximity player={position} viewAzimuthRef={viewAzimuth} view={view} objects={OBJECTS} paused={riding} onTarget={setFacing} />}
                <PlayerAnchor position={position} el={emote} />
                <Transit
                    still={still}
                    player={position}
                    navRef={navRef}
                    rideRef={ride}
                    canBoard={mode === "explore"}
                    onStatus={(info) => {
                        setRideInfo(info);
                        if (info?.kind === "riding") {
                            if (viewBeforeRide.current === null) {
                                viewBeforeRide.current = view;
                                setView("first");
                            }
                        } else if (viewBeforeRide.current !== null) {
                            setView(viewBeforeRide.current);
                            viewBeforeRide.current = null;
                        }
                    }}
                    onAlight={(x, z) => target.current.set(x, 0, z)}
                />
                <FocusAnchor object={focused ? (OBJECT_BY_ID.get(focused) ?? null) : null} ring={ring} />
                {!posterMode && <Watchdog onSlow={onFallback} />}
                <Pedestrians still={still} />
                <JourneyLine navRef={navRef} active={!!tour} stop={tour?.index ?? 0} still={still} />
                <ZoneWatcher position={position} paused={riding} onEnter={explore} />
                <ExploreFade explored={explored} still={still} />
            </Canvas>

            {ui && (
                <>
                    {/* Location names over the island, in Global view. Mouse shortcuts only: the
                        object list below is the keyboard and screen-reader way in. */}
                    {mode === "global" && ready && (
                        <div aria-hidden className="pointer-events-none absolute inset-0">
                            {locations.map((l) => (
                                <div
                                    key={l.id}
                                    ref={(el) => {
                                        if (el) labels.current.set(l.id, el);
                                        else labels.current.delete(l.id);
                                    }}
                                    className="absolute left-0 top-0 will-change-transform"
                                >
                                    <button
                                        type="button"
                                        tabIndex={-1}
                                        onClick={() => {
                                            endTour();
                                            openLocation(l, null, true);
                                        }}
                                        onPointerEnter={() => setHover(l.id)}
                                        onPointerLeave={() => setHover(null)}
                                        className={`pointer-events-auto flex -translate-x-1/2 -translate-y-full items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-1 pr-1 text-[11px] font-semibold shadow-sm ring-1 ring-black/5 transition-colors sm:pr-2.5 ${
                                            selected === l.id || hover === l.id ? "bg-blue-600 text-white" : "bg-white/95 text-gray-800"
                                        }`}
                                    >
                                        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 ${selected === l.id || hover === l.id ? "bg-white/20" : "bg-blue-600 text-white"}`}>
                                            {l.number ?? "→"}
                                        </span>
                                        <span className="hidden sm:inline">{l.name}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Top left: the mode, then the hint or the tour bar. Top right: links out and the view's buttons. */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col-reverse items-start gap-2 p-4 sm:flex-row sm:justify-between">
                        <div className="flex flex-col items-start gap-2">
                            <ModeSwitcher mode={mode} onChange={switchMode} />
                            {mode === "explore" && <ViewSwitcher view={view} onChange={setView} />}
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
                                    {hoverLocation ? (
                                        hoverLocation.name
                                    ) : mode === "global" ? (
                                        <>
                                            <span className="pointer-fine:hidden">Drag to turn · pinch to zoom · tap a building</span>
                                            <span className="hidden pointer-fine:inline">Drag to turn · scroll to zoom · click a building to open it</span>
                                        </>
                                    ) : riding ? (
                                        <>Riding the Brisbane Metro · drag to look around · V for the view from outside</>
                                    ) : (
                                        <>
                                            <span className="pointer-fine:hidden">Left thumb walks · drag to look · tap a place to walk there</span>
                                            <span className="hidden pointer-fine:inline">WASD to walk · drag to look (L locks the mouse) · E opens what you face</span>
                                        </>
                                    )}
                                </p>
                            )}
                        </div>
                        <div className="pointer-events-auto flex items-center gap-2 self-end sm:flex-col sm:items-end sm:self-auto">
                            <OutLinks />
                            <div className="flex gap-2">
                                <RoundButton label="Turn the view left (Q)" onClick={() => turn(-1)}>
                                    <path d="M4 12a8 8 0 1 0 2.3-5.6" />
                                    <path d="M4 4v4.5h4.5" />
                                </RoundButton>
                                <RoundButton label="Turn the view right (E)" onClick={() => turn(1)} mirror>
                                    <path d="M4 12a8 8 0 1 0 2.3-5.6" />
                                    <path d="M4 4v4.5h4.5" />
                                </RoundButton>
                                <RoundButton label={night ? "Switch to day" : "Switch to night"} onClick={() => setNight((n) => !n)} pressed={night}>
                                    {night ? (
                                        <>
                                            <circle cx="12" cy="12" r="4" />
                                            <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
                                        </>
                                    ) : (
                                        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
                                    )}
                                </RoundButton>
                                {mode === "global" && (
                                    <RoundButton label="Back to the whole island" onClick={resetView}>
                                        <path d="M3 11.5 12 4l9 7.5" />
                                        <path d="M5.5 10v9.5h13V10" />
                                    </RoundButton>
                                )}
                                <KeysHelp keys={mode === "explore" ? EXPLORE_KEYS : GLOBAL_KEYS} />
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

                    {/* Decorative: no card, no count, nothing to announce (§3). */}
                    <div
                        ref={emote}
                        aria-hidden
                        className={`pointer-events-none absolute left-[var(--emote-x)] top-[var(--emote-y)] -translate-x-1/2 -translate-y-full rounded-full bg-white px-2.5 py-1 text-xl shadow-md ring-1 ring-black/5 transition-opacity duration-300 ${cheer ? "opacity-100" : "opacity-0"}`}
                    >
                        🎾
                    </div>

                    {/* Bottom left: the explorer counter and, when it isn't running, the quick tour. */}
                    <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap items-center gap-2">
                        <Counter explored={explored.length} total={EXPLORE_ZONE_IDS.length} />
                        {!tour && ready && (
                            <button
                                type="button"
                                onClick={() => goToStop(0)}
                                className="pointer-events-auto rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                                ▶ Quick tour
                            </button>
                        )}
                    </div>
                    {mode === "explore" && (
                        <ExploreControls
                            wrapperRef={wrapper}
                            inputRef={input}
                            rigRef={rig}
                            view={view}
                            target={prompt}
                            panelOpen={!!selectedLocation}
                            onInteract={interact}
                        />
                    )}

                    {rideInfo?.kind === "riding" && <RideBar here={rideInfo.here} next={rideInfo.next} requested={rideInfo.requested} />}

                    {!ready && (
                        <p role="status" className="absolute inset-x-0 top-[62%] text-center text-sm font-medium text-gray-500">
                            Loading the island…
                        </p>
                    )}

                    {selectedLocation && (
                        <LocationPanel
                            key={selectedLocation.id}
                            location={selectedLocation}
                            cards={selectedLocation.cards.map((id) => cardById.get(id)!).filter(Boolean)}
                            focusId={focusCard}
                            galleryOpen={galleryOpen}
                            prev={routeIndex > 0 ? locations[routeIndex - 1] : null}
                            next={routeIndex >= 0 && routeIndex < locations.length - 1 ? locations[routeIndex + 1] : null}
                            onGo={(l) => {
                                endTour();
                                openLocation(l, null, mode === "global");
                            }}
                            onClose={closePanel}
                        />
                    )}
                </>
            )}
        </div>
    );
}

/** A round icon button for the view's controls. Inline SVG, not glyphs: iOS fonts lack ⟲/⟳ (11 Nov 2026). */
function RoundButton({ label, onClick, mirror = false, pressed, children }: { label: string; onClick: () => void; mirror?: boolean; pressed?: boolean; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={pressed}
            aria-label={label}
            title={label}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={mirror ? "-scale-x-100" : ""}>
                {children}
            </svg>
        </button>
    );
}

/** Mounts inside the Suspense boundary, so its effect runs once everything above it has loaded. */
function Ready({ onReady }: { onReady: () => void }) {
    useEffect(() => onReady(), [onReady]);
    return null;
}

/** Walking into a content zone explores it (§2). Fires only when the zone underfoot changes. */
function ZoneWatcher({ position, paused, onEnter }: { position: RefObject<Vector3>; paused: boolean; onEnter: (zone: string) => void }) {
    const last = useRef<string | null>(null);
    useFrame(() => {
        // A bus passing by hasn't walked in (and `last` stays, so stepping off at the same zone doesn't re-fire).
        if (paused) return;
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

/**
 * Drives the shared shader's clock and light-up (worldShader.ts): each explored zone eases from
 * grey to full colour over ~0.8 s, instantly under reduced motion, and the sway clock stands still.
 */
function ExploreFade({ explored, still }: { explored: string[]; still: boolean }) {
    useFrame((_, dt) => {
        if (!still) worldUniforms.uTime.value += dt;
        const lit = worldUniforms.uZoneLit.value;
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
