"use client";

import { useEffect, useRef, type RefObject } from "react";
import { EXIT_FOOTNOTE, GALLERY_PHOTOS, type WorldCard } from "@/lib/world";
import { site } from "@/lib/site";
import type { MovementInput } from "./scene/input";

/** The DOM half of /world: cards, the intro, the tour bar, the counter and the d-pad. */

const chip = "whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

/**
 * A card (WORLD.md §7 "Card anatomy"): name and status or org line, a short first-person body, one
 * way out. Pinned above its object from `sm` up (CardAnchor writes --card-x/--card-y); a bottom
 * sheet on phones, so it never covers the thing you just tapped.
 */
export function WorldCardView({
    card,
    cardRef,
    galleryOpen,
    onClose,
}: {
    card: WorldCard;
    cardRef: RefObject<HTMLDivElement | null>;
    /** 7 of 7 explored: the Gallery card shows the photos instead of its locked door. */
    galleryOpen: boolean;
    onClose: () => void;
}) {
    const close = useRef<HTMLButtonElement>(null);
    useEffect(() => close.current?.focus({ preventScroll: true }), []);
    const titleId = `world-card-${card.id}`;
    const gallery = card.id === "gallery" && galleryOpen;

    return (
        <div
            ref={cardRef}
            role="dialog"
            aria-labelledby={titleId}
            data-testid="world-card"
            className={`absolute inset-x-3 bottom-3 max-h-[60%] overflow-y-auto rounded-2xl bg-white p-5 shadow-lg ring-1 ring-black/5 sm:inset-x-auto sm:bottom-auto sm:left-[var(--card-x,50%)] sm:top-[var(--card-y,50%)] sm:max-h-none sm:-translate-x-1/2 sm:-translate-y-[calc(100%+12px)] ${gallery ? "sm:w-[26rem]" : "sm:w-80"}`}
        >
            <div className="flex items-start justify-between gap-3">
                <h2 id={titleId} className="text-sm leading-snug text-gray-900">
                    <span className="font-bold">{card.title}</span>
                    {card.subtitle && <span className="text-gray-500"> · {card.subtitle}</span>}
                </h2>
                <button
                    ref={close}
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className={`-m-1 shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-900 ${focusRing}`}
                >
                    ✕
                </button>
            </div>

            {gallery ? (
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {GALLERY_PHOTOS.map((photo, i) => (
                        <li key={i} className="text-[11px] leading-snug text-gray-600">
                            {photo.src ? (
                                // eslint-disable-next-line @next/next/no-img-element -- tiny, local, already sized
                                <img src={photo.src} alt={photo.alt} className="aspect-square w-full rounded-lg object-cover" />
                            ) : (
                                <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-gray-100 text-[10px] text-gray-400">
                                    Photo to come
                                </div>
                            )}
                            <p className="mt-1">{photo.caption}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{card.body}</p>
            )}

            {card.id === "exit" && EXIT_FOOTNOTE && <p className="mt-2 text-xs font-semibold text-gray-500">{EXIT_FOOTNOTE}</p>}

            {card.links.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
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
        </div>
    );
}

/** The first thing you see once the block has loaded (§2): take the tour, or walk it yourself. */
export function Intro({ onTour, onWalk }: { onTour: () => void; onWalk: () => void }) {
    const first = useRef<HTMLButtonElement>(null);
    useEffect(() => first.current?.focus({ preventScroll: true }), []);
    return (
        <div role="dialog" aria-labelledby="world-intro" className="absolute inset-x-3 top-1/2 mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-black/5">
            <h1 id="world-intro" className="text-lg font-bold text-gray-900">
                Walk around my career
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Seven stops, from a bank in Taipei to a building site in Brisbane. Everything you&apos;ll find here is also on my CV.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
                <button ref={first} type="button" onClick={onTour} className={`rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 ${focusRing}`}>
                    Take the one-minute tour
                </button>
                <button type="button" onClick={onWalk} className={`rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-200 ${focusRing}`}>
                    Walk it yourself
                </button>
            </div>
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

/** Bottom left (§2): `3 of 7`. */
export function Counter({ explored, total }: { explored: number; total: number }) {
    return (
        <p className={`${chip} absolute bottom-4 left-4`} aria-live="polite">
            {explored} of {total} explored{explored === total ? " · the Gallery is open" : ""}
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
            <a href="/projects" className={link}>
                <span className="sm:hidden">Projects</span>
                <span className="hidden sm:inline">All projects</span>
            </a>
        </div>
    );
}

/**
 * The secondary touch input (§0: tap-to-move first, d-pad second), shown on coarse pointers only.
 * Directions are relative to the view, like the arrow keys. Adapted from DECO7381 Team 41's
 * `storefront__touch` buttons, with permission: pointer capture keeps a held button pressed even
 * when the thumb slides off it.
 */
export function DPad({ inputRef }: { inputRef: RefObject<MovementInput> }) {
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
        <div aria-label="Movement controls" role="group" className="absolute bottom-14 right-4 hidden select-none grid-cols-3 grid-rows-3 gap-1 pointer-coarse:grid">
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
