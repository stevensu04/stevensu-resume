"use client";

import { useMemo } from "react";
import { BoxGeometry, MeshBasicMaterial, type BufferGeometry } from "three";
import { RING } from "../zones";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * The four corners of the ring road (added 26 Nov 2026), where the two streets meet the two
 * connectors at the slab's margins. Kenney's road kit has only a straight tile and a crossing, so
 * the bends are hand-made, as flat boxes in the kit's own measurements and colours.
 *
 * A straight tile is 8 m wide and 0.16 m tall: asphalt ±2.4 m with a thin pale centre line, a darker
 * gutter from 2.4 to 3.2 m, and a footpath from 3.2 to 4 m standing 0.08 m above the road. Those
 * numbers (and the colours below) were read from the tile in public/world/kit.glb, so a corner
 * lines up with the straight tiles on either side of it.
 *
 * A corner is drawn once, for a bend that exits east and south, and mirrored for the other three.
 * The outer sides keep the gutter and footpath; the inside corner is left as asphalt so a bus can
 * turn without climbing a kerb.
 *
 * Draw calls: one merged mesh for all four corners.
 */

const C = {
    base: "#a7afd2",
    asphalt: "#666b80",
    gutter: "#515566",
    footpath: "#b3bbe0",
    line: "#8e95b3",
};

const slab = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** One corner, centred on (cx, cz), exits towards sx (+1 east, −1 west) and sz (+1 south, −1 north). */
function corner(cx: number, cz: number, sx: 1 | -1, sz: 1 | -1): BufferGeometry[] {
    // Pieces are written for sx = sz = +1 as [centre x, centre z, width, depth], then mirrored.
    const at = (x: number, z: number, w: number, d: number, y: number, h: number, color: string) => slab(w, h, d, cx + sx * x, y, cz + sz * z, color);
    return [
        // The base slab the road surface sits on, as a straight tile's side faces show it.
        at(0, 0, 8, 8, 0.03, 0.06, C.base),
        // Asphalt: the east arm and the bottom of the south arm, ending in an open inside corner.
        at(0.8, 0, 6.4, 4.8, 0.07, 0.02, C.asphalt),
        at(0.8, 3.2, 6.4, 1.6, 0.07, 0.02, C.asphalt),
        // The gutter round the outer (north and west) sides.
        at(0.4, -2.8, 7.2, 0.8, 0.07, 0.02, C.gutter),
        at(-2.8, 0.8, 0.8, 6.4, 0.07, 0.02, C.gutter),
        // The footpath beyond it, standing 0.08 m above the road.
        at(0, -3.6, 8, 0.8, 0.08, 0.16, C.footpath),
        at(-3.6, 0.4, 0.8, 7.2, 0.08, 0.16, C.footpath),
        // The centre line of each arm, as far as the middle of the bend.
        at(2, 0, 4, 0.08, 0.085, 0.01, C.line),
        at(0, 2, 0.08, 4, 0.085, 0.01, C.line),
    ];
}

export default function Roads() {
    const geometry = useMemo(
        () =>
            mergeParts([
                ...corner(RING.west, RING.north, 1, 1),
                ...corner(RING.east, RING.north, -1, 1),
                ...corner(RING.west, RING.south, 1, -1),
                ...corner(RING.east, RING.south, -1, -1),
            ]),
        [],
    );
    const material = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    return <mesh geometry={geometry} material={material} raycast={() => null} />;
}
