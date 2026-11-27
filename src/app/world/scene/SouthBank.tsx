"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
    BoxGeometry,
    CircleGeometry,
    ConeGeometry,
    CylinderGeometry,
    IcosahedronGeometry,
    InstancedMesh,
    Matrix4,
    MeshLambertMaterial,
    Object3D,
    Shape,
    ShapeGeometry,
    SphereGeometry,
    TorusGeometry,
    type BufferGeometry,
    type Group,
} from "three";
import { SOUTH_BANK } from "../zones";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * South Bank (27 Nov 2026, Steven's request): the strip the island grew past the night street, with
 * three of Brisbane's landmarks. Scenery only, like Taipei 101 (WORLD.md §4 rule 4: a city landmark
 * is not a brand): no zone, no card, no number.
 *
 * - **Streets Beach**, the man-made lagoon beach: white sand, a turquoise lagoon edged in stone, palm
 *   trees, umbrellas and towels, the red-and-yellow lifesaving flags, and a few swimmers bobbing.
 * - **The BRISBANE letters**, chunky and each its own colours, as the real sign's are (the real panels
 *   are artists' work, so these are plain colour blocks, not copies). Facing south, the default
 *   camera's side, so they read like the island's title.
 * - **The Wheel of Brisbane** at the west end, white, its gondolas staying level as it turns (one turn
 *   in two minutes; still under reduced motion). West, because the camera looks from the south-east:
 *   a 23 m wheel at the east end would stand between the camera and the whole block.
 *
 * Draw calls: one merged static mesh, the turning wheel, its gondolas (instanced) and the swimmers.
 */

const SAND = "#f1e2bd";
const STONE = "#d9d2c3";
const LAGOON = "#5fd3d0";
const LAGOON_DEEP = "#3fb8c4";
const WHITE = "#f4f4f2";

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) => paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** A rounded rectangle, lying flat at height y. */
function pad(minX: number, maxX: number, minZ: number, maxZ: number, r: number, y: number, color: string): BufferGeometry {
    // Drawn in (x, −z) so that laying it flat (−90° about x, face up) puts it at +z.
    const s = new Shape();
    s.moveTo(minX + r, -minZ);
    s.lineTo(maxX - r, -minZ);
    s.quadraticCurveTo(maxX, -minZ, maxX, -minZ - r);
    s.lineTo(maxX, -maxZ + r);
    s.quadraticCurveTo(maxX, -maxZ, maxX - r, -maxZ);
    s.lineTo(minX + r, -maxZ);
    s.quadraticCurveTo(minX, -maxZ, minX, -maxZ + r);
    s.lineTo(minX, -minZ - r);
    s.quadraticCurveTo(minX, -minZ, minX + r, -minZ);
    const g = new ShapeGeometry(s, 6).rotateX(-Math.PI / 2).translate(0, y, 0);
    // A shape's UVs are its own coordinates (here −60 to −80), and the world shader reads uv.y below
    // −50 as "self-lit" (shading.ts, the lamps), which kept the beach bright all night. No texture
    // uses them, so they go; mergeParts gives the part zero UVs.
    g.deleteAttribute("uv");
    return paint(g, color);
}

/* ---------------------------------------------------------------- Streets Beach */

/**
 * A palm: one tapered trunk that curves out as it rises (a cylinder bent along a quadratic, not
 * stacked segments, which read as a broken trunk), a ring of drooping fronds and two coconuts.
 */
