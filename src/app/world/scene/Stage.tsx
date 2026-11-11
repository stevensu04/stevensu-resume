"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { PLACEMENTS, PROP_SOLIDS, SKYLINE, TAIPEI_101 } from "../placements";
import Taipei101 from "./Taipei101";
import { FAR_BANK, RIVER, SLAB } from "../zones";
import { OBJECTS, type WorldObject } from "../objects";
import { InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry } from "three";
import KitInstances, { placementTransform } from "./KitInstances";
import { buildNav, type Nav } from "./nav";
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
    navRef,
    onGround,
    onObject,
    onHover,
}: {
    /** Draw Taipei across the river. Off when the camera looks from the river side (see Scene). */
    skyline: boolean;
    still: boolean;
    /** Filled here once the kit has loaded, read by Player: where Steven can walk. */
    navRef: RefObject<Nav | null>;
    onGround: (x: number, z: number) => void;
    onObject: (object: WorldObject) => void;
    onHover: (object: WorldObject | null) => void;
}) {
    const kit = useKit();

    // `?nav` (development only) draws the blocked cells, to check the grid against the models.
    const [showNav] = useState(() => process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).has("nav"));
    const [navView, setNavView] = useState<Nav | null>(null);

    // The walk grid comes from the solid models' own triangles (nav.ts), so it always matches what
    // you see: no invisible walls round an L-shaped fence or a tree's canopy.
    useEffect(() => {
        const solids = PLACEMENTS.filter((p) => p.solid).flatMap((p) => {
            const model = kit.get(p.model)!;
            const { matrix } = placementTransform(p, model);
            return model.parts.map((part) => ({ geometry: part.geometry, matrix: new Matrix4().multiplyMatrices(matrix, part.matrix) }));
        });
        const rects = PROP_SOLIDS.map(({ x, z, w, d }) => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }));
        navRef.current = buildNav(solids, rects);
        if (showNav) setNavView(navRef.current);
    }, [kit, navRef, showNav]);

    const width = SLAB.maxX - SLAB.minX;
    const landD = SLAB.maxZ - RIVER.maxZ;
    const bedD = RIVER.maxZ - RIVER.minZ;
    const land = useMemo(() => shadedBox(width, 2, landD), [width, landD]);
    const bed = useMemo(() => shadedBox(width, 2 + RIVERBED, bedD), [width, bedD]);
    const farD = FAR_BANK.maxZ - FAR_BANK.minZ;
    const far = useMemo(() => shadedBox(width, 2, farD), [width, farD]);

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
            {navView && <NavCells nav={navView} />}
            {/* Taipei's bank: the same tabletop, a shade cooler, so the far side reads as elsewhere. */}
            <mesh geometry={far} position={[0, -1, (FAR_BANK.minZ + FAR_BANK.maxZ) / 2]} raycast={() => null}>
                <meshBasicMaterial vertexColors color="#cfd6d9" />
            </mesh>
            {skyline && <KitInstances kit={kit} placements={SKYLINE} tint={SKY_TINT} />}
            {skyline && <Taipei101 x={TAIPEI_101.x} z={TAIPEI_101.z} />}
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

/** Development aid: every blocked walk cell as a red tile, a hair above the ground. */
function NavCells({ nav }: { nav: Nav }) {
    const mesh = useMemo(() => {
        const cells: [number, number][] = [];
        for (let j = 0; j < nav.rows; j++)
            for (let i = 0; i < nav.cols; i++) if (nav.blocked[j * nav.cols + i]) cells.push([nav.minX + (i + 0.5) * 0.5, nav.minZ + (j + 0.5) * 0.5]);
        const m = new InstancedMesh(new PlaneGeometry(0.44, 0.44).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: "#ef4444", transparent: true, opacity: 0.45, depthWrite: false }), cells.length);
        cells.forEach(([x, z], k) => m.setMatrixAt(k, new Matrix4().makeTranslation(x, 0.08, z)));
        m.raycast = () => {};
        return m;
    }, [nav]);
    return <primitive object={mesh} />;
}
