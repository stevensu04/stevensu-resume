/**
 * Movement input shared by the keyboard and touch (WORLD.md §10: arrows and WASD move). The key map
 * is DECO7381 Team 41's, from `JourneyController.tsx`, reused with permission. The touch joystick
 * (WORLD2.md Phase 3) writes the analog stick: x to the right, y forward, each −1…1.
 */
export type KeyControl = "forward" | "backward" | "left" | "right" | "run";
export type MovementInput = Record<KeyControl, boolean> & { stickX: number; stickY: number };

export const EMPTY_INPUT: MovementInput = { forward: false, backward: false, left: false, right: false, run: false, stickX: 0, stickY: 0 };

export const KEY_MAP: Record<string, KeyControl> = {
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

/** Ground speeds, m/s (§3: an easy 2.2 m/s walk). Shared by the controller, the tour and the avatar. */
export const WALK_SPEED = 2.2;
export const RUN_SPEED = 4.4;
/** A tap further away than this, he runs rather than walks (Player and the tour timer share it). */
export const RUN_DISTANCE = 8;
