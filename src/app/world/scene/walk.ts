import { PIER } from "../placements";
import { WALKABLE } from "../zones";
import type { Rect } from "./KitInstances";

/**
 * Where Steven may stand (WORLD.md §9: a kinematic controller, no physics engine). The ground is
 * the main rectangle plus the pier; solids are building and prop footprints, grown by his radius.
 */
const RADIUS = 0.45;

const AREAS: Rect[] = [
    WALKABLE,
    { minX: PIER.x - PIER.w / 2 + 0.3, maxX: PIER.x + PIER.w / 2 - 0.3, minZ: PIER.minZ + 0.3, maxZ: WALKABLE.minZ + 0.01 },
];

const inside = (r: Rect, x: number, z: number, grow = 0) =>
    x >= r.minX - grow && x <= r.maxX + grow && z >= r.minZ - grow && z <= r.maxZ + grow;

export function canStand(x: number, z: number, solids: Rect[]): boolean {
    return AREAS.some((a) => inside(a, x, z)) && !solids.some((s) => inside(s, x, z, RADIUS));
}

/** The nearest point on the walkable ground (ignoring solids: walking stops at them instead). */
export function clampToGround(x: number, z: number): [number, number] {
    let best: [number, number] = [x, z];
    let bestD = Infinity;
    for (const a of AREAS) {
        const cx = Math.min(Math.max(x, a.minX), a.maxX);
        const cz = Math.min(Math.max(z, a.minZ), a.maxZ);
        const d = (cx - x) ** 2 + (cz - z) ** 2;
        if (d < bestD) [best, bestD] = [[cx, cz], d];
    }
    return best;
}
