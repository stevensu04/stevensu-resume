"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { PLACEMENTS, PROP_SOLIDS, SKYLINE, TAIPEI_101 } from "../placements";
import Taipei101 from "./Taipei101";
import Landmarks from "./Landmarks";
import Formosa from "./Formosa";
import ClubVelvet from "./ClubVelvet";
import ControlCentre from "./ControlCentre";
import SkyveilMuseum from "./SkyveilMuseum";
import FerryTerminal from "./FerryTerminal";
import { DwSteakhouse, SeoulGarden } from "./Restaurants";
import DataCentre from "./DataCentre";
import GovTower from "./GovTower";
import GreatCourt from "./GreatCourt";
import Roads from "./Roads";
import Island from "./Island";
import Ground from "./Ground";
import Vegetation, { blockVegetation, scatterVegetation } from "./Vegetation";
import { OBJECTS, type WorldObject } from "../objects";
import { InstancedMesh, Matrix4, MeshBasicMaterial, PlaneGeometry, type Group } from "three";
import KitInstances, { placementTransform } from "./KitInstances";
import { buildNav, type Nav } from "./nav";
import Props, { PALETTE } from "./Props";
import { useKit } from "./useKit";
import { useStaticShadows } from "./Lighting";
import { LOOK } from "./look";
import { useStaticBatch } from "./batch";

// The skyline is haze across the water: pale by day, blue by night (Phase 4).
const SKY_TINT = { color: LOOK.skyline, opacity: 0.7 };
const SKY_TINT_NIGHT = { color: LOOK.night.skyline, opacity: 0.7 };

/**
 * The block (WORLD.md §3, §6): the slab, the Kenney kit, the hand-made props and an invisible hit
 * area per tappable object (objects.ts). Scenery never takes part in picking; only the ground and the objects do.
 */
export default function Stage({
    skyline,
    night = false,
    still,
    navRef,
    onGround,
    onObject,
    onHover,
}: {
    /** Draw Taipei across the river. Off when the camera looks from the river side (see Scene). */
    skyline: boolean;
    /** Night: the skyline's haze turns blue. */
    night?: boolean;
    still: boolean;
    /** Filled here once the kit has loaded, read by Player: where Steven can walk. */
    navRef: RefObject<Nav | null>;
    onGround: (x: number, z: number) => void;
    onObject: (object: WorldObject) => void;
    onHover: (object: WorldObject | null) => void;
}) {
    const kit = useKit();
    // The block is static: its shadows are baked once, and again when the skyline shows or hides.
    const root = useRef<Group>(null);
    // Static batching first (it decides which meshes are drawn), then the shadow flags.
    useStaticBatch(root, kit);
    useStaticShadows(root, skyline);

    // `?nav` (development only) draws the blocked cells, to check the grid against the models.
    const [showNav] = useState(() => process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).has("nav"));

    // The walk grid comes from the solid models' own triangles (nav.ts), so it always matches what
    // you see: no invisible walls round an L-shaped fence or a tree's canopy. The vegetation is
    // scattered onto the open cells, then its trunks and bushes join the grid as solids.
    const { nav, vegetation } = useMemo(() => {
        const solids = PLACEMENTS.filter((p) => p.solid).flatMap((p) => {
            const model = kit.get(p.model)!;
            const { matrix } = placementTransform(p, model);
            return model.parts.map((part) => ({ geometry: part.geometry, matrix: new Matrix4().multiplyMatrices(matrix, part.matrix) }));
        });
        const rects = PROP_SOLIDS.map(({ x, z, w, d }) => ({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }));
        const grid = buildNav(solids, rects);
        const set = scatterVegetation(grid);
        blockVegetation(grid, set);
        return { nav: grid, vegetation: set };
    }, [kit]);
    useEffect(() => {
        navRef.current = nav;
    }, [nav, navRef]);

    return (
        <group ref={root}>
            <Island still={still} onGround={onGround} />
            <Ground />
            <Vegetation set={vegetation} still={still} />
            <KitInstances kit={kit} placements={PLACEMENTS} />
            {showNav && <NavCells nav={nav} />}
            {skyline && <KitInstances kit={kit} placements={SKYLINE} tint={night ? SKY_TINT_NIGHT : SKY_TINT} />}
            {skyline && <Taipei101 x={TAIPEI_101.x} z={TAIPEI_101.z} />}
            <Props still={still} />
            <Landmarks still={still} />
            <Formosa still={still} />
            <ClubVelvet still={still} />
            <Roads />
            <GreatCourt />
            <GovTower />
            <DataCentre still={still} />
            <ControlCentre still={still} />
            <SkyveilMuseum still={still} />
            <FerryTerminal />
            <SeoulGarden />
            <DwSteakhouse />

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
                    // A press that turned into a drag was an orbit, not a click (Global view).
                    if (e.delta > 6) return;
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
