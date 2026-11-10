"use client";

import { useEffect, useRef } from "react";
import type { WorldCard } from "@/lib/world";
import { EXIT_FOOTNOTE } from "@/lib/world";
import { ZONES } from "./zones";
import { OBJECTS } from "./objects";

/**
 * The world without WebGL (WORLD.md §10): an ordered list of zones and their cards, in route order.
 * Always rendered. While the scene runs it's visually hidden and the canvas is `aria-hidden`, so a
 * screen reader reads this instead of a picture. With no WebGL, a slow device, or a visitor who
 * asked for it, it's the page.
 */
export default function WorldList({
    cards,
    visible,
    reason,
    onRetry,
}: {
    cards: WorldCard[];
    visible: boolean;
    reason?: "no-webgl" | "slow" | "chosen";
    onRetry?: () => void;
}) {
    // When the list becomes the page, take the visitor (and their focus) to it.
    const heading = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        const el = heading.current;
        if (!visible || !el) return;
        el.focus({ preventScroll: true });
        // After the list has laid out at full size, not while it was still `sr-only`.
        const timer = setTimeout(() => el.scrollIntoView({ block: "start" }), 0);
        return () => clearTimeout(timer);
    }, [visible]);

    // Objects are listed in route order, so the cards inherit it.
    const order = new Map(OBJECTS.map((o, i) => [o.id, i]));
    const byZone = (zone: string) => cards.filter((c) => c.zone === zone).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    return (
        <section aria-labelledby="world-list" className={visible ? "mx-auto max-w-3xl px-6 py-12" : "sr-only"}>
            <h2 id="world-list" ref={heading} tabIndex={-1} className="scroll-mt-28 text-2xl font-bold text-gray-900 focus:outline-none">
                The world, as a list
            </h2>
            {reason === "no-webgl" && (
                <p className="mt-2 text-sm text-gray-600">This browser can&apos;t draw the 3D view, so here is everything in it.</p>
            )}
            {reason === "slow" && (
                <p className="mt-2 text-sm text-gray-600">
                    This device was struggling with the 3D view, so here is everything in it.{" "}
                    {onRetry && (
                        <button type="button" onClick={onRetry} className="font-semibold text-blue-600 hover:underline">
                            Try the 3D view anyway
                        </button>
                    )}
                </p>
            )}
            <ol className="mt-8 space-y-10">
                {ZONES.map((zone) => {
                    const zoneCards = byZone(zone.id);
                    if (!zoneCards.length) return null;
                    return (
                        <li key={zone.id}>
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {zone.number === null ? zone.name : `${zone.number} · ${zone.name}`}
                            </h3>
                            <ul className="mt-3 space-y-6">
                                {zoneCards.map((card) => (
                                    <li key={card.id}>
                                        <h4 className="text-base text-gray-900">
                                            <span className="font-bold">{card.title}</span>
                                            {card.subtitle && <span className="text-gray-500"> · {card.subtitle}</span>}
                                        </h4>
                                        <p className="mt-1 text-sm leading-relaxed text-gray-600">{card.body}</p>
                                        {card.id === "exit" && EXIT_FOOTNOTE && <p className="mt-1 text-xs font-semibold text-gray-500">{EXIT_FOOTNOTE}</p>}
                                        {card.links.length > 0 && (
                                            <ul className="mt-2 flex flex-wrap gap-x-4">
                                                {card.links.map((link) => {
                                                    const external = /^https?:/.test(link.href);
                                                    return (
                                                        <li key={link.href}>
                                                            <a
                                                                href={link.href}
                                                                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                                                                className="text-sm font-semibold text-blue-600 hover:underline"
                                                            >
                                                                → {link.label}
                                                                {external && <span className="sr-only"> (opens in a new tab)</span>}
                                                            </a>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
