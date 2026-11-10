/**
 * The block's layout (WORLD.md §3) as data. Metres, on the XZ plane: +x is east along the river,
 * +z is south, away from it. The snake route runs row by row: 1 → 3 along the river, 4 → 6 across
 * the street, then 7 → exit at the back.
 *
 * A zone is a footprint: walking into it explores it (§5), and it greys out until then. What stands
 * in it lives in `placements.ts`; what you can tap lives in `objects.ts`; the copy lives in content.
 */
export type Zone = {
    id: string;
    /** 1–7 for content zones; null for the Gallery and the exit, which are facilities (§3). */
    number: number | null;
    name: string;
    /** Centre of the footprint, its size, and height. Metres. */
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
};

export const ZONES: Zone[] = [
    { id: "ferry", number: 1, name: "Ferry landing", x: -26, z: -19, w: 20, d: 14, h: 10 },
    { id: "uq", number: 2, name: "UQ corner", x: 0, z: -16, w: 24, d: 13, h: 12 },
    { id: "gov", number: 3, name: "Government tower", x: 27, z: -16, w: 13, d: 13, h: 33 },
    { id: "site", number: 4, name: "Building site", x: 26, z: 8, w: 16, d: 12, h: 14 },
    { id: "garage", number: 5, name: "Skyveil garage", x: 0, z: 8.5, w: 15, d: 11, h: 9 },
    { id: "shed", number: 6, name: "Open-source shed", x: -26, z: 8, w: 11, d: 11, h: 9 },
    { id: "park", number: 7, name: "Prototype park", x: -26, z: 24, w: 18, d: 10, h: 4 },
    { id: "gallery", number: null, name: "Gallery", x: 0, z: 24, w: 14, d: 9, h: 9 },
    { id: "exit", number: null, name: "Exit noticeboard", x: 26, z: 23, w: 8, d: 4, h: 4 },
];

/** The slab is the whole block, river strip included (§0: about 80 × 60 m). */
export const SLAB = { minX: -40, maxX: 40, minZ: -32, maxZ: 32 };
/** The Brisbane River runs along the north edge of the slab. */
export const RIVER = { minZ: -32, maxZ: -24 };
/** The street between the river row and the middle row. */
export const STREET = { z: -4 };
/** Where Steven may stand: the slab minus the river and a margin. Buildings are cut out in placements.ts. */
export const WALKABLE = { minX: -38.5, maxX: 38.5, minZ: RIVER.maxZ + 1.2, maxZ: 30.5 };

