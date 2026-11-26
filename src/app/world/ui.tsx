"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import type { Location } from "./scene/locations";
import type { Mode, RigApi, View } from "./scene/CameraRig";
import { EXIT_FOOTNOTE, GALLERY_PHOTOS, GALLERY_READY, type WorldCard } from "@/lib/world";
import { site } from "@/lib/site";
import type { MovementInput } from "./scene/input";

/** The DOM half of /world: the location panel, the mode switcher, the tour bar, the counter and the d-pad. */

const chip = "whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/**
 * The location panel (WORLD2.md §5, decision D6): every card of one location, in route order, in
 * one place. Each card keeps WORLD.md §7's anatomy (name and status or org line, a short first-person
 * body, one way out), and the copy is the cards' own. A right-hand panel from `sm` up, so the camera
 * can frame the building beside it; a bottom sheet on phones. The card that was clicked (or that the
 * tour is on) is marked and scrolled into view.
 *
 * Focus moves into the panel and back to whatever opened it when it closes; Tab is trapped inside;
 * Escape closes it (Scene.tsx). Previous and next walk the locations in route order.
 */
export function LocationPanel({
    location,
    cards,
    focusId,
    galleryOpen,
    prev,
    next,
    onGo,
    onClose,
}: {
    location: Location;
    cards: WorldCard[];
    focusId: string | null;
    /** Every zone explored: the Gallery card shows the photos instead of its locked door. */
    galleryOpen: boolean;
    prev: Location | null;
    next: Location | null;
    onGo: (l: Location) => void;
    onClose: () => void;
}) {
    const close = useRef<HTMLButtonElement>(null);
    const list = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
        close.current?.focus({ preventScroll: true });
        return () => opener?.focus({ preventScroll: true });
    }, []);
    useEffect(() => {
        if (focusId) list.current?.querySelector(`[data-card="${focusId}"]`)?.scrollIntoView({ block: "nearest" });
    }, [focusId]);
    const trap = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Tab") return;
        const items = [...e.currentTarget.querySelectorAll<HTMLElement>("a[href], button")];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };
    const titleId = `world-location-${location.id}`;
    const placeName = (l: Location) => (l.number ? `${l.number} · ${l.name}` : l.name);

    return (
        <div
            role="dialog"
            aria-labelledby={titleId}
            onKeyDown={trap}
            data-testid="world-panel"
            className="absolute inset-x-3 bottom-3 flex max-h-[55%] flex-col rounded-2xl bg-white shadow-lg ring-1 ring-black/5 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-28 sm:max-h-none sm:w-[23rem]"
        >
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 pb-3 pt-4">
                <h2 id={titleId} className="text-base font-bold text-gray-900">
                    {placeName(location)}
                </h2>
                <button ref={close} type="button" onClick={onClose} aria-label="Close" className={`-m-1 shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-900 ${focusRing}`}>
                    ✕
                </button>
            </div>
            <div ref={list} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                {cards.map((card) => (
                    <CardSection key={card.id} card={card} focused={card.id === focusId} galleryOpen={galleryOpen} />
                ))}
            </div>
            {(prev || next) && (
                <nav aria-label="Other stops" className="flex justify-between gap-2 border-t border-gray-100 px-4 py-2.5 text-xs font-semibold">
                    {prev ? (
                        <button type="button" onClick={() => onGo(prev)} className={`rounded-full px-2 py-1 text-gray-600 hover:text-blue-600 ${focusRing}`}>
                            ← {placeName(prev)}
                        </button>
                    ) : (
                        <span />
                    )}
                    {next && (
                        <button type="button" onClick={() => onGo(next)} className={`rounded-full px-2 py-1 text-gray-600 hover:text-blue-600 ${focusRing}`}>
                            {placeName(next)} →
                        </button>
                    )}
                </nav>
            )}
        </div>
    );
}

