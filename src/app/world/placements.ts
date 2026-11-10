/**
 * What stands on the block: every Kenney model placement and every hand-made obstacle, in metres
 * (WORLD.md §3, §6). Zones and their hit areas live in `zones.ts`; this file is only scenery.
 *
 * Kenney's city kits are 8 m per unit (one road tile). A placement's x/z is the centre of the
 * model's footprint and the model stands on y = 0 (or on `y`), whatever its own origin is.
 */
export const KIT_SCALE = 8;
/** The Watercraft Kit has its own unit: boat-row-small at 2.4 m/unit is a ~4 m dinghy. */
export const WATER_SCALE = 2.4;

export type Placement = {
    model: string;
    x: number;
    z: number;
    /** Quarter turns about +y. Kenney fronts face +z, towards the default camera. */
    rot?: 0 | 1 | 2 | 3;
    scale?: number;
    /** Height of the surface it stands on (a plinth, say). */
    y?: number;
    /** Blocks walking. Defaults to true for buildings, false for small props. */
    solid?: boolean;
};

const street: Placement[] = [-36, -28, -20, -12, -4, 4, 12, 20, 28, 36].map((x) => ({
    // Tiles run along x as authored. A zebra crossing sits where the route crosses (x = 4).
    model: x === 4 ? "road-crossing" : "road-straight",
    x,
    z: -4,
    solid: false,
}));

const siteFence: Placement[] = [
    // West and east sides run along z.
    ...[4.5, 7.5, 10.5].flatMap((z) => [
        { model: "construction-fence", x: 18.5, z },
        { model: "construction-fence", x: 33.5, z },
    ]),
    // North side runs along x; the south side leaves a gate at x 24–28.
    ...[20, 23, 26, 29, 32].map((x) => ({ model: "construction-fence", x, z: 2.8, rot: 1 as const })),
    ...[20, 23, 29, 32].map((x) => ({ model: "construction-fence", x, z: 13.2, rot: 1 as const })),
].map((p) => ({ ...p, solid: false }));

export const PLACEMENTS: Placement[] = [
    ...street,

    // 1 · Ferry landing: E.SUN (generic facade, §4 rule 4) and StarLens (shuttered, see Props).
    { model: "building-c", x: -31, z: -18, solid: true },
    { model: "building-a", x: -22, z: -18, solid: true },
    { model: "boat-row-small", x: -23.4, z: -26.5, rot: 1, scale: WATER_SCALE, solid: false },
    { model: "buoy", x: -8, z: -29, scale: WATER_SCALE, solid: false },
    { model: "buoy", x: 14, z: -29.5, scale: WATER_SCALE, solid: false },

    // 2 · UQ corner, with the EventNow stall out front (live, so open and lit, §4).
    { model: "building-j", x: 2, z: -17.5, solid: true },
    { model: "detail-parasol-a", x: -9, z: -11.5, scale: 9, solid: true },
    { model: "detail-parasol-b", x: -5.5, z: -11.5, scale: 9, solid: true },
    { model: "tree-large", x: -11, z: -20, solid: true },
    { model: "tree-small", x: 13.5, z: -21, solid: true },
    // The easter-egg fence (§3): the racquet leans on it in M6.
    { model: "fence-1x3", x: 14.5, z: -12, rot: 1, solid: true },

    // 3 · Government tower (frosted and padlocked: see Props).
    { model: "building-skyscraper-c", x: 27, z: -17.5, solid: true },
    { model: "planter", x: 21, z: -10.5, solid: true },
    { model: "planter", x: 33, z: -10.5, solid: true },

    // Street furniture.
    { model: "light-square", x: -30, z: 1.2, rot: 2 },
    { model: "light-square", x: -10, z: 1.2, rot: 2 },
    { model: "light-square", x: 10, z: 1.2, rot: 2 },
    { model: "light-square", x: 30, z: 1.2, rot: 2 },
    { model: "light-square", x: -18, z: -9.2 },
    { model: "light-square", x: 18, z: -9.2 },

    // 4 · Building site: fenced, coned, scaffolded (§4: in progress).
    ...siteFence,
    { model: "construction-cone", x: 24.5, z: 14.4, solid: false },
    { model: "construction-cone", x: 27.5, z: 14.4, solid: false },
    { model: "construction-barrier", x: 35.5, z: 15, rot: 1, solid: false },

    // 5 · Skyveil garage.
    { model: "building-type-g", x: 0, z: 7, solid: true },
    { model: "dumpster", x: -9, z: 4.5, rot: 1, solid: true },

    // 6 · Open-source shed (shipped: a whole building, door open).
    { model: "building-type-k", x: -26, z: 7, solid: true },
    { model: "tree-small", x: -33.5, z: 5, solid: true },
    { model: "tree-large", x: -18.5, z: 4.5, solid: true },

    // 7 · Prototype park: trees around the plinths (the plinths themselves are Props).
    { model: "tree-large", x: -34, z: 21, solid: true },
    { model: "tree-small", x: -18.5, z: 27.5, solid: true },
    { model: "tree-large", x: -34.5, z: 27.5, solid: true },
    // Scale models on the plinths (§4: a prototype is a model on a plinth, not a building).
    { model: "building-type-g", x: -25, z: 24.5, y: 1.1, scale: 1.4, solid: false }, // ParkEase
    { model: "building-c", x: -20, z: 24.5, y: 1.1, scale: 1.2, solid: false }, // JourneyMate

    // Gallery and exit.
    { model: "building-e", x: 0, z: 23.5, solid: true },
    { model: "tree-small", x: -9, z: 20, solid: true },
    { model: "tree-small", x: 9, z: 20, solid: true },
    { model: "light-curved", x: 31, z: 22.5, rot: 3, solid: false },
];

