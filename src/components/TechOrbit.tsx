"use client";
import React, { useEffect, useRef } from "react";
import { techRings, type StackRing } from "@/lib/stack";

/**
 * 3D tech-stack orbit — two counter-rotating rings of billboarded badges.
 *
 * Motion is three layers stacked on one scalar:
 *   1. base      — continuous slow rotation, alive from first paint
 *   2. scroll    — adds angular *velocity*, decaying back to base
 *   3. drag      — pointer drag with inertia
 *
 * Scroll-linked rotation alone would leave the hero frozen until the visitor
 * scrolls, and by then it is already leaving the viewport — hence the base layer.
 * The page always scrolls normally; nothing is pinned. See PLAN.md §9.
 */

/** deg/sec — one revolution per 40s. */
const BASE_SPEED = 9;
/** Fraction of the scroll/drag impulse surviving after one second. */
const IMPULSE_DECAY = 0.06;
const SCROLL_GAIN = 0.45;
const DRAG_GAIN = 0.35;
const MAX_IMPULSE = 260;
/** Guards against a huge dt after a background tab wakes up. */
const MAX_FRAME = 0.05;

const clamp = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

const toneClass: Record<StackRing["tone"], string> = {
    primary: "bg-blue-600 text-white shadow-blue-600/20",
    dark: "bg-slate-900 text-white shadow-slate-900/20",
};

const dotClass: Record<StackRing["tone"], string> = {
    primary: "bg-blue-600",
    dark: "bg-slate-900",
};

export default function TechOrbit() {
    const stageRef = useRef<HTMLDivElement>(null);
    const ringRefs = useRef<(HTMLUListElement | null)[]>([]);

    const rot = useRef(0);
    const impulse = useRef(0);
    const dragging = useRef(false);

    useEffect(() => {
        const desktop = window.matchMedia("(min-width: 1024px)");
        const stillness = window.matchMedia("(prefers-reduced-motion: reduce)");

        let frame = 0;
        let last = 0;

        const paint = () => {
            techRings.forEach((ring, i) => {
                ringRefs.current[i]?.style.setProperty(
                    "--rot",
                    (rot.current * ring.speed).toFixed(2)
                );
            });
        };

        const tick = (ts: number) => {
            const dt = last ? Math.min((ts - last) / 1000, MAX_FRAME) : 0;
            last = ts;

            // Frame-rate independent decay, so the feel is identical at 60 and 120Hz.
            impulse.current *= Math.pow(IMPULSE_DECAY, dt);
            // Base rotation pauses while the user is driving it by hand.
            const speed = (dragging.current ? 0 : BASE_SPEED) + impulse.current;
            rot.current += speed * dt;

            paint();
            frame = requestAnimationFrame(tick);
        };

        let lastScrollY = window.scrollY;
        const onScroll = () => {
            const dy = window.scrollY - lastScrollY;
            lastScrollY = window.scrollY;
            impulse.current = clamp(impulse.current + dy * SCROLL_GAIN, MAX_IMPULSE);
        };

        // ── Drag ────────────────────────────────────────────────────────────
        const stage = stageRef.current;
        let lastX = 0;
        let dragVelocity = 0;
        let lastMoveTs = 0;

        const onPointerDown = (e: PointerEvent) => {
            dragging.current = true;
            lastX = e.clientX;
            lastMoveTs = e.timeStamp;
            dragVelocity = 0;
            stage?.setPointerCapture(e.pointerId);
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - lastX;
            const dt = Math.max((e.timeStamp - lastMoveTs) / 1000, 0.001);
            lastX = e.clientX;
            lastMoveTs = e.timeStamp;

            rot.current += dx * DRAG_GAIN;
            dragVelocity = (dx * DRAG_GAIN) / dt;
            paint();
        };

        const onPointerUp = (e: PointerEvent) => {
            if (!dragging.current) return;
            dragging.current = false;
            // Release into inertia.
            impulse.current = clamp(impulse.current + dragVelocity, MAX_IMPULSE);
            stage?.releasePointerCapture(e.pointerId);
        };

        // ── Lifecycle ───────────────────────────────────────────────────────
        let running = false;

        const shouldRun = () => desktop.matches && !stillness.matches;

        const start = () => {
            if (running) return;
            running = true;
            last = 0;
            lastScrollY = window.scrollY;
            window.addEventListener("scroll", onScroll, { passive: true });
            stage?.addEventListener("pointerdown", onPointerDown);
            stage?.addEventListener("pointermove", onPointerMove);
            stage?.addEventListener("pointerup", onPointerUp);
            stage?.addEventListener("pointercancel", onPointerUp);
            frame = requestAnimationFrame(tick);
        };

        const stop = () => {
            if (!running) return;
            running = false;
            dragging.current = false;
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", onScroll);
            stage?.removeEventListener("pointerdown", onPointerDown);
            stage?.removeEventListener("pointermove", onPointerMove);
            stage?.removeEventListener("pointerup", onPointerUp);
            stage?.removeEventListener("pointercancel", onPointerUp);
        };

        const sync = () => (shouldRun() ? start() : stop());

        sync();
        desktop.addEventListener("change", sync);
        stillness.addEventListener("change", sync);

        return () => {
            stop();
            desktop.removeEventListener("change", sync);
            stillness.removeEventListener("change", sync);
        };
    }, []);

    return (
        <>
            {/* 3D orbit — decorative duplicate of the grid below, which carries the semantics. */}
            <div
                className="tech-orbit relative aspect-square w-full max-w-[520px] cursor-grab active:cursor-grabbing"
                aria-hidden="true"
            >
                <div ref={stageRef} className="tech-orbit__stage absolute inset-0">
                    <div className="tech-orbit__scene">
                        {/* Faint disc behind the rings, so the orbit reads as a volume. */}
                        <div className="absolute inset-[12%] rounded-full bg-blue-50/60" />

                        {techRings.map((ring, ringIndex) => (
                            <ul
                                key={ring.id}
                                ref={(el) => {
                                    ringRefs.current[ringIndex] = el;
                                }}
                                className="tech-orbit__ring"
                                style={
                                    {
                                        "--offset": `${ring.offset}px`,
                                        "--radius": `${ring.radius}px`,
                                    } as React.CSSProperties
                                }
                            >
                                {ring.items.map((item, i) => (
                                    <li
                                        key={item}
                                        className="tech-orbit__item"
                                        style={
                                            {
                                                "--angle": (360 / ring.items.length) * i,
                                            } as React.CSSProperties
                                        }
                                    >
                                        <span
                                            className={`tech-orbit__pill rounded-full px-4 py-2 text-sm font-bold shadow-lg ${toneClass[ring.tone]}`}
                                        >
                                            {item}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </div>
                </div>

                {/* Without this the two tones are just two colours. The legend is what turns ring
                    membership into the meaning-carrying signal the old six-colour cloud lacked. */}
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-6">
                    {techRings.map((ring) => (
                        <span
                            key={ring.id}
                            className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500"
                        >
                            <span className={`h-2 w-2 rounded-full ${dotClass[ring.tone]}`} />
                            {ring.label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Flat fallback: visible on mobile and under reduced motion, screen-reader-only
                on desktop. Always the semantic source of truth. */}
            <div className="tech-grid flex w-full max-w-[520px] flex-col gap-5">
                {techRings.map((ring) => (
                    <div key={ring.id}>
                        <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500">
                            {ring.label}
                        </h2>
                        <ul className="flex flex-wrap justify-center gap-2 lg:justify-start">
                            {ring.items.map((item) => (
                                <li
                                    key={item}
                                    className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm ${toneClass[ring.tone]}`}
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
}
