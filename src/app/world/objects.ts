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
    { id: "crossing", x: -26, z: -25.8, w: 3.4, d: 5.6, h: 2 },
    // 2 · UQ corner
    { id: "degree", x: 2, z: -17.5, w: 16.8, d: 10.9, h: 13.6 },
    { id: "timetable", x: 4.5, z: -10.6, w: 2.8, d: 1, h: 2.6 },
    { id: "eventnow", x: -7.25, z: -11.5, w: 7, d: 3.6, h: 4 },
    // 3 · Government tower
    { id: "finance-forms", x: 27, z: -17.5, w: 10.4, d: 11.3, h: 33 },
    // 4 · Building site: the site itself, and the crane's cab for "one more thing"
    { id: "formosa-bauhaus", x: 25, z: 8, w: 15, d: 10.4, h: 10 },
    { id: "one-more-thing", x: 26, z: 14.4, w: 4.4, d: 1.4, h: 1.4 },
    // 5 · Skyveil garage: the garage, and the arcade cabinet in front of it
    { id: "skyveil", x: 0, z: 7.5, w: 11.8, d: 12.4, h: 6.4 },
    // 6 · Open-source shed
    { id: "eco-router", x: -26, z: 7, w: 7.6, d: 8.4, h: 9.4 },
    // 7 · Prototype park
    { id: "brispulse", x: -31, z: 24.5, w: 3.4, d: 2.4, h: 2.6 },
    { id: "parkease", x: -25, z: 24.5, w: 2.2, d: 2.2, h: 2.6 },
    { id: "journeymate", x: -20, z: 24.5, w: 2.2, d: 2.2, h: 2.6 },
    // Facilities
    { id: "gallery", x: 0, z: 23.5, w: 13.3, d: 8.3, h: 7.3 },
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
    "brispulse",
    "gallery",
    "exit",
].filter((id) => id !== "gallery" || GALLERY_READY);

/** Just south of an object (towards the default camera), clear of its footprint. */
export function objectStandPoint(o: WorldObject): [number, number] {
    return [o.x, o.z + o.d / 2 + 0.9];
}
