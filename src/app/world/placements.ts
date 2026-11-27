/**
 * What stands on the block: every Kenney model placement and every hand-made obstacle, in metres
 * (WORLD.md §3, §6). Zones and their hit areas live in `zones.ts`; this file is only scenery.
 *
 * Kenney's city kits are 8 m per unit (one road tile). A placement's x/z is the centre of the
 * model's footprint and the model stands on y = 0 (or on `y`), whatever its own origin is.
 */
export const KIT_SCALE = 8;

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

// The night street along the south edge (zone 8). The zebra crossing is by the club.
const nightStreet: Placement[] = [-36, -28, -20, -12, -4, 4, 12, 20, 28, 36].map((x) => ({
    model: x === -4 ? "road-crossing" : "road-straight",
    x,
    z: 52,
    solid: false,
}));

// The ring road's two connectors, at the slab's east and west margins, joining the streets' ends. Their
// four corners are hand-made (scene/Roads.tsx): the kit has no bend.
const connectors: Placement[] = [-44, 44].flatMap((x) =>
    [4, 12, 20, 28, 36, 44].map((z) => ({ model: "road-straight", x, z, rot: 1 as const, solid: false })),
);

export const PLACEMENTS: Placement[] = [
    ...street,
    ...nightStreet,
    ...connectors,

    // 1 · Ferry landing: E.SUN is hand-made (EsunBank.tsx; its round mark is in Landmarks) and StarLens (shuttered, see Props).
    // Turned round on 27 Nov 2026: the kit model's glass doors are on its −z side, so at rot 0 they faced
    // the river. At rot 2 they face the street, under StarLens's shutter (Props.tsx), and its mark (Landmarks.tsx).
    { model: "building-a", x: -22, z: -18, rot: 2, solid: true },

    // 2 · UQ corner, with the EventNow stall out front (live, so open and lit, §4).
    // The sandstone building is hand-made (GreatCourt.tsx), in place of Kenney's building-j.
    { model: "detail-parasol-a", x: -9, z: -11.5, scale: 9, solid: true },
    { model: "detail-parasol-b", x: -5.5, z: -11.5, scale: 9, solid: true },
    // The jacarandas either side and the easter-egg tennis fence (§3) are hand-made: Landmarks.tsx.

    // 3 · Government tower (frosted and padlocked: see Props).
    // The tower is hand-made (GovTower.tsx), in place of Kenney's building-skyscraper-c.
    { model: "planter", x: 21, z: -10.5, solid: true },
    { model: "planter", x: 33, z: -10.5, solid: true },

    // Street furniture.
    { model: "light-square", x: -30, z: 1.2, rot: 2 },
    { model: "light-square", x: -10, z: 1.2, rot: 2 },
    { model: "light-square", x: 10, z: 1.2, rot: 2 },
    { model: "light-square", x: 30, z: 1.2, rot: 2 },
    { model: "light-square", x: -18, z: -9.2 },
    { model: "light-square", x: 18, z: -9.2 },

    // 4 · The Formosa Bauhaus shopfront is hand-made (Formosa.tsx): finished, so no fence (§4).

    // 5 · Skyveil garage.
    // The museum and theatre is hand-made (SkyveilMuseum.tsx), in place of Kenney's building-type-g.
    { model: "dumpster", x: -9, z: 4.5, rot: 1, solid: true },

    // 6 · Open-source shed (shipped: a whole building, door open).
    // The data centre is hand-made (DataCentre.tsx), in place of Kenney's building-type-k.
    { model: "tree-small", x: -33.5, z: 5, solid: true },
    { model: "tree-large", x: -18.5, z: 4.5, solid: true },

    // 7 · Prototype park: trees around the plinths (the plinths themselves are Props).
    { model: "tree-large", x: -28.6, z: 21, solid: true },
    { model: "tree-small", x: -18.5, z: 27.5, solid: true },
    { model: "tree-large", x: -29, z: 27.5, solid: true },
    // The park's lamp, on its south-east corner by the back path rather than among the plinths, arm
    // out over the grass (27 Nov 2026: every zone has at least one lamp; NightLife lights any lamp here).
    { model: "light-square", x: -16.4, z: 30, rot: 3 },
    // The models on the plinths (§4: a prototype is a model on a plinth) are hand-made: Landmarks.tsx.

    // The gallery. It is hand-made (Landmarks.tsx).
    { model: "tree-small", x: -9, z: 20, solid: true },
    { model: "tree-small", x: 9, z: 20, solid: true },
    // The gallery's lamp: front right, opposite the sculpture, its arm towards the door.
    { model: "light-square", x: 4.6, z: 29.4, rot: 2 },
    // Lit the exit noticeboard until it moved to the block's south-west corner (27 Nov 2026); it
    // stays for the path between the shopfront and the control centre.
    { model: "light-curved", x: 31, z: 22.5, rot: 3, solid: false },

    // 8 · Club Velvet is hand-made (ClubVelvet.tsx). Its neighbours on the night street are plain
    // Kenney buildings: scenery, with no card and no zone, so they stay in full colour (§4: only
    // what Steven built is a stop). Kept low so they don't hide the block behind them (the
    // camera looks north from the south, and a wall hides about 1.4 m of ground per metre of height).
    // (Kenney's building-a, c and e stood here until Steven's two part-time restaurants replaced
    // them: Restaurants.tsx. Those have cards and zones of their own.)
    { model: "tree-large", x: 19.6, z: 44, solid: true },
    // (A building-j stood at x 29.5 until BrisPulse got its control centre behind it: the camera looks
    // from the south-west, so it hid the new building. The end of the strip is trees now.)
    { model: "tree-small", x: 37.5, z: 42.5, solid: true },
    // The control centre's lamp: front right, clear of the kiosk at its front left, arm towards the door.
    { model: "light-square", x: 37.4, z: 37.4, rot: 2 },
    { model: "tree-large", x: -34, z: 39.5, solid: true },
    { model: "tree-small", x: -31, z: 45, solid: true },
    { model: "tree-small", x: -4.5, z: 46.2, solid: true },
    // The margins the ring road runs through, north of the streets: a few trees so they aren't bare.
    // (Two trees stood here at x 43 and 45.5 until The Star took the north-east corner: Riverside.tsx.)
    { model: "tree-large", x: -43, z: -15, solid: true },
    { model: "tree-small", x: -45.5, z: -20, solid: true },
    // Street furniture along the night street's north footpath.
    { model: "light-square", x: -32, z: 46.8 },
    { model: "light-square", x: -4, z: 46.8 },
    { model: "light-square", x: 12, z: 46.8 },
    { model: "light-square", x: 34, z: 46.8 },
];

