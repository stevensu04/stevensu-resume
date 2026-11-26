"use client";

import { useEffect, useMemo } from "react";
import { BufferGeometry, Color, CylinderGeometry, IcosahedronGeometry, InstancedMesh, Matrix4, MeshLambertMaterial, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { OBJECTS } from "../objects";
import { RING, WALKABLE, ZONES } from "../zones";
import { distanceToPaths } from "./Ground";
import { BRISBANE_LAND, shorePoints } from "./Island";
import { blockDisc, canStandAt, type Nav } from "./nav";
import { withWorldShader } from "./worldShader";

/**
 * Trees, bushes, flower beds and shore rocks (WORLD2.md §3: "150–300 instanced round trees… trees
 * cluster into small parks between zones"). Procedural and seeded, so the same island every load.
 *
 * **Where things may grow** (`scatterVegetation`): on Brisbane's land, off the ring road and its
 * footpaths, clear of the paths, clear of every content zone (with a wider margin on the south and
 * east, the sides the default camera looks from, so no tree hides a facade), and where the walk
 * grid says the ground is open. A noise field groups the trees into groves with lawns between.
 * Outside the walkable rectangle a fringe of trees runs round the island's edge.
 *
 * **Walking:** trunks and bushes are added to the walk grid (`blockVegetation`), so Steven routes round
 * them rather than through them. Flowers are knee-high and stay walkable.
 *
 * Draw calls: three crown shapes, the trunks, bushes, flowers and rocks: seven in all.
 */
export type Plant = { x: number; z: number; scale: number; rot: number; tone: number };
export type VegetationSet = { trees: Plant[][]; bushes: Plant[]; flowers: Plant[]; rocks: Plant[] };

/** Small, fast, seeded: mulberry32. */
function random(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Groves: smooth noise over the block, roughly −1.5…1.5. */
function grove(x: number, z: number): number {
    return Math.sin(x * 0.13 + 1.7) * Math.cos(z * 0.11 + 0.3) + 0.5 * Math.sin(x * 0.29 - z * 0.23 + 2.1) + 0.35 * Math.sin(x * 0.07 + z * 0.17);
}

function sdRoundBox(x: number, z: number, o: typeof BRISBANE_LAND): number {
    const qx = Math.abs(x - o.cx) - (o.hw - o.r);
    const qz = Math.abs(z - o.cz) - (o.hd - o.r);
    return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - o.r;
}

const onRoad = (x: number, z: number, m: number) =>
    (Math.abs(z - RING.north) < 4 + m && Math.abs(x) < RING.east + 4 + m) ||
    (Math.abs(z - RING.south) < 4 + m && Math.abs(x) < RING.east + 4 + m) ||
    ((Math.abs(x - RING.west) < 4 + m || Math.abs(x - RING.east) < 4 + m) && z > RING.north - 4 - m && z < RING.south + 4 + m);

/** Zones keep clear, more so towards the camera (south and east) so facades stay in view. */
const inZone = (x: number, z: number, m: number) =>
    ZONES.some((r) => x > r.x - r.w / 2 - m && x < r.x + r.w / 2 + m + 1.5 && z > r.z - r.d / 2 - m && z < r.z + r.d / 2 + m + 3) ||
    OBJECTS.some((o) => Math.abs(x - o.x) < o.w / 2 + m + 1 && Math.abs(z - o.z) < o.d / 2 + m + 1);

const inWalkable = (x: number, z: number) => x > WALKABLE.minX && x < WALKABLE.maxX && z > WALKABLE.minZ && z < WALKABLE.maxZ;

/** Open ground in a disc of radius r (the walk grid has every solid already, grown for a body). */
function open(nav: Nav, x: number, z: number, r: number): boolean {
    if (!canStandAt(nav, x, z)) return false;
    for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        if (!canStandAt(nav, x + Math.cos(a) * r, z + Math.sin(a) * r)) return false;
    }
    return true;
}

export function scatterVegetation(nav: Nav): VegetationSet {
    const rnd = random(20261126);
    const trees: Plant[][] = [[], [], []];
    const bushes: Plant[] = [];
    const flowers: Plant[] = [];
    const rocks: Plant[] = [];
    const taken: [number, number, number][] = [];
    const clear = (x: number, z: number, r: number) => taken.every(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) > r + tr);

    const STEP = 2.4;
    for (let gz = WALKABLE.minZ - 2; gz < 64; gz += STEP)
        for (let gx = -52; gx < 52; gx += STEP) {
            const x = gx + (rnd() - 0.5) * STEP * 0.9;
            const z = gz + (rnd() - 0.5) * STEP * 0.9;
            const land = sdRoundBox(x, z, BRISBANE_LAND);
            if (land > -1.4) continue; // keep a grass lip at the shore
            const walkable = inWalkable(x, z);
            const roll = rnd();
            const g = grove(x, z);

            // Trees: in groves inside the block, as a fringe round the edge outside it.
            const fringe = !walkable && !onRoad(x, z, 0.8);
            const treeR = 1.9;
            const wantsTree = fringe ? roll < 0.55 : g > 0.35 && roll < 0.75;
            if (wantsTree && !onRoad(x, z, 1.2) && !inZone(x, z, 1.5) && distanceToPaths(x, z) > 1.4 && clear(x, z, treeR) && (fringe || open(nav, x, z, treeR))) {
                const variant = rnd() < 0.45 ? 0 : rnd() < 0.6 ? 1 : 2;
                trees[variant].push({ x, z, scale: 0.8 + rnd() * 0.45, rot: rnd() * Math.PI * 2, tone: rnd() });
                taken.push([x, z, treeR * 0.8]);
                continue;
            }
            // Bushes: at the edges of groves and along paths, in twos and threes.
            const nearPath = distanceToPaths(x, z);
            if (walkable && (Math.abs(g - 0.2) < 0.25 || (nearPath > 0.6 && nearPath < 2.2)) && roll < 0.35 && !onRoad(x, z, 0.6) && !inZone(x, z, 0.4)) {
                const n = 2 + Math.floor(rnd() * 2);
                for (let i = 0; i < n; i++) {
                    const bx = x + (rnd() - 0.5) * 1.8;
                    const bz = z + (rnd() - 0.5) * 1.8;
                    if (distanceToPaths(bx, bz) > 0.5 && clear(bx, bz, 0.7) && open(nav, bx, bz, 0.8)) {
                        bushes.push({ x: bx, z: bz, scale: 0.7 + rnd() * 0.5, rot: rnd() * Math.PI * 2, tone: rnd() });
                        taken.push([bx, bz, 0.55]);
                    }
                }
                continue;
            }
            // Flower beds: little clusters beside the paths.
            if (walkable && nearPath > 0.25 && nearPath < 1.6 && roll < 0.22 && !inZone(x, z, 0) && !onRoad(x, z, 0.4)) {
                const colour = rnd();
                for (let i = 0; i < 9; i++) {
                    const fx = x + (rnd() - 0.5) * 1.4;
                    const fz = z + (rnd() - 0.5) * 1.4;
                    if (distanceToPaths(fx, fz) > 0.2 && clear(fx, fz, 0.1)) flowers.push({ x: fx, z: fz, scale: 0.7 + rnd() * 0.6, rot: rnd() * 6.28, tone: colour });
                }
            }
        }

    // Rocks along both shores, half in the water.
    for (const outline of shorePoints())
        for (let i = 0; i < outline.length; i += 1) {
            if (rnd() > 0.09) continue;
            const p = outline[i];
            // Not under the ferry terminal's gangway.
            if (p.z < -20 && p.z > -28 && p.x > -24 && p.x < -14) continue;
            rocks.push({ x: p.x + p.nx * 0.2, z: p.z + p.nz * 0.2, scale: 0.5 + rnd() * 0.8, rot: rnd() * 6.28, tone: rnd() });
        }

    return { trees, bushes, flowers, rocks };
}

