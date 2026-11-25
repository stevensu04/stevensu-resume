/**
 * The things you can tap (WORLD.md §3 table, "Objects (cards)"): one hit area per card, placed
 * over the model or prop that stands for it in `placements.ts` / `Props.tsx`. The geometry carries
 * the honesty grammar (§4); the card says it in words.
 *
 * Plain data, no three.js, so the server page can check that every card has an object and every
 * object has a card before the route builds.
 */
import { GALLERY_READY } from "@/lib/world";

export type WorldObject = {
    /** The card id: a project slug, or a key in `src/lib/world.ts`. */
    id: string;
    /** Centre of the hit area's footprint, its size, and its height. Metres. */
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
};

const ALL_OBJECTS: WorldObject[] = [
    // 1 · Ferry landing
    { id: "esun", x: -31, z: -18, w: 7.2, d: 7.4, h: 9 },
    { id: "starlens", x: -22, z: -18, w: 7.2, d: 7.8, h: 10.5 },
    { id: "crossing", x: -26.5, z: -28.5, w: 16, d: 10.4, h: 8 },
    // 2 · UQ corner
    { id: "degree", x: 2, z: -17.5, w: 16.8, d: 10.9, h: 15.4 },
    { id: "timetable", x: 4.5, z: -10.6, w: 2.8, d: 1, h: 2.6 },
    { id: "eventnow", x: -7.25, z: -11.5, w: 7, d: 3.6, h: 4 },
    // 3 · Government tower
    { id: "finance-forms", x: 27, z: -17.5, w: 10.4, d: 11.3, h: 42 },
    // 4 · Shopfront: Formosa Bauhaus itself, and the fitting mirror out front for "one more thing"
    { id: "formosa-bauhaus", x: 26.25, z: 7.5, w: 13.6, d: 7.2, h: 7 },
    { id: "one-more-thing", x: 33.75, z: 12, w: 1.3, d: 0.9, h: 2.4 },
    // 5 · Skyveil: the museum and theatre, with its archery targets in the forecourt
    { id: "skyveil", x: 0, z: 7.4, w: 12, d: 9.6, h: 7.6 },
    // 6 · Open-source shed
    { id: "eco-router", x: -26, z: 7.2, w: 9.8, d: 8.4, h: 5 },
    // 7 · Prototype park
    { id: "parkease", x: -25, z: 24.5, w: 2.2, d: 2.2, h: 2.6 },
    { id: "journeymate", x: -20, z: 24.5, w: 2.2, d: 2.2, h: 2.6 },
    // 8 · Club Velvet: the club, with its queue and bouncer out front (the hit area covers the plaza)
    { id: "club-velvet", x: -16, z: 42.3, w: 14, d: 11.2, h: 6 },
    // 10, 11 · Two part-time jobs: the restaurants' fronts, with the cart and bench out front
    { id: "seoul-garden", x: 2.5, z: 41.9, w: 11.6, d: 8, h: 4.8 },
    { id: "dw-steakhouse", x: 13.5, z: 41.9, w: 8.2, d: 8, h: 4.8 },
    // 9 · BrisPulse: the transit control centre (live, so a whole building, door open)
    { id: "brispulse", x: 34, z: 31.2, w: 9.8, d: 8.8, h: 7.6 },
    // Facilities
    { id: "gallery", x: 0, z: 23.5, w: 12.4, d: 8, h: 7.4 },
    { id: "exit", x: 26, z: 22, w: 4.6, d: 1, h: 3.2 },
];

/** The Gallery's hit area exists only once its photos do (GALLERY_READY in src/lib/world.ts). */
export const OBJECTS: WorldObject[] = ALL_OBJECTS.filter((o) => o.id !== "gallery" || GALLERY_READY);

/**
 * The guided tour (§2): one card per zone, in route order. Steven walks it himself and each card
 * opens in turn. The crossing stands for the ferry landing because it's the one card that isn't on
 * the CV; finishing the tour counts every zone as explored.
 */
export const TOUR: string[] = [
    "crossing",
    "degree",
    "finance-forms",
    "formosa-bauhaus",
    "skyveil",
    "eco-router",
    "parkease",
    "club-velvet",
    "seoul-garden",
    "dw-steakhouse",
    "brispulse",
    "gallery",
    "exit",
].filter((id) => id !== "gallery" || GALLERY_READY);

/** Just south of an object (towards the default camera), clear of its footprint. */
export function objectStandPoint(o: WorldObject): [number, number] {
    return [o.x, o.z + o.d / 2 + 0.9];
}
