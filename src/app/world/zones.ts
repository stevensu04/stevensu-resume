/**
 * The block's layout (WORLD.md §3) as data. Metres, on the XZ plane: +x is east along the river,
 * +z is south, away from it. The snake route runs row by row: 1 → 3, then 4 → 6, then 7 → exit.
 *
 * M1 places grey blocks only. Card copy and the `world:` front-matter field arrive in M4 (§8), so
 * nothing here duplicates content from `content/projects/*.md`.
 */
export type Zone = {
    id: string;
    /** 1–7 for content zones; null for the Gallery and the exit, which are facilities (§3). */
    number: number | null;
    name: string;
    /** Centre of the block's footprint. */
    x: number;
    z: number;
    /** Footprint and height of the placeholder block. */
    w: number;
    d: number;
    h: number;
};

export const ZONES: Zone[] = [
    { id: "ferry", number: 1, name: "Ferry landing", x: -26, z: -12, w: 12, d: 7, h: 4 },
    { id: "uq", number: 2, name: "UQ corner", x: 0, z: -12, w: 14, d: 9, h: 10 },
    { id: "gov", number: 3, name: "Government tower", x: 26, z: -12, w: 8, d: 8, h: 24 },
    { id: "site", number: 4, name: "Building site", x: 26, z: 5, w: 12, d: 9, h: 8 },
    { id: "garage", number: 5, name: "Skyveil garage", x: 0, z: 5, w: 10, d: 8, h: 5 },
    { id: "shed", number: 6, name: "Open-source shed", x: -26, z: 5, w: 8, d: 6, h: 4 },
    { id: "park", number: 7, name: "Prototype park", x: -26, z: 21, w: 14, d: 9, h: 1.5 },
    { id: "gallery", number: null, name: "Gallery", x: 0, z: 21, w: 10, d: 7, h: 6 },
    { id: "exit", number: null, name: "Exit noticeboard", x: 26, z: 21, w: 6, d: 1.5, h: 3 },
];

/** The slab is the whole block, river strip included (§0: about 80 × 60 m). */
export const SLAB = { minX: -40, maxX: 40, minZ: -30, maxZ: 30 };
/** The river runs along the north edge of the slab. */
export const RIVER = { minZ: -30, maxZ: -21 };
/** Where Steven may stand: the slab minus the river and a 1.5 m margin. A polygon replaces it in M2. */
export const WALKABLE = { minX: -38.5, maxX: 38.5, minZ: RIVER.maxZ + 1.5, maxZ: 28.5 };

/** The spot in front of a block (its south face) where Steven stops when the block is clicked. */
export function standPoint(zone: Zone): [number, number] {
    return [zone.x, Math.min(zone.z + zone.d / 2 + 1.8, WALKABLE.maxZ)];
}