/** Trunks and bushes become solid in the walk grid. */
export function blockVegetation(nav: Nav, set: VegetationSet) {
    for (const t of set.trees.flat()) blockDisc(nav, t.x, t.z, 0.35 * t.scale);
    for (const b of set.bushes) blockDisc(nav, b.x, b.z, 0.4 * b.scale);
}

/* ---------------------------------------------------------------- drawing */

const GREENS = ["#7fb35a", "#6aa04f", "#8fbf63", "#5e9447", "#9cc56a", "#74a957"];
/** Rare accents: a poinciana's red-orange, and a golden-leaved tree. */
const ACCENTS = ["#e2703f", "#d9b44a"];
const BUSH = ["#5f9a4c", "#4f8a42", "#6ea657"];
const FLOWERS = ["#f2a7c3", "#f6d365", "#ffffff", "#f08a6c", "#c7a7f2"];
const ROCK = ["#b8ad9d", "#a39886", "#c8bfb0"];

function blob(r: number, x: number, y: number, z: number, sy = 1): BufferGeometry {
    return new IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
}

/** Three crown shapes: a cluster of three blobs, a tall oval, a small round tree. */
function crown(variant: number): BufferGeometry {
    const parts =
        variant === 0
            ? [blob(1.55, 0, 3.0, 0), blob(1.05, 0.85, 2.55, 0.35), blob(1.0, -0.65, 2.5, -0.45)]
            : variant === 1
              ? [blob(1.2, 0, 3.4, 0, 1.45)]
              : [blob(1.15, 0, 2.2, 0)];
    const merged = mergeGeometries(parts); // icosahedra are already non-indexed
    parts.forEach((p) => p.dispose());
    return merged;
}