function palm(x: number, z: number, lean: number, turn: number, h = 5.2): BufferGeometry[] {
    const out: BufferGeometry[] = [];
    const dx = Math.sin(turn);
    const dz = Math.cos(turn);
    const bend = lean * h * 0.9; // how far the top ends up from the foot
    const trunk = new CylinderGeometry(0.13, 0.21, h, 7, 10).translate(0, h / 2, 0);
    const pos = trunk.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
        const t = pos.getY(i) / h;
        const off = bend * t * t;
        pos.setXYZ(i, pos.getX(i) + dx * off, pos.getY(i), pos.getZ(i) + dz * off);
    }
    trunk.computeVertexNormals();
    out.push(paint(trunk.translate(x, 0, z), "#9a7b55"));
    const px = x + dx * bend;
    const pz = z + dz * bend;
    const py = h;
    for (let f = 0; f < 7; f++) {
        const a = (f / 7) * Math.PI * 2;
        const frond = new BoxGeometry(0.42, 0.06, 2.4).translate(0, 0, 1.2).rotateX(0.5).rotateY(a);
        out.push(paint(frond.translate(px, py + 0.1, pz), f % 2 ? "#3f8f4a" : "#4fa257"));
    }
    out.push(paint(new IcosahedronGeometry(0.16, 0).translate(px + 0.18, py - 0.15, pz), "#6b4a2a"));
    out.push(paint(new IcosahedronGeometry(0.16, 0).translate(px - 0.12, py - 0.2, pz + 0.15), "#6b4a2a"));
    return out;
}

/** A beach umbrella: a pole and a six-sided canopy in two colours, with a towel beside it. */
function umbrella(x: number, z: number, a: string, b: string, towel: string): BufferGeometry[] {
    const out = [box(0.06, 2.2, 0.06, x, 1.1, z, "#e9e4da")];
    const canopy = new ConeGeometry(1.25, 0.5, 6, 1, true).translate(x, 2.25, z);
    out.push(paint(canopy, a));
    out.push(paint(new ConeGeometry(0.5, 0.25, 6).translate(x, 2.45, z), b));
    out.push(box(0.8, 0.03, 1.7, x + 1.0, 0.08, z + 0.3, towel));
    return out;
}

/** The lifesavers' flag: red over yellow, on a pole. "Swim between the flags." */
function flag(x: number, z: number): BufferGeometry[] {
    return [box(0.06, 2.6, 0.06, x, 1.3, z, "#e9e4da"), box(0.7, 0.24, 0.03, x + 0.38, 2.38, z, "#d6342c"), box(0.7, 0.24, 0.03, x + 0.38, 2.14, z, "#f2c230")];
}

/** A sunbather lying on a towel: a body, a head, in swimwear colours. */
function sunbather(x: number, z: number, rot: number, suit: string, skin: string): BufferGeometry[] {
    // Built along local z at the origin (head towards −z), then turned and moved into place.
    const local = [
        paint(new BoxGeometry(0.62, 0.05, 1.8).translate(0, 0.07, 0), "#f5f0e6"),
        paint(new BoxGeometry(0.4, 0.2, 1.2).translate(0, 0.2, 0.1), skin),
        paint(new BoxGeometry(0.42, 0.22, 0.45).translate(0, 0.21, -0.1), suit),
        paint(new SphereGeometry(0.15, 8, 6).translate(0, 0.24, -0.72), skin),
    ];
    return local.map((g) => g.rotateY(rot).translate(x, 0, z));
}

function beach(): BufferGeometry[] {
    const { sand, lagoon } = SOUTH_BANK;
    const out: BufferGeometry[] = [
        pad(sand.minX, sand.maxX, sand.minZ, sand.maxZ, 3.5, 0.04, SAND),
        // The lagoon: a stone rim, then the water in two depths.
        pad(lagoon.minX - 0.6, lagoon.maxX + 0.6, lagoon.minZ - 0.6, lagoon.maxZ + 0.6, 3, 0.07, STONE),
        pad(lagoon.minX, lagoon.maxX, lagoon.minZ, lagoon.maxZ, 2.6, 0.09, LAGOON),
        pad(lagoon.minX + 3, lagoon.maxX - 3, lagoon.minZ + 2.2, lagoon.maxZ - 2.2, 1.8, 0.1, LAGOON_DEEP),
    ];
    // Palms round the sand's edge, leaning out a little, as on the river side of the real beach.
    const palms: [number, number, number, number][] = [
        [-21, 61.5, 0.25, 3.6],
        [-21.2, 69, 0.3, 4.4],
        [-20.5, 77.5, 0.22, 5.2],
        [-11, 78.2, 0.2, 0.1],
        [-2, 61, 0.28, 3.0],
        [4, 78.2, 0.25, 0.4],
        [9.2, 62, 0.3, 2.2],
        [9.5, 71, 0.2, 1.4],
    ];
    palms.forEach(([x, z, lean, turn], i) => out.push(...palm(x, z, lean, turn, 4.8 + (i % 3) * 0.6)));
    // Umbrellas and towels on the sand between the lagoon and the night street, and below it.
    out.push(...umbrella(-13, 61.2, "#e85a4f", WHITE, "#2f80ed"));
    out.push(...umbrella(-6.5, 61.4, "#f2c230", WHITE, "#e85a9b"));
    out.push(...umbrella(1.5, 61.3, "#2f80ed", WHITE, "#f2c230"));
    out.push(...umbrella(-8, 76.6, "#3fb37f", WHITE, "#e85a4f"));
    out.push(...umbrella(0, 76.8, "#e85a9b", WHITE, "#3fb37f"));
    // The flags, either side of the swimming area.
    out.push(...flag(lagoon.minX + 2, lagoon.minZ - 1.4), ...flag(lagoon.maxX - 3, lagoon.minZ - 1.4));
    // A few sunbathers.
    out.push(...sunbather(-17.5, 76, 0.2, "#e85a4f", "#e8b48f"));
    out.push(...sunbather(-15.5, 76.4, -0.1, "#2f80ed", "#c98d64"));
    out.push(...sunbather(6.5, 66, 1.4, "#f2c230", "#e8b48f"));
    out.push(...sunbather(7, 69.5, 1.6, "#3fb37f", "#a8724c"));
    return out;
}