/**
 * Taipei, on the far bank (§3: "visible, not walkable"), right across the river from the ferry
 * landing so it's in view while you're there, not only in the overview. Kenney's 188-triangle
 * low-detail towers and a row of trees, tinted towards the sky so the far side reads as another
 * place, with Taipei 101 (hand-made, scene/Taipei101.tsx) standing over them at TAIPEI_101.
 * Past tense only: nothing over there can be walked to or opened.
 */
export const TAIPEI_101 = { x: -13, z: -48.6 };

export const SKYLINE: Placement[] = [
    { model: "low-detail-building-m", x: -44, z: -48.4, scale: 6 },
    { model: "low-detail-building-a", x: -35, z: -48.5, scale: 6 },
    { model: "low-detail-building-e", x: -27, z: -49.5, scale: 6.6 },
    { model: "low-detail-building-c", x: -21, z: -48, scale: 6 },
    { model: "low-detail-building-wide-a", x: 0, z: -49, scale: 6 },
    { model: "low-detail-building-g", x: 10, z: -48.5, scale: 6.6 },
    { model: "low-detail-building-i", x: 20, z: -49.5, scale: 6.6 },
    { model: "low-detail-building-k", x: 30, z: -48, scale: 6 },
    { model: "low-detail-building-c", x: 38, z: -49.5, scale: 5.4 },
    { model: "low-detail-building-a", x: 45, z: -48.5, scale: 5.6 },
    // A line of trees along the water's edge.
    ...[-46, -38, -31, -26, -19, -7.5, 5, 14.5, 25, 34, 42].map((x, i) => ({ model: i % 2 ? "tree-small" : "tree-large", x, z: -45.4, scale: 7 })),
];
/**
 * The easter egg (WORLD.md §3): a tennis racquet leaning on the fence by the UQ corner, for the
 * Tamkang Tennis Club president. No card, doesn't count; Steven turns to it and hops, and that's all.
 */
export const RACQUET = { x: 16.5, z: -12.6 };

/**
 * The ferry terminal (scene/FerryTerminal.tsx), where the plain pier was until 26 Nov 2026: a gangway
 * from the bank out to a floating pontoon, with a wing roof and a fin at the pontoon's west end.
 * Steven can walk on the gangway and the pontoon (walk.ts). The ferry docks on the pontoon's river
 * side: `lane` is its centreline, clear of the pontoon whose edge is at minZ, and `dockX` is where its
 * middle stops. Metres.
 */
export const TERMINAL = {
    gangway: { x: -26, w: 2.6, minZ: -29.4, maxZ: -24 },
    pontoon: { minX: -34, maxX: -19, minZ: -33.4, maxZ: -29.4 },
    pylon: { x: -33, z: -31.4 },
    roofX: -27,
    lane: -36.8,
    dockX: -18,
};

