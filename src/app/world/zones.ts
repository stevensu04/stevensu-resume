/**
 * The block's layout (WORLD.md §3) as data. Metres, on the XZ plane: +x is east along the river,
 * +z is south, away from it. The snake route runs row by row: 1 → 3 along the river, 4 → 6 across
 * the street, then 7 at the back, and 8 on the night street beyond them (added 26 Nov 2026,
 * which took the slab from 80 × 64 m to 80 × 88 m, +37.5%). The slab later grew again, to 96 m wide
 * for the ring road's connectors and 104 m deep for a wider river and the south shelters. The exit
 * noticeboard moved from the back row to the block's south-west corner on 27 Nov 2026, apart from
 * every building, by the road off the island.
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
    { id: "uq", number: 2, name: "UQ corner", x: 0, z: -16, w: 24, d: 13, h: 15 },
    { id: "gov", number: 3, name: "Government tower", x: 27, z: -16, w: 13, d: 13, h: 33 },
    // Still id "site" (content files point at it); the building site became a finished storefront.
    { id: "site", number: 4, name: "3D Storefront", x: 26, z: 8, w: 17, d: 12, h: 9 },
    { id: "garage", number: 5, name: "Skyveil museum", x: 0, z: 8.5, w: 15, d: 11, h: 9 },
    { id: "shed", number: 6, name: "Open-source shed", x: -26, z: 8, w: 11, d: 11, h: 9 },
    { id: "park", number: 7, name: "Prototype park", x: -22.5, z: 24, w: 13, d: 10, h: 4 },
    // Zone 8 stands on its own street south of the back row, so the first seven keep their order.
    { id: "club", number: 8, name: "Club Velvet", x: -16, z: 42, w: 22, d: 14, h: 6 },
    // Zones 9 and 10 are two part-time restaurant jobs, in the night street's row beside Club Velvet.
    { id: "seoul", number: 9, name: "Seoul Garden", x: 2.5, z: 41.9, w: 12, d: 8.8, h: 5 },
    { id: "dw", number: 10, name: "D.W. Steakhouse", x: 13.5, z: 41.9, w: 9, d: 8.8, h: 5 },
    // Zone 11 is BrisPulse's own building, east of the gallery and exit, once it was live rather than a concept.
    // Numbered last so the tour reads 1 to 11 in order: the night street's row first, then the east side.
    { id: "transit", number: 11, name: "Transit control centre", x: 34, z: 31.2, w: 11.4, d: 9.6, h: 10.5 },
    { id: "gallery", number: null, name: "Gallery", x: 0, z: 24, w: 14, d: 9, h: 9 },
    // The block's south-west corner, by the ring road: the way off the island (moved 27 Nov 2026).
    { id: "exit", number: null, name: "Exit noticeboard", x: -36, z: 44, w: 8, d: 4, h: 4 },
];

/** The slab is the whole block, river strip included (§0: about 80 × 60 m). */
export const SLAB = { minX: -48, maxX: 48, minZ: -44, maxZ: 60 };
/** Taipei's bank, across the river: scenery only, never walkable (placements.ts SKYLINE). */
export const FAR_BANK = { minZ: -51.5, maxZ: -44 };
/** The Brisbane River runs along the north edge of the slab. */
export const RIVER = { minZ: -44, maxZ: -24 };
/** The street between the river row and the middle row. */
export const STREET = { z: -4 };
/** The night street along the south edge, in front of Club Velvet (zone 8). */
export const STREET_SOUTH = { z: 52 };
/**
 * The ring road (added 26 Nov 2026): the two streets, joined at the slab's east and west margins by
 * a connector each, so traffic can go round. These are the road centrelines, metres.
 */
export const RING = { west: -44, east: 44, north: STREET.z, south: STREET_SOUTH.z };
/** Where Steven may stand: the slab minus the river and a margin. Buildings are cut out in placements.ts. */
export const WALKABLE = { minX: -46.5, maxX: 46.5, minZ: RIVER.maxZ + 1.2, maxZ: 58.5 };