/** Swimmers: heads and shoulders in the lagoon, bobbing gently. */
const SWIMMERS: [number, number, number][] = [
    [-12, 66.5, 0],
    [-9, 69.5, 1.3],
    [-4.5, 67, 2.4],
    [-1, 71, 3.6],
    [2, 66.8, 4.8],
    [-14.5, 71.2, 5.9],
];

/* ---------------------------------------------------------------- the letters */

/** Chunky letters on a 4 × 5 grid of 0.5 m cells, top row first. */
const GLYPHS: Record<string, string[]> = {
    B: ["1110", "1001", "1110", "1001", "1110"],
    R: ["1110", "1001", "1110", "1010", "1001"],
    I: ["111", "010", "010", "010", "111"],
    S: ["0111", "1000", "0110", "0001", "1110"],
    A: ["0110", "1001", "1111", "1001", "1001"],
    N: ["1001", "1101", "1011", "1001", "1001"],
    E: ["1111", "1000", "1110", "1000", "1111"],
};
/** Each letter's two colours, after the real sign's mix of bright panels. */
const LETTER_COLOURS: [string, string][] = [
    ["#e0457b", "#f07aa4"],
    ["#6b3fa0", "#8d62c4"],
    ["#f2c230", "#f6d76a"],
    ["#f08a5d", "#4fa3e0"],
    ["#1f9e89", "#2f80ed"],
    ["#f4f2ea", "#3b6fd1"],
    ["#b5307a", "#d65a9c"],
    ["#7d3c98", "#a466c2"],
];
const CELL = 0.5;
const DEPTH = 0.55;

function letters(): BufferGeometry[] {
    const { x0, z } = SOUTH_BANK.letters;
    const out: BufferGeometry[] = [];
    let x = x0;
    [..."BRISBANE"].forEach((ch, i) => {
        const rows = GLYPHS[ch];
        const [a, b] = LETTER_COLOURS[i];
        rows.forEach((row, r) =>
            [...row].forEach((on, c) => {
                if (on !== "1") return;
                // A checker of the letter's two colours, so each reads as a decorated panel, not a block.
                const colour = (r + c) % 2 ? b : a;
                out.push(box(CELL, CELL, DEPTH, x + c * CELL + CELL / 2, 0.25 + (4 - r) * CELL + CELL / 2, z, colour));
            }),
        );
        x += rows[0].length * CELL + 0.45;
    });
    // The low mint plinth the letters stand on, as the real sign's.
    const len = x - x0 - 0.45;
    out.push(box(len + 1.6, 0.25, 2.2, x0 + len / 2, 0.125, z, "#bfe3cf"));
    return out;
}

