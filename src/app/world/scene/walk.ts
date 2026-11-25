import { TERMINAL } from "../placements";
import { WALKABLE } from "../zones";

/** A rectangle on the ground, metres. */
export type GroundRect = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * The ground Steven may stand on: the main rectangle plus the ferry terminal's gangway and pontoon. What stands on it, and the
 * routes round it, are nav.ts's job.
 */
export const AREAS: GroundRect[] = [
    WALKABLE,
    // The gangway, inside its trusses, from the bank out to the pontoon.
    { minX: TERMINAL.gangway.x - TERMINAL.gangway.w / 2 + 0.4, maxX: TERMINAL.gangway.x + TERMINAL.gangway.w / 2 - 0.4, minZ: TERMINAL.pontoon.maxZ - 0.5, maxZ: WALKABLE.minZ + 0.01 },
    // The pontoon's deck.
    { minX: TERMINAL.pontoon.minX + 0.4, maxX: TERMINAL.pontoon.maxX - 0.4, minZ: TERMINAL.pontoon.minZ + 0.4, maxZ: TERMINAL.pontoon.maxZ },
];

/** The nearest point on the ground, for a tap that lands in the river or off the slab. */
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
