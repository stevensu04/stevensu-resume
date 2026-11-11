"use client";

import { useMemo } from "react";
import { BoxGeometry, CylinderGeometry, MeshBasicMaterial, type BufferGeometry } from "three";
import { mergeParts, paint } from "./shading";

/**
 * Taipei 101, the tallest thing on Taipei's bank (WORLD.md §3). Box-level, like every hand-made
 * prop: a podium, a base that narrows as it rises, the eight flared "bamboo" sections, a crown and
 * the spire. About 28 m to the tip, roughly twice the towers round it, which keeps the real
 * building's proportion to its neighbours and makes it readable from across the river.
 *
 * A landmark, not a brand: §4 rule 4 keeps employers' and institutions' marks out of the world; a
 * city's skyline implies no endorsement. Tinted towards the sky like the rest of the far bank.
 */
const HAZE = "#c6d0e0";

/** A square frustum (the cylinder's four sides turned to face the axes), widths in metres. */
function frustum(bottom: number, top: number, height: number, y: number): BufferGeometry {
    // A 4-sided cylinder of radius r is a square of side r·√2.
    const geo = new CylinderGeometry(top / Math.SQRT2, bottom / Math.SQRT2, height, 4, 1);
    geo.rotateY(Math.PI / 4);
    geo.translate(0, y + height / 2, 0);
    return paint(geo, HAZE);
}

function taipei101(): BufferGeometry {
    const parts: BufferGeometry[] = [paint(new BoxGeometry(6.4, 2.4, 6.4).translate(0, 1.2, 0), HAZE)];
    // The base narrows upwards, then eight sections each flare outwards, like stacked bamboo.
    parts.push(frustum(4.8, 4.0, 5, 2.4));
    const sectionH = 1.8;
    for (let i = 0; i < 8; i++) parts.push(frustum(3.3, 4.2, sectionH, 7.4 + i * sectionH));
    const crown = 7.4 + 8 * sectionH;
    parts.push(frustum(2.8, 2.2, 1.1, crown));
    parts.push(frustum(2.0, 1.4, 0.9, crown + 1.1));
    parts.push(paint(new CylinderGeometry(0.1, 0.16, 4.2, 6).translate(0, crown + 2 + 2.1, 0), HAZE));
    return mergeParts(parts);
}

export default function Taipei101({ x, z }: { x: number; z: number }) {
    const geo = useMemo(() => taipei101(), []);
    const mat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.82 }), []);
    return <mesh geometry={geo} material={mat} position={[x, 0, z]} raycast={() => null} />;
}