/** The letters' overall length, for the walk grid (placements.ts). */
export const LETTERS_LENGTH = [..."BRISBANE"].reduce((n, ch) => n + GLYPHS[ch][0].length * CELL + 0.45, -0.45);

/* ---------------------------------------------------------------- the Wheel */

const GONDOLAS = 24;
/** The wheel's plane faces the default camera: local +z turned 45° towards +x. */
const WHEEL_TURN = Math.PI / 4;
const TURN_SECONDS = 120;

/** The parts that turn: the rim (two rings), the spokes and the hub, built in the wheel's own plane. */
function wheelRotor(): BufferGeometry {
    const { radius } = SOUTH_BANK.wheel;
    const parts: BufferGeometry[] = [];
    for (const dz of [-0.6, 0.6]) parts.push(paint(new TorusGeometry(radius, 0.16, 5, 64).translate(0, 0, dz), WHITE));
    for (let i = 0; i < GONDOLAS; i++) {
        const a = (i / GONDOLAS) * Math.PI * 2;
        for (const dz of [-0.5, 0.5]) {
            const spoke = new BoxGeometry(0.07, radius, 0.07).translate(0, radius / 2, dz).rotateZ(a);
            parts.push(paint(spoke, "#e6e8ec"));
        }
        // A cross-tie between the two rims at each gondola.
        parts.push(paint(new BoxGeometry(0.1, 0.1, 1.3).translate(Math.sin(-a) * radius, Math.cos(a) * radius, 0), WHITE));
    }
    // The hub, red and black like the real one's.
    parts.push(paint(new CylinderGeometry(0.9, 0.9, 1.6, 12).rotateX(Math.PI / 2), "#1d1f24"));
    parts.push(paint(new CylinderGeometry(0.55, 0.55, 1.75, 12).rotateX(Math.PI / 2), "#c8312b"));
    return mergeParts(parts);
}

/** What stands still: the A-frame legs either side, a paved plaza and the ticket booth. */
function wheelBase(): BufferGeometry[] {
    const { x, z, hub } = SOUTH_BANK.wheel;
    const local: BufferGeometry[] = [];
    // Two A-frames, one each side of the wheel, from the hub out to the ground.
    for (const side of [-1.6, 1.6])
        for (const foot of [-6.5, 6.5]) {
            const len = Math.hypot(foot, hub);
            // Stand it up from the foot, then lean its top in to the hub at (0, hub).
            const leg = new BoxGeometry(0.4, len, 0.4).translate(0, len / 2, 0).rotateZ(Math.atan2(foot, hub)).translate(foot, 0, side);
            local.push(paint(leg, WHITE));
        }
    // The axle between the two A-frames.
    local.push(paint(new CylinderGeometry(0.25, 0.25, 3.6, 8).rotateX(Math.PI / 2).translate(0, hub, 0), "#cfd3da"));
    const out = local.map((g) => g.rotateY(WHEEL_TURN).translate(x, 0, z));
    out.push(paint(new CircleGeometry(9.5, 28).rotateX(-Math.PI / 2).translate(x, 0.05, z), "#d8d4cc"));
    // The ticket booth, with a window on the side facing the plaza and the side facing south: a lit
    // window (the lamp colour, so it glows at night), a counter under it and a blue band over it.
    const bx = x + 6.5;
    const bz = z + 5.5;
    out.push(box(2.6, 2.2, 1.8, bx, 1.1, bz, "#2b2f36"));
    out.push(box(1.4, 0.8, 0.04, bx, 1.3, bz + 0.92, "#f2d98a"));
    out.push(box(1.6, 0.08, 0.35, bx, 0.86, bz + 1.05, "#e9e4da"));
    out.push(box(1.8, 0.26, 0.05, bx, 1.92, bz + 0.93, "#2456d6"));
    out.push(box(0.04, 0.8, 1.0, bx - 1.32, 1.3, bz, "#f2d98a"));
    out.push(box(0.35, 0.08, 1.2, bx - 1.45, 0.86, bz, "#e9e4da"));
    out.push(box(0.05, 0.26, 1.4, bx - 1.33, 1.92, bz, "#2456d6"));
    out.push(paint(new ConeGeometry(2.1, 0.8, 4).rotateY(Math.PI / 4).translate(x + 6.5, 2.6, z + 5.5), "#e9e4da"));
    return out;
}