/**
 * Taipei, across the river (§3: "visible, not walkable"). Kenney's 188-triangle low-detail towers,
 * scaled up and tinted towards the sky so they read as distance.
 */
export const SKYLINE: Placement[] = [
    { model: "low-detail-building-a", x: -36, z: -54, scale: 6 },
    { model: "low-detail-building-e", x: -27, z: -57, scale: 7 },
    { model: "low-detail-building-c", x: -18, z: -53, scale: 6 },
    { model: "low-detail-building-wide-a", x: -8, z: -56, scale: 6 },
    { model: "low-detail-building-m", x: 3, z: -58, scale: 9 }, // the tall one, generic on purpose (§4 rule 4)
    { model: "low-detail-building-g", x: 13, z: -54, scale: 6.5 },
    { model: "low-detail-building-i", x: 23, z: -57, scale: 7 },
    { model: "low-detail-building-k", x: 33, z: -53, scale: 6 },
];

/**
 * The easter egg (WORLD.md §3): a tennis racquet leaning on the fence by the UQ corner, for the
 * Tamkang Tennis Club president. No card, doesn't count; Steven turns to it and hops, and that's all.
 */
export const RACQUET = { x: 16.5, z: -12.6 };

/** Areas Steven can stand on, beyond the main walkable rectangle: the pier. */
export const PIER = { x: -26, minZ: -28.5, maxZ: -23.2, w: 3 };

/** Hand-made solids (metres, XZ footprint), so Steven walks round them. Built in Props.tsx. */
export const PROP_SOLIDS: { x: number; z: number; w: number; d: number }[] = [
    { x: 26, z: 8, w: 15, d: 10.4 }, // the whole fenced building site
    { x: 4.5, z: -10.6, w: 2.6, d: 0.6 }, // volunteer noticeboard
    { x: 3.5, z: 13.2, w: 1, d: 1 }, // arcade cabinet
    { x: -31, z: 24.5, w: 3.2, d: 2.2 }, // blueprint table
    { x: -25, z: 24.5, w: 2, d: 2 }, // ParkEase plinth
    { x: -20, z: 24.5, w: 2, d: 2 }, // JourneyMate plinth
    { x: 26, z: 22, w: 4.4, d: 0.6 }, // exit noticeboard
];