/** One card: WORLD.md §7's anatomy, unchanged. */
function CardSection({ card, focused, galleryOpen }: { card: WorldCard; focused: boolean; galleryOpen: boolean }) {
    const gallery = card.id === "gallery" && galleryOpen;
    return (
        <section data-card={card.id} data-testid="world-card" className={`rounded-xl px-2 py-2 ${focused ? "bg-blue-50/70 ring-1 ring-blue-600/20" : ""}`}>
            <h3 className="text-sm leading-snug text-gray-900">
                <span className="font-bold">{card.title}</span>
                {card.subtitle && <span className="text-gray-500"> · {card.subtitle}</span>}
            </h3>
            {gallery ? (
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {GALLERY_PHOTOS.map((photo, i) => (
                        <li key={i} className="text-[11px] leading-snug text-gray-600">
                            {photo.src ? (
                                // eslint-disable-next-line @next/next/no-img-element -- tiny, local, already sized
                                <img src={photo.src} alt={photo.alt} className="aspect-square w-full rounded-lg object-cover" />
                            ) : (
                                <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">Photo to come</div>
                            )}
                            <p className="mt-1">{photo.caption}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{card.body}</p>
            )}
            {card.id === "exit" && EXIT_FOOTNOTE && <p className="mt-2 text-xs font-semibold text-gray-500">{EXIT_FOOTNOTE}</p>}
            {card.links.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {card.links.map((link) => {
                        const external = /^https?:/.test(link.href);
                        return (
                            <li key={link.href}>
                                <a
                                    href={link.href}
                                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                    className={`text-sm font-semibold text-blue-600 hover:underline ${focusRing}`}
                                >
                                    → {link.label}
                                    {external && <span className="sr-only"> (opens in a new tab)</span>}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

/** Global view or Explore (WORLD2.md §5). The current mode is the filled one. */
export function ModeSwitcher({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
    const options: [Mode, string][] = [
        ["global", "Global view"],
        ["explore", "Explore"],
    ];
    return (
        <div role="group" aria-label="How to see the world" className="pointer-events-auto flex rounded-full bg-white/95 p-1 text-xs font-semibold shadow-sm">
            {options.map(([m, label]) => (
                <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => onChange(m)}
                    className={`rounded-full px-3.5 py-1.5 ${mode === m ? "bg-blue-600 text-white" : "text-gray-700 hover:text-blue-600"} ${focusRing}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/** Explore's two views (WORLD2.md D1): through his eyes, or just behind him. V toggles. */
export function ViewSwitcher({ view, onChange }: { view: View; onChange: (v: View) => void }) {
    const options: [View, string][] = [
        ["first", "First person"],
        ["third", "Third person"],
    ];
    return (
        <div role="group" aria-label="Explore view" className="pointer-events-auto flex rounded-full bg-white/95 p-0.5 text-[11px] font-semibold shadow-sm">
            {options.map(([v, label]) => (
                <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => onChange(v)}
                    title={`${label} (V)`}
                    className={`rounded-full px-3 py-1 ${view === v ? "bg-gray-900 text-white" : "text-gray-700 hover:text-blue-600"} ${focusRing}`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

/** Next, previous, pause and exit are always available (§2; WCAG 2.2.2 for the auto-advance). */
export function TourBar({
    index,
    total,
    paused,
    autoAdvance,
    onPrev,
    onNext,
    onPause,
    onExit,
}: {
    index: number;
    total: number;
    paused: boolean;
    autoAdvance: boolean;
    onPrev: () => void;
    onNext: () => void;
    onPause: () => void;
    onExit: () => void;
}) {
    const btn = `rounded-full px-2.5 py-1 hover:bg-gray-100 disabled:opacity-40 ${focusRing}`;
    return (
        <div role="group" aria-label="Tour controls" className={`${chip} pointer-events-auto flex items-center gap-1 px-2 py-1`}>
            <span className="px-2" aria-live="polite">
                Tour · {index + 1} of {total}
            </span>
            <button type="button" className={btn} onClick={onPrev} disabled={index === 0} aria-label="Previous stop">
                ‹
            </button>
            {autoAdvance && (
                <button type="button" className={btn} onClick={onPause} aria-label={paused ? "Resume the tour" : "Pause the tour"}>
                    {paused ? "▶" : "❚❚"}
                </button>
            )}
            <button type="button" className={btn} onClick={onNext} aria-label={index === total - 1 ? "Finish the tour" : "Next stop"}>
                ›
            </button>
            <button type="button" className={btn} onClick={onExit}>
                Exit
            </button>
        </div>
    );
}

/** Every shortcut, in one place (§10 lists them; nothing on screen did): one list per mode. */
export const GLOBAL_KEYS: [string, string][] = [
    ["Drag", "Turn the island (right-drag moves it)"],
    ["Wheel / + −", "Zoom"],
    ["Q / E", "Turn by a quarter"],
    ["W A S D / ← ↑ → ↓", "Walk (switches to Explore)"],
    ["Shift", "Run"],
    ["Tab / Enter", "Visit each stop, open it"],
    ["Esc", "Close the panel"],
];

/**
 * Aboard the Brisbane Metro: the line, and where it is. At a stop the doors are open and the prompt
 * button reads "Get off here"; between stops it reads "Request stop" (the cord), and once pulled this
 * bar says where it will stop. A live region, so a screen reader hears each stop.
 */
export function RideBar({ here, next, requested }: { here: string | null; next: string; requested: boolean }) {
    return (
        <div role="status" className="pointer-events-none absolute inset-x-0 bottom-[7.25rem] flex justify-center px-4">
            <div className="flex max-w-full items-center gap-2.5 rounded-2xl bg-white/95 py-2 pl-2.5 pr-4 text-xs shadow-lg ring-1 ring-black/5">
                <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="3.5" width="16" height="13" rx="2.5" />
                        <path d="M4 10.5h16M8 16.5v2.5M16 16.5v2.5" />
                        <circle cx="8" cy="13.6" r=".6" fill="currentColor" />
                        <circle cx="16" cy="13.6" r=".6" fill="currentColor" />
                    </svg>
                </span>
                <span className="min-w-0">
                    <span className="block font-semibold text-gray-900">Brisbane Metro</span>
                    <span className="block truncate text-gray-600">
                        {here ? `Doors open · ${here}` : requested ? `Stopping at ${next}` : `Next stop · ${next}`}
                    </span>
                </span>
            </div>
        </div>
    );
}

export const EXPLORE_KEYS: [string, string][] = [
    ["W A S D / ↑ ↓", "Walk"],
    ["Drag / ← →", "Look around"],
    ["L", "Lock the mouse to look (Esc frees it)"],
    ["Shift", "Run"],
    ["E", "Open what you're facing; board a bus at its stop, get off"],
    ["V", "First or third person"],
    ["Esc", "Close the panel"],
];

/**
 * The keyboard's legend, on mouse-and-keyboard screens only (`pointer: fine`): phones have no keys,
 * and the d-pad explains itself. Escape or the button closes it.
 */
export function KeysHelp({ keys }: { keys: [string, string][] }) {
    const [open, setOpen] = useState(false);
    const panelId = useId();
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);
    return (
        <div className="relative hidden pointer-fine:block">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label="Keyboard shortcuts"
                title="Keyboard shortcuts"
                className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${open ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:text-blue-600"} ${focusRing}`}
            >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="2.5" y="6" width="19" height="12" rx="2" />
                    <path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M8 14h8" />
                </svg>
            </button>
            {open && (
                <div id={panelId} role="dialog" aria-label="Keyboard shortcuts" className="absolute right-0 top-11 w-64 rounded-2xl bg-white p-4 text-xs shadow-lg ring-1 ring-black/5">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2">
                        {keys.map(([combo, action]) => (
                            <div key={combo} className="contents">
                                <dt className="whitespace-nowrap font-mono font-semibold text-gray-900">{combo}</dt>
                                <dd className="text-gray-600">{action}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}
        </div>
    );
}

/** Bottom left (§2): `3 of 7`. */
export function Counter({ explored, total }: { explored: number; total: number }) {
    return (
        <p className={chip} aria-live="polite">
            {explored} of {total} explored{explored === total ? (GALLERY_READY ? " · the Gallery is open" : " · you've seen it all") : ""}
        </p>
    );
}

/** Top right, always (§2): never behind a menu. */
export function OutLinks() {
    const link = `${chip} hover:text-blue-600 ${focusRing}`;
    return (
        <div className="flex gap-2">
            <a href={site.cv} className={link}>
                <span className="sm:hidden">CV</span>
                <span className="hidden sm:inline">Read the CV</span>
            </a>
            {/* A plain <a>, like the card links: leaving /world is a full load, so the WebGL scene
                is torn down rather than kept alive behind a client-side navigation. The rule only
                started flagging this once /projects/[slug] existed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/projects" className={link}>
                <span className="sm:hidden">Projects</span>
                <span className="hidden sm:inline">All projects</span>
            </a>
        </div>
    );
}

/**
 * Explore's hands (WORLD2.md §5, Phase 3). Listeners go on the scene's wrapper, so taps and clicks
 * still reach the canvas (tap or click the ground to walk there, a building to open it); only drags
 * become looking.
 *
 * - **Mouse:** drag to look. **L** locks the pointer for mouse-look without holding a button; while
 *   it's locked a click opens what you're facing, and Escape (the browser's) frees it. Opening a
 *   panel frees it too, so its links can be clicked.
 * - **Touch:** a joystick wherever the left thumb lands (the left 45%), drag on the right to look.
 * - A crosshair in first person, and the prompt: "E · Open …" with a keyboard, a button on touch.
 */
export function ExploreControls({
    wrapperRef,
    inputRef,
    rigRef,
    view,
    target,
    panelOpen,
    onInteract,
}: {
    wrapperRef: RefObject<HTMLDivElement | null>;
    inputRef: RefObject<MovementInput>;
    rigRef: RefObject<RigApi | null>;
    view: View;
    /** What the prompt offers, as its button reads: "Open Club Velvet", "Board the Brisbane Metro"… */
    target: { label: string } | null;
    panelOpen: boolean;
    onInteract: () => void;
}) {
    const [locked, setLocked] = useState(false);
    const base = useRef<HTMLDivElement>(null);
    const knob = useRef<HTMLDivElement>(null);
    const interact = useRef(onInteract);
    useEffect(() => {
        interact.current = onInteract;
    }, [onInteract]);

    useEffect(() => {
        if (panelOpen && document.pointerLockElement) document.exitPointerLock();
    }, [panelOpen]);

    useEffect(() => {
        const el = wrapperRef.current;
        const inp = inputRef.current;
        if (!el) return;
        const canvas = () => el.querySelector("canvas");
        const onCanvas = (e: PointerEvent) => e.target instanceof HTMLCanvasElement;
        let mouseDrag: number | null = null;
        let stick: { id: number; x: number; y: number } | null = null;
        let lookTouch: { id: number; x: number; y: number } | null = null;
        const R = 48;

        const down = (e: PointerEvent) => {
            if (document.pointerLockElement) {
                // Locked: a click opens what you're facing; it must not reach the canvas at a stale spot.
                e.stopPropagation();
                interact.current();
                return;
            }
            if (!onCanvas(e)) return;
            if (e.pointerType === "touch") {
                const rect = el.getBoundingClientRect();
                if (!stick && e.clientX < rect.left + rect.width * 0.45) {
                    stick = { id: e.pointerId, x: e.clientX, y: e.clientY };
                    if (base.current) {
                        base.current.style.transform = `translate(${e.clientX - rect.left}px, ${e.clientY - rect.top}px)`;
                        base.current.style.opacity = "1";
                    }
                } else if (!lookTouch) lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
            } else if (e.button === 0 || e.button === 2) mouseDrag = e.pointerId;
        };
        const move = (e: PointerEvent) => {
            if (document.pointerLockElement) return;
            if (stick && e.pointerId === stick.id) {
                let dx = e.clientX - stick.x;
                let dy = e.clientY - stick.y;
                const len = Math.hypot(dx, dy);
                if (len > R) {
                    dx = (dx / len) * R;
                    dy = (dy / len) * R;
                }
                const mag = Math.min(len / R, 1);
                inp.stickX = mag > 0.12 ? dx / R : 0;
                inp.stickY = mag > 0.12 ? -dy / R : 0;
                if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
            } else if (lookTouch && e.pointerId === lookTouch.id) {
                rigRef.current?.look((e.clientX - lookTouch.x) * 0.006, -(e.clientY - lookTouch.y) * 0.006);
                lookTouch.x = e.clientX;
                lookTouch.y = e.clientY;
            } else if (mouseDrag === e.pointerId) rigRef.current?.look(e.movementX * 0.0035, -e.movementY * 0.0035);
        };
        const up = (e: PointerEvent) => {
            if (document.pointerLockElement) {
                e.stopPropagation();
                return;
            }
            if (stick && e.pointerId === stick.id) {
                stick = null;
                inp.stickX = 0;
                inp.stickY = 0;
                if (knob.current) knob.current.style.transform = "";
                if (base.current) base.current.style.opacity = "0";
            }
            if (lookTouch && e.pointerId === lookTouch.id) lookTouch = null;
            if (mouseDrag === e.pointerId) mouseDrag = null;
        };
        const lockedMove = (e: MouseEvent) => {
            if (document.pointerLockElement) rigRef.current?.look(e.movementX * 0.0025, -e.movementY * 0.0025);
        };
        const swallowClick = (e: MouseEvent) => {
            if (document.pointerLockElement) e.stopPropagation();
        };
        const onLockChange = () => setLocked(!!document.pointerLockElement);
        const onKey = (e: KeyboardEvent) => {
            if (e.code !== "KeyL" || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select")) return;
            if (document.pointerLockElement) document.exitPointerLock();
            else canvas()?.requestPointerLock?.();
        };
        const noMenu = (e: Event) => onCanvas(e as PointerEvent) && e.preventDefault(); // right-drag looks too
        el.addEventListener("pointerdown", down, true);
        el.addEventListener("pointerup", up, true);
        el.addEventListener("click", swallowClick, true);
        el.addEventListener("contextmenu", noMenu);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointercancel", up);
        document.addEventListener("mousemove", lockedMove);
        document.addEventListener("pointerlockchange", onLockChange);
        window.addEventListener("keydown", onKey);
        return () => {
            el.removeEventListener("pointerdown", down, true);
            el.removeEventListener("pointerup", up, true);
            el.removeEventListener("click", swallowClick, true);
            el.removeEventListener("contextmenu", noMenu);
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointercancel", up);
            document.removeEventListener("mousemove", lockedMove);
            document.removeEventListener("pointerlockchange", onLockChange);
            window.removeEventListener("keydown", onKey);
            inp.stickX = 0;
            inp.stickY = 0;
            if (document.pointerLockElement) document.exitPointerLock();
        };
    }, [wrapperRef, inputRef, rigRef]);

    return (
        <>
            {view === "first" && (
                <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1.5px_rgba(17,24,39,0.55)]" />
            )}
            {/* The joystick: shown where the thumb lands. */}
            <div ref={base} aria-hidden className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity">
                <div className="-translate-x-1/2 -translate-y-1/2">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/30 ring-2 ring-white/70">
                        <div ref={knob} className="h-11 w-11 rounded-full bg-white/90 shadow" />
                    </div>
                </div>
            </div>
            {target && !panelOpen && (
                <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center">
                    <button
                        type="button"
                        onClick={onInteract}
                        className={`pointer-events-auto rounded-full bg-gray-900/85 px-4 py-2 text-xs font-semibold text-white shadow-lg ${focusRing}`}
                    >
                        <span className="mr-2 hidden rounded bg-white/20 px-1.5 py-0.5 font-mono pointer-fine:inline">E</span>
                        {target.label}
                    </button>
                </div>
            )}
            {locked && (
                <p className="pointer-events-none absolute inset-x-0 top-[58%] text-center text-[11px] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
                    Esc frees the mouse
                </p>
            )}
        </>
    );
}
