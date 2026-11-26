"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CylinderGeometry, MeshLambertMaterial, type BufferGeometry, type Group } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 6 · Eco Router's building (WORLD.md §3): a data centre, in place of the Kenney shed, because Eco
 * Router is about where a datacentre's power comes from. Modelled on the photograph Steven chose
 * on 26 Nov 2026: three long, dark, windowless-looking halls stepping down towards the viewer, pale
 * metal roofs, a glazed office along the front, a white path to the door across a lawn and a wind
 * farm on the horizon, here one turbine.
 *
 * It's shipped (v0.1 on npm), so it's a whole building with its door open and lit (§4). The turbine
 * turns slowly, and stops under prefers-reduced-motion.
 *
 * Draw calls: one merged static mesh, the turbine's mast and its rotor.
 */

/** Footprint of the three halls, metres. Fronts face +z, towards the default camera. */
export const DATA_CENTRE = { x0: -30.6, x1: -21.4, z0: 3.2, z1: 10.8 };
/** The wind turbine on the lawn's far side. */
export const TURBINE = { x: -20.1, z: 11.4, hub: 8.4 };

const C = {
    wall: "#3c424e",
    wallDark: "#2f343e",
    roof: "#aeb7c4",
    roofLine: "#8d96a3",
    glass: "#2f5b7a",
    glassLight: "#8fc3df",
    door: "#f2d98a",
    path: "#f1efe9",
    lawn: "#6fae6b",
    unit: "#7c8594",
    mast: "#eef0f2",
    blade: "#f4f5f6",
    hub: "#c9ced6",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** One hall: dark walls, a pale roof with a raised edge and standing-seam lines running along it. */
function hall(x0: number, x1: number, z0: number, z1: number, h: number): BufferGeometry[] {
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const out = [
        box(w, h, d, cx, h / 2, cz, C.wall),
        box(w + 0.2, 0.22, d + 0.2, cx, h + 0.11, cz, C.roofLine),
        box(w - 0.1, 0.1, d - 0.1, cx, h + 0.27, cz, C.roof),
    ];
    for (let z = z0 + 0.5; z < z1 - 0.2; z += 0.55) out.push(box(w - 0.3, 0.03, 0.04, cx, h + 0.34, z, C.roofLine));
    // Louvres: a band of darker slats high on the front, where the air comes in.
    for (let x = x0 + 0.6; x < x1 - 0.4; x += 0.6) out.push(box(0.32, 0.5, 0.04, x, h - 0.6, z1 + 0.02, C.wallDark));
    return out;
}

function parts(): BufferGeometry[] {
    const { x0, x1, z0, z1 } = DATA_CENTRE;
    const out: BufferGeometry[] = [
        // Three halls, each lower and shorter than the one behind, as in the photograph.
        ...hall(x0, x1, z0, 5.7, 4.6),
        ...hall(x0, x1 - 1, 5.7, 8.2, 3.9),
        ...hall(x0, x1 - 2, 8.2, z1, 3.2),
    ];
    // The glazed office along the front hall: a dark glass band in a pale frame, and an open lit door.
    const fx1 = x1 - 2;
    // The glass, its mullions and its canopy end 0.4 m short of the door, and the door stands 0.1 m
    // proud of the glass: coplanar fronts that overlapped here flickered when the camera zoomed out.
    const doorX = fx1 - 0.85;
    const glassEnd = doorX - 0.55 - 0.4;
    const glassW = glassEnd - (x0 + 0.5);
    const glassC = (x0 + 0.5 + glassEnd) / 2;
    out.push(box(glassW, 1.7, 0.1, glassC, 1.5, z1 + 0.05, C.glass));
    for (let x = x0 + 1.2; x < glassEnd - 0.3; x += 1.3) out.push(box(0.07, 1.7, 0.14, x, 1.5, z1 + 0.07, C.roofLine));
    out.push(box(glassW + 0.1, 0.1, 0.24, glassC, 2.4, z1 + 0.12, C.roof));
    out.push(box(1.1, 2.3, 0.2, doorX, 1.15, z1 + 0.1, C.door));
    out.push(box(1.5, 0.12, 0.34, doorX, 2.4, z1 + 0.17, C.roof));
    // Cooling units on the middle roof.
    for (const x of [-28.6, -27, -25.4]) out.push(box(1.0, 0.6, 1.0, x, 3.9 + 0.65, 6.95, C.unit));
    // The lawn and the white path from the door out to the street.
    out.push(box(11.4, 0.05, 2.6, -25.3, 0.025, 12.1, C.lawn));
    out.push(box(1.2, 0.07, 3.0, fx1 - 0.85, 0.04, 12.3, C.path));
    // The turbine's base.
    out.push(box(0.8, 0.2, 0.8, TURBINE.x, 0.1, TURBINE.z, C.unit));
    return out;
}

/** A tapered mast, the nacelle and the hub, as one geometry. */
function mast(): BufferGeometry {
    const { x, z, hub } = TURBINE;
    return mergeParts([
        paint(new CylinderGeometry(0.09, 0.2, hub, 10).translate(x, hub / 2 + 0.1, z), C.mast),
        box(0.34, 0.34, 0.9, x, hub + 0.1, z - 0.2, C.mast),
        paint(new CylinderGeometry(0.2, 0.2, 0.3, 10).rotateX(Math.PI / 2).translate(x, hub + 0.1, z + 0.35), C.hub),
    ]);
}

/** Three blades, at 0°, 120° and 240°, in the rotor's own space (the hub at the origin, facing +z). */
function rotor(): BufferGeometry {
    const blades = [0, 1, 2].map((i) => {
        const blade = paint(new BoxGeometry(0.16, 3.4, 0.05).translate(0, 1.8, 0), C.blade);
        return blade.rotateZ((i * Math.PI * 2) / 3);
    });
    return mergeParts(blades);
}

export default function DataCentre({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts(parts()), []);
    const mastGeo = useMemo(() => mast(), []);
    const rotorGeo = useMemo(() => rotor(), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const spin = useRef<Group>(null);

    useFrame((state) => {
        if (spin.current) spin.current.rotation.z = still ? 0.5 : -state.clock.elapsedTime * 0.7;
    });

    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <mesh geometry={mastGeo} material={material} raycast={() => null} />
            <group ref={spin} userData={{ dynamic: true }} position={[TURBINE.x, TURBINE.hub + 0.1, TURBINE.z + 0.55]}>
                <mesh geometry={rotorGeo} material={material} raycast={() => null} />
            </group>
        </>
    );
}
