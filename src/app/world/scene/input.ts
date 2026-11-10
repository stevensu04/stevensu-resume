/**
 * Movement input shared by the keyboard and the touch d-pad (WORLD.md §10: arrows and WASD move).
 * The key map is DECO7381 Team 41's, from `JourneyController.tsx`, reused with permission.
 */
export type MovementInput = { forward: boolean; backward: boolean; left: boolean; right: boolean; run: boolean };

export const EMPTY_INPUT: MovementInput = { forward: false, backward: false, left: false, right: false, run: false };

export const KEY_MAP: Record<string, keyof MovementInput> = {
    KeyW: "forward",
    ArrowUp: "forward",
    KeyS: "backward",
    ArrowDown: "backward",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
    ShiftLeft: "run",
    ShiftRight: "run",
};

/** What the avatar should be doing this frame; Player writes it, Avatar reads it. */
export type Motion = {
    state: "Idle" | "Walk" | "Run";
    /** Playback rate for the walk and run cycles, so the feet keep up when the tour hurries him. */
    pace: number;
};