function instanced(geometry: BufferGeometry, material: MeshLambertMaterial, plants: Plant[], colour: (p: Plant) => string, y = 0, squash = 1): InstancedMesh {
    const mesh = new InstancedMesh(geometry, material, Math.max(plants.length, 1));
    mesh.count = plants.length;
    const m = new Matrix4();
    const q = new Quaternion();
    const up = new Vector3(0, 1, 0);
    const c = new Color();
    plants.forEach((p, i) => {
        q.setFromAxisAngle(up, p.rot);
        m.compose(new Vector3(p.x, y, p.z), q, new Vector3(p.scale, p.scale * squash, p.scale));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, c.set(colour(p)));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.raycast = () => {};
    return mesh;
}

export default function Vegetation({ set, still }: { set: VegetationSet; still: boolean }) {
    const meshes = useMemo(() => {
        const leaves = withWorldShader(new MeshLambertMaterial({ flatShading: true }), { sway: !still });
        const solid = withWorldShader(new MeshLambertMaterial({ flatShading: true }));
        const pick = (list: string[], t: number) => list[Math.floor(t * list.length) % list.length];
        const treeColour = (p: Plant) => (p.tone > 0.94 ? pick(ACCENTS, (p.tone - 0.94) / 0.06) : pick(GREENS, p.tone / 0.94));
        const trunk = new CylinderGeometry(0.16, 0.24, 2.2, 6).translate(0, 1.1, 0);
        return [
            ...set.trees.map((list, v) => instanced(crown(v), leaves, list, treeColour)),
            instanced(trunk, solid, set.trees.flat(), () => "#8a6646"),
            instanced(new IcosahedronGeometry(0.75, 0).translate(0, 0.45, 0), leaves, set.bushes, (p) => pick(BUSH, p.tone), 0, 0.7),
            instanced(new IcosahedronGeometry(0.13, 0).translate(0, 0.22, 0), solid, set.flowers, (p) => pick(FLOWERS, p.tone)),
            instanced(new IcosahedronGeometry(1, 0), solid, set.rocks, (p) => pick(ROCK, p.tone), -0.35, 0.55),
        ];
    }, [set, still]);
    useEffect(() => () => meshes.forEach((m) => m.dispose()), [meshes]);
    return (
        <>
            {meshes.map((m) => (
                <primitive key={m.uuid} object={m} />
            ))}
        </>
    );
}
