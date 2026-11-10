"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { PLACEMENTS, PROP_SOLIDS, SKYLINE } from "../placements";
import { RIVER, SLAB } from "../zones";
import { OBJECTS, type WorldObject } from "../objects";
import KitInstances, { placementTransform, type Rect } from "./KitInstances";
import Props, { PALETTE } from "./Props";
import { shadedBox } from "./shading";
import { useKit } from "./useKit";

const SKY_TINT = { color: "#d3dceb", opacity: 0.7 };
const RIVERBED = -0.8;

/**
 * The block (WORLD.md §3, §6): the slab, the Kenney kit, the hand-made props and an invisible hit
 * area per tappable object (objects.ts). Scenery never takes part in picking; only the ground and the objects do.
 */
export default function Stage({
    skyline,
    still,
    solidsRef,
    onGround,
    onObject,
    onHover,
}: {
    /** Draw Taipei across the river. Off when the camera looks from the river side (see Scene). */
    skyline: boolean;
    still: boolean;
    /** Filled here, read by Player: footprints Steven walks round. */
    solidsRef: RefObject<Rect[]>;
    onGround: (x: number, z: number) => void;
    onObject: (object: WorldObject) => void;
    onHover: (object: WorldObject | null) => void;
}) {
    const kit = useKit();

    // Solid footprints come from the kit's own bounding boxes, so they always match the models.
    useEffect(() => {
        solidsRef.current = [
            ...PLACEMENTS.filter((p) => p.solid).map((p) => placementTransform(p, kit.get(p.model)!).footprint),
            ...PROP_SOLIDS.map(({ x, z, w, d }) => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 })),
        ];
    }, [kit, solidsRef]);

    const width = SLAB.maxX - SLAB.minX;
    const landD = SLAB.maxZ - RIVER.maxZ;
    const bedD = RIVER.maxZ - RIVER.minZ;
    const land = useMemo(() => shadedBox(width, 2, landD), [width, landD]);
    const bed = useMemo(() => shadedBox(width, 2 + RIVERBED, bedD), [width, bedD]);

    const walk = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onGround(e.point.x, e.point.z);
    };

    return (
        <group>
            {/* The slab: land at y = 0, the riverbed lower so the water sits below the bank. */}
            <mesh geometry={land} position={[0, -1, (RIVER.maxZ + SLAB.maxZ) / 2]} onClick={walk}>
                <meshBasicMaterial vertexColors color="#d9d4c7" />
            </mesh>
            <mesh geometry={bed} position={[0, -1 + RIVERBED / 2, (RIVER.minZ + RIVER.maxZ) / 2]} onClick={walk}>
                <meshBasicMaterial vertexColors color="#8d8a80" />
            </mesh>

            <KitInstances kit={kit} placements={PLACEMENTS} />
            {skyline && <KitInstances kit={kit} placements={SKYLINE} tint={SKY_TINT} />}
            <Props still={still} />

            {OBJECTS.map((object) => (
                <ObjectHit key={object.id} object={object} onObject={onObject} onHover={onHover} />
            ))}
        </group>
    );
}

/** An invisible box over the object that catches taps, and a soft accent patch under it on hover. */
function ObjectHit({
    object,
    onObject,
    onHover,
}: {
    object: WorldObject;
    onObject: (o: WorldObject) => void;
    onHover: (o: WorldObject | null) => void;
}) {
    const [hovered, setHovered] = useState(false);
    return (
        <group position={[object.x, 0, object.z]}>
            <mesh
                position={[0, object.h / 2, 0]}
                visible={false}
                onClick={(e) => {
                    e.stopPropagation();
                    onObject(object);
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    setHovered(true);
                    onHover(object);
                    document.body.style.cursor = "pointer";
                }}
                onPointerOut={() => {
                    setHovered(false);
                    onHover(null);
                    document.body.style.cursor = "";
                }}
            >
                <boxGeometry args={[object.w, object.h, object.d]} />
            </mesh>
            {hovered && (
                <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2} raycast={() => null}>
                    <planeGeometry args={[object.w + 0.6, object.d + 0.6]} />
                    <meshBasicMaterial color={PALETTE.accent} transparent opacity={0.18} depthWrite={false} />
                </mesh>
            )}
        </group>
    );
}
