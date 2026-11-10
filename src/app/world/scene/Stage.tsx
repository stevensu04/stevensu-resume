"use client";

import { useMemo, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { RIVER, SLAB, ZONES, type Zone } from "../zones";
import { ACCENT, shadedBox } from "./shading";

/**
 * Everything that stands still: the slab, the river, the Taipei skyline across it, and one grey
 * block per zone. M2 swaps the blocks for Kenney models; the click contract stays the same.
 */
export default function Stage({
    skyline,
    onGround,
    onZone,
    onHover,
}: {
    /** Draw Taipei across the river. Off when the camera looks from the river side (see Scene). */
    skyline: boolean;
    onGround: (x: number, z: number) => void;
    onZone: (zone: Zone) => void;
    onHover: (zone: Zone | null) => void;
}) {
    const slabW = SLAB.maxX - SLAB.minX;
    const slabD = SLAB.maxZ - SLAB.minZ;
    const slab = useMemo(() => shadedBox(slabW, 2, slabD), [slabW, slabD]);
    const riverD = RIVER.maxZ - RIVER.minZ;

    const walk = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onGround(e.point.x, e.point.z);
    };

    return (
        <group>
            {/* The slab: the diorama's tabletop. Clicks anywhere on it walk. */}
            <mesh geometry={slab} position={[0, -1, 0]} onClick={walk}>
                <meshBasicMaterial vertexColors color="#d6d3c4" />
            </mesh>
            {/* The Brisbane River. Clicking it walks to the nearest bank (the target is clamped). */}
            <mesh position={[0, 0.02, (RIVER.minZ + RIVER.maxZ) / 2]} rotation-x={-Math.PI / 2} onClick={walk}>
                <planeGeometry args={[slabW, riverD]} />
                <meshBasicMaterial color="#7cc4e4" />
            </mesh>
            {skyline && <TaipeiSkyline />}
            {ZONES.map((zone) => (
                <ZoneBlock key={zone.id} zone={zone} onZone={onZone} onHover={onHover} />
            ))}
        </group>
    );
}

function ZoneBlock({ zone, onZone, onHover }: { zone: Zone; onZone: (z: Zone) => void; onHover: (z: Zone | null) => void }) {
    const [hovered, setHovered] = useState(false);
    const geo = useMemo(() => shadedBox(zone.w, zone.h, zone.d), [zone.w, zone.h, zone.d]);
    return (
        <mesh
            geometry={geo}
            position={[zone.x, zone.h / 2, zone.z]}
            onClick={(e) => {
                e.stopPropagation();
                onZone(zone);
            }}
            onPointerOver={(e) => {
                e.stopPropagation();
                setHovered(true);
                onHover(zone);
                document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
                setHovered(false);
                onHover(null);
                document.body.style.cursor = "";
            }}
        >
            <meshBasicMaterial vertexColors color={hovered ? ACCENT : zone.number === null ? "#c9ccd3" : "#b8bcc6"} />
        </mesh>
    );
}

/**
 * Backdrop only (§3: "visible, not walkable"), so it never takes part in picking. Fixed heights,
 * not random ones: the scene renders the same every time, and a screenshot is reproducible.
 */
const SKYLINE: [number, number, number][] = [
    [-34, 9, 4], [-27, 14, 5], [-20, 7, 4], [-12, 18, 5], [-5, 11, 4],
    [3, 34, 6], // the tall one: Taipei 101 stand-in, generic on purpose (§4 rule 4)
    [11, 13, 5], [18, 8, 4], [25, 16, 5], [32, 10, 4],
];

function TaipeiSkyline() {
    const geos = useMemo(() => SKYLINE.map(([, h, w]) => shadedBox(w, h, w)), []);
    return (
        <group position={[0, 0, SLAB.minZ - 14]}>
            {SKYLINE.map(([x, h], i) => (
                <mesh key={x} geometry={geos[i]} position={[x, h / 2 - 2, 0]} raycast={() => null}>
                    <meshBasicMaterial vertexColors color="#a9b4c8" transparent opacity={0.75} />
                </mesh>
            ))}
        </group>
    );
}
