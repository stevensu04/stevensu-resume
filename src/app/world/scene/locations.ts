import type { WorldCard } from "@/lib/world";
import { OBJECTS, TOUR } from "../objects";
import { ZONES } from "../zones";

/**
 * A location is a zone seen as one stop (WORLD2.md §4): its name and number, and the cards that
 * belong to it, in route order. It's a view over existing data, not a new copy of content: zones come
 * from zones.ts, the card ↔ zone link from each card's own `zone`, the order from objects.ts.
 *
 * Global view's panel shows a whole location (D6); the tour visits one card per location.
 */
export type Location = {
    id: string;
    /** 1–11 for content zones; null for facilities (the exit board, the gallery). */
    number: number | null;
    name: string;
    /** Card ids here, in route order. */
    cards: string[];
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
};

export function buildLocations(cards: WorldCard[]): Location[] {
    const zoneOf = new Map(cards.map((c) => [c.id, c.zone as string]));
    const byZone = new Map<string, string[]>();
    for (const o of OBJECTS) {
        const zone = zoneOf.get(o.id);
        if (!zone) continue;
        byZone.set(zone, [...(byZone.get(zone) ?? []), o.id]);
    }
    // Route order is the tour's order; anything the tour skips goes at the end.
    const order = TOUR.map((id) => zoneOf.get(id));
    const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length);
    return ZONES.filter((z) => byZone.has(z.id))
        .sort((a, b) => rank(a.id) - rank(b.id))
        .map((z) => ({ id: z.id, number: z.number, name: z.name, cards: byZone.get(z.id)!, x: z.x, z: z.z, w: z.w, d: z.d, h: z.h }));
}

/** Where the camera aims for a location and how far back it stands: sized to the zone. */
export function framing(l: Location): { x: number; y: number; z: number; distance: number } {
    return { x: l.x, y: Math.min(l.h * 0.3, 8), z: l.z, distance: Math.min(Math.max(Math.max(l.w, l.d, l.h * 1.1) * 4.2, 62), 160) };
}

/** Where a location's name floats: just above its tallest part. */
export function labelPoint(l: Location): [number, number, number] {
    return [l.x, l.h + 1.8, l.z];
}
