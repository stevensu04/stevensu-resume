/**
 * Riding the Brisbane Metro (added 26 Nov 2026). Transit.tsx owns the buses and decides when Steven
 * is on one; Scene, CameraRig and Player only read this. No three.js here, so it is safe anywhere.
 *
 * The flow: walk up to a bus that is standing at its stop (an offer), press E to board, ride the
 * ring road with the camera inside, and press E again to get off at the stop (pulling the cord if the
 * bus is moving, as on a real one). Riding is an Explore thing: leaving for Global view or starting
 * the tour sets him down at the nearest stop.
 */

/** What the UI asks Transit to do. Written by Scene's handlers, consumed by Transit on its next frame. */
export type RideCommand = "board" | "alight" | "eject" | null;

/** Shared by Transit (writes), CameraRig and Player (read). A ref, never state: it changes every frame. */
export type RideState = {
    /** The bus Steven is on (an index into Transit's buses), or −1 on foot. */
    bus: number;
    /** The camera yaw that faces the way the bus is going, written each frame while riding. */
    heading: number;
    command: RideCommand;
};

export const NO_RIDE: RideState = { bus: -1, heading: 0, command: null };

/** What the HUD shows. Reported by Transit only when it changes, so it costs no per-frame render. */
export type RideInfo =
    /** A bus is standing at a stop within reach of Steven's door. */
    | { kind: "offer"; stop: string }
    /** On board. `here` is the stop the bus is standing at (doors open), `next` the one after. */
    | { kind: "riding"; here: string | null; next: string; requested: boolean };

/** The floor of the bus, metres: Steven's feet, so first person's eye rides at this + 1.6. */
export const BUS_FLOOR = 0.78;

/**
 * Where the buses' bodies are this frame, so Steven can't walk through one (27 Nov 2026). Transit
 * writes centres every metre along each bus that he isn't riding; Player reads them before a step.
 * Circles rather than boxes, so the articulated bus is followed round the bends.
 */
export const BUS_BODY = { xz: new Float32Array(2 * 128), count: 0 };
/** Half the bus's width plus Steven's own radius, metres. */
export const BUS_REACH = 1.55;

/** Is (x, z) inside a bus? */
export function insideBus(x: number, z: number): boolean {
    const { xz, count } = BUS_BODY;
    const r2 = BUS_REACH * BUS_REACH;
    for (let i = 0; i < count; i++) {
        const dx = x - xz[2 * i];
        const dz = z - xz[2 * i + 1];
        if (dx * dx + dz * dz < r2) return true;
    }
    return false;
}