/** One gondola: a white capsule with a dark window band, hanging from a short hanger. */
function gondola(): BufferGeometry {
    return mergeParts([
        paint(new SphereGeometry(0.62, 10, 8).scale(1, 0.85, 0.8), WHITE),
        paint(new CylinderGeometry(0.63, 0.63, 0.32, 10).scale(1, 1, 0.81).translate(0, 0.05, 0), "#2a3140"),
        paint(new BoxGeometry(0.08, 0.5, 0.08).translate(0, 0.72, 0), "#cfd3da"),
    ]);
}

/* ---------------------------------------------------------------- the whole strip */

export default function SouthBank({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts([...beach(), ...letters(), ...wheelBase()]), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const rotorGeo = useMemo(() => wheelRotor(), []);
    const gondolaGeo = useMemo(() => gondola(), []);
    const swimmerGeo = useMemo(
        () =>
            mergeParts([
                paint(new SphereGeometry(0.17, 8, 6).translate(0, 0.32, 0), "#e2ad86"),
                paint(new SphereGeometry(0.3, 8, 6).scale(1, 0.5, 0.8).translate(0, 0.12, 0), "#e2ad86"),
                paint(new CircleGeometry(0.5, 14).rotateX(-Math.PI / 2).translate(0, 0.02, 0), "#9fe6e3"),
            ]),
        [],
    );
    const rotor = useRef<Group>(null);
    const gondolas = useRef<InstancedMesh>(null);
    const swimmers = useRef<InstancedMesh>(null);
    const angle = useRef(0);
    const scratch = useMemo(() => ({ o: new Object3D(), m: new Matrix4() }), []);

    useFrame((state, dt) => {
        const { x, z, radius, hub } = SOUTH_BANK.wheel;
        if (!still) angle.current += (Math.min(dt, 0.1) * Math.PI * 2) / TURN_SECONDS;
        if (rotor.current) rotor.current.rotation.z = angle.current;
        // Gondolas ride the rim but hang level: positions turn with the wheel, rotations don't.
        const g = gondolas.current;
        if (g) {
            const c = Math.cos(WHEEL_TURN);
            const s = Math.sin(WHEEL_TURN);
            for (let i = 0; i < GONDOLAS; i++) {
                const a = angle.current + (i / GONDOLAS) * Math.PI * 2;
                const lx = Math.sin(-a) * radius;
                const ly = Math.cos(a) * radius;
                // Local (lx, ly, 0) turned about y by WHEEL_TURN, then moved to the hub; the gondola hangs below its pin.
                scratch.o.position.set(x + lx * c, hub + ly - 0.75, z - lx * s);
                scratch.o.rotation.set(0, WHEEL_TURN, 0);
                scratch.o.updateMatrix();
                g.setMatrixAt(i, scratch.o.matrix);
            }
            g.instanceMatrix.needsUpdate = true;
        }
        const w = swimmers.current;
        if (w) {
            const t = state.clock.elapsedTime;
            SWIMMERS.forEach(([sx, sz, phase], i) => {
                scratch.o.position.set(sx, 0.02 + (still ? 0 : Math.sin(t * 1.6 + phase) * 0.05), sz);
                scratch.o.rotation.set(0, phase, 0);
                scratch.o.updateMatrix();
                w.setMatrixAt(i, scratch.o.matrix);
            });
            w.instanceMatrix.needsUpdate = true;
        }
    });

    const { x, z, hub } = SOUTH_BANK.wheel;
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <group position={[x, hub, z]} rotation-y={WHEEL_TURN}>
                <group ref={rotor} userData={{ dynamic: true }}>
                    <mesh geometry={rotorGeo} material={material} raycast={() => null} />
                </group>
            </group>
            <instancedMesh ref={gondolas} args={[gondolaGeo, material, GONDOLAS]} userData={{ dynamic: true }} raycast={() => null} frustumCulled={false} />
            <instancedMesh ref={swimmers} args={[swimmerGeo, material, SWIMMERS.length]} userData={{ dynamic: true }} raycast={() => null} frustumCulled={false} />
        </>
    );
}
