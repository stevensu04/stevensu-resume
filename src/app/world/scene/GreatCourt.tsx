"use client";

import { useMemo } from "react";
import { BoxGeometry, MeshBasicMaterial, type BufferGeometry } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 2 · The UQ corner's building (WORLD.md §3): the sandstone Forgan Smith Building on the Great
 * Court, in place of the Kenney office block. Modelled on the photograph Steven chose on 26 Nov
 * 2026: a tall central tower with a stepped crown, flanked by two lower wings, in layered tan
 * sandstone, with tall narrow windows set between pilasters and steps up to the entrance.
 *
 * The university crest (supplied by Steven, an alumnus; Landmarks.tsx) hangs on the tower's front.
 * The flags the photograph has on the roof are left off: the two out front already fly on the
 * ground (Landmarks.tsx), and a flag drawn badly is worse than none.
 *
 * Box-level and unlit like everything else here: one merged mesh, one draw call.
 */

/** Footprint, metres. The front faces +z, towards the default camera. Same plot as the Kenney block it replaced. */
export const GREAT_COURT = { x0: -6.4, x1: 10.4, z0: -22.95, z1: -12.08, towerH: 13.6 };
const TOWER = { x0: -1.6, x1: 5.6, h: GREAT_COURT.towerH };
const WING_H = 8.2;
const CENTRE = 2;

const C = {
    sand: "#dcc294",
    sandDark: "#c9a874",
    sandLight: "#ead9b2",
    plinth: "#b99b6d",
    slot: "#2f3846",
    door: "#2a2432",
    roof: "#7a6f60",
    step: "#d8d2c4",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

function parts(): BufferGeometry[] {
    const { x0, x1, z0, z1 } = GREAT_COURT;
    const depth = z1 - z0;
    const cz = (z0 + z1) / 2;
    const out: BufferGeometry[] = [];

    // The two wings, with a cornice, a darker plinth and a flat roof behind a parapet.
    for (const [a, b] of [
        [x0, TOWER.x0],
        [TOWER.x1, x1],
    ] as const) {
        const w = b - a;
        const cx = (a + b) / 2;
        out.push(box(w, WING_H, depth, cx, WING_H / 2, cz, C.sand));
        out.push(box(w + 0.2, 0.4, depth + 0.2, cx, WING_H + 0.2, cz, C.sandLight));
        out.push(box(w - 0.3, 0.2, depth - 0.3, cx, WING_H + 0.5, cz, C.roof));
        out.push(box(w + 0.04, 0.9, depth + 0.04, cx, 0.45, cz, C.plinth));
        // Sandstone courses on the front.
        for (let y = 1.7; y < WING_H - 0.4; y += 1.2) out.push(box(w + 0.02, 0.06, 0.04, cx, y, z1 + 0.02, C.sandDark));
        // Tall windows between pilasters: three along the front of a wing.
        for (let i = 0; i < 3; i++) {
            const wx = a + ((i + 0.5) * w) / 3;
            out.push(box(0.9, 4.8, 0.1, wx, 4.4, z1 + 0.04, C.slot));
            out.push(box(0.12, 4.8, 0.14, wx, 4.4, z1 + 0.06, C.sandLight)); // a mullion down the middle
            out.push(box(0.24, 6.4, 0.16, a + (i * w) / 3, 4.5, z1 + 0.06, C.sandLight)); // and the pilaster at its side
        }
    }
    // The right wing's long east face, which the camera sees: a row of tall windows along it.
    for (let z = z0 + 1.2; z < z1 - 0.6; z += 1.7) out.push(box(0.1, 4.8, 0.9, x1 + 0.04, 4.4, z, C.slot));
    for (let y = 1.7; y < WING_H - 0.4; y += 1.2) out.push(box(0.04, 0.06, depth, x1 + 0.02, y, cz, C.sandDark));

    // The tower: a plinth, the shaft, a cornice and a stepped crown.
    const tw = TOWER.x1 - TOWER.x0;
    out.push(box(tw, TOWER.h, depth, CENTRE, TOWER.h / 2, cz, C.sand));
    out.push(box(tw + 0.04, 1.1, depth + 0.04, CENTRE, 0.55, cz, C.plinth));
    out.push(box(tw + 0.5, 0.45, depth + 0.5, CENTRE, TOWER.h + 0.22, cz, C.sandLight));
    out.push(box(tw - 1.4, 1.2, depth - 1.4, CENTRE, TOWER.h + 1.05, cz, C.sand));
    out.push(box(tw - 1.1, 0.3, depth - 1.1, CENTRE, TOWER.h + 1.8, cz, C.sandLight));
    for (let y = 2.2; y < TOWER.h - 0.5; y += 1.2) {
        out.push(box(tw + 0.02, 0.06, 0.04, CENTRE, y, z1 + 0.02, C.sandDark));
        out.push(box(0.04, 0.06, depth, TOWER.x1 + 0.02, y, cz, C.sandDark));
    }
    // Four tall slots either side of the crest on the front, and a long run down the east face.
    for (const dx of [-2.9, -2.1, 2.1, 2.9]) out.push(box(0.4, 8.2, 0.1, CENTRE + dx, 8.2, z1 + 0.04, C.slot));
    for (let z = z0 + 1.6; z < z1 - 0.8; z += 1.5) out.push(box(0.1, 8.2, 0.4, TOWER.x1 + 0.04, 8.2, z, C.slot));
    // Corner buttresses, as the tower has, in the lighter stone.
    for (const x of [TOWER.x0 + 0.17, TOWER.x1 - 0.17]) out.push(box(0.34, TOWER.h, 0.34, x, TOWER.h / 2, z1 - 0.1, C.sandLight));

    // The doorway: a dark recess in a stone frame, and the steps up to it.
    out.push(box(2.2, 3.5, 0.12, CENTRE, 1.75, z1 + 0.05, C.door));
    out.push(box(2.8, 0.3, 0.2, CENTRE, 3.65, z1 + 0.08, C.sandLight));
    out.push(box(0.3, 3.7, 0.2, CENTRE - 1.25, 1.85, z1 + 0.08, C.sandLight));
    out.push(box(0.3, 3.7, 0.2, CENTRE + 1.25, 1.85, z1 + 0.08, C.sandLight));
    out.push(box(5.2, 0.16, 0.8, CENTRE, 0.08, z1 + 0.4, C.step));
    out.push(box(4.4, 0.32, 0.45, CENTRE, 0.16, z1 + 0.22, C.step));
    return out;
}

export default function GreatCourt() {
    const geometry = useMemo(() => mergeParts(parts()), []);
    const material = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    return <mesh geometry={geometry} material={material} raycast={() => null} />;
}