/** Hand-made solids (metres, XZ footprint), so Steven walks round them. Built in Props.tsx. */
export const PROP_SOLIDS: { x: number; z: number; w: number; d: number }[] = [
    { x: 26.25, z: 7.5, w: 13.6, d: 7.2 }, // the Formosa Bauhaus shopfront (Formosa.tsx)
    { x: 27.9, z: 11.6, w: 0.7, d: 0.7 }, // its two planters
    { x: 30.6, z: 11.6, w: 0.7, d: 0.7 },
    { x: 33.75, z: 12, w: 1.1, d: 0.5 }, // and the fitting mirror out front
    { x: 2, z: -17.5, w: 16.8, d: 10.9 }, // the UQ sandstone building (GreatCourt.tsx)
    { x: 27, z: -17.5, w: 10.4, d: 11.3 }, // the government tower's podium (GovTower.tsx)
    { x: -31, z: -17.7, w: 7.2, d: 8.0 }, // E.SUN's branch, with its steps and planters (EsunBank.tsx)
    { x: -26, z: 7, w: 9.2, d: 7.6 }, // the data centre (DataCentre.tsx)
    { x: -20.1, z: 11.4, w: 0.8, d: 0.8 }, // and its wind turbine
    { x: -16, z: 41.75, w: 14, d: 9.5 }, // Club Velvet (ClubVelvet.tsx)
    { x: 2.5, z: 41.75, w: 11, d: 6.5 }, // Seoul Garden (Restaurants.tsx)
    { x: 4.8, z: 45.6, w: 4.3, d: 0.55 }, // its bench
    { x: -0.3, z: 45.9, w: 1.1, d: 0.8 }, // and its popcorn cart
    { x: 13.5, z: 41.75, w: 7.8, d: 6.5 }, // D.W. Steakhouse (Restaurants.tsx)
    { x: -16, z: 47, w: 1.1, d: 0.9 }, // Gus, at the rope
    { x: -17.1, z: 47.8, w: 0.3, d: 0.3 }, // the rope's two posts
    { x: -14.9, z: 47.8, w: 0.3, d: 0.3 },
    { x: -24.1, z: 43.5, w: 1.2, d: 2 }, // the dumpster, and the cat on it
    ...[-24.2, -22.9, -21.6, -20.3, -19].map((x) => ({ x, z: 48.8, w: 0.7, d: 0.6 })), // the queue, at its start
    { x: 4.5, z: -10.6, w: 2.6, d: 0.6 }, // volunteer noticeboard
    { x: -33, z: -31.4, w: 1.9, d: 1.1 }, // the ferry terminal's fin (FerryTerminal.tsx)
    ...[-30.3, -23.7].flatMap((x) => [-30.2, -32.6].map((z) => ({ x, z, w: 0.3, d: 0.3 }))), // its roof posts
    { x: -27, z: -31.8, w: 2.5, d: 0.6 }, // and the bench
    { x: 3.5, z: 13.2, w: 1, d: 1 }, // arcade cabinet
    { x: 0, z: 7, w: 11.8, d: 8.4 }, // Skyveil's museum and theatre (SkyveilMuseum.tsx)
    { x: -4.1, z: 12.6, w: 1.2, d: 1 }, // its two archery targets
    { x: -2.1, z: 13.3, w: 1.2, d: 1 },
    { x: -25, z: 24.5, w: 2, d: 2 }, // ParkEase plinth
    { x: -20, z: 24.5, w: 2, d: 2 }, // JourneyMate plinth
    { x: -36, z: 43, w: 4.4, d: 0.6 }, // exit noticeboard, on the block's south-west corner
    // South Bank and the riverside (27 Nov 2026; SouthBank.tsx, Riverside.tsx). The sand is walkable; the lagoon isn't.
    { x: -6, z: 68.5, w: 22.4, d: 10.4 }, // Streets Beach's lagoon
    { x: 25.3, z: 75, w: 19, d: 1 }, // the BRISBANE letters
    { x: -30.4, z: 65.4, w: 3.6, d: 3.6 }, // the Wheel's feet, east pair
    { x: -39.6, z: 74.6, w: 3.6, d: 3.6 }, // and west pair
    { x: -28.5, z: 75.5, w: 2.6, d: 1.8 }, // its ticket booth
    { x: 41, z: -21.9, w: 4.6, d: 2.2 }, // the Story Bridge's Brisbane abutment
    { x: 41.5, z: -13.8, w: 10.8, d: 10.8 }, // The Star
    { x: 0, z: 23.5, w: 12.4, d: 8 }, // the gallery (Landmarks.tsx)
    { x: -4.6, z: 29.1, w: 1.7, d: 1.7 }, // its sculpture
    { x: 10.4, z: -10.7, w: 0.8, d: 0.8 }, // UQ flagpoles: Aboriginal
    { x: 7.4, z: -10.7, w: 0.8, d: 0.8 }, // and Australian
    { x: -11.65, z: -17, w: 0.9, d: 0.9 }, // jacaranda trunks
    { x: 13.47, z: -19.5, w: 0.9, d: 0.9 },
    { x: 15.6, z: -12, w: 0.4, d: 10.2 }, // tennis fence, and its return
    { x: 17.3, z: -17, w: 3.6, d: 0.4 },
    { x: 34, z: 31.2, w: 9.8, d: 8.8 }, // BrisPulse's control centre (ControlCentre.tsx)
    { x: 32.2, z: 36.6, w: 0.7, d: 0.5 }, // and its information pillar
    { x: -14, z: -9.3, w: 3.2, d: 1.2 }, // bus stop, eastbound (Transit.tsx)
    { x: -20, z: 1.3, w: 3.2, d: 1.2 }, // bus stop, westbound
    { x: 6, z: 46.7, w: 3.2, d: 1.2 }, // bus stop on the night street, eastbound
    { x: 16, z: 57.3, w: 3.2, d: 1.2 }, // and westbound
];
