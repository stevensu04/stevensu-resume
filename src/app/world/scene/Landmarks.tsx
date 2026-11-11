"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
    BoxGeometry,
    BufferAttribute,
    CircleGeometry,
    Color,
    DoubleSide,
    ExtrudeGeometry,
    MeshBasicMaterial,
    PlaneGeometry,
    Shape,
    Vector2,
    type BufferGeometry,
    type Group,
} from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";
import { PALETTE } from "./Props";

/**
 * The things that say whose building it is (WORLD.md §3, §4), added at Steven's request:
 *
 * - **StarLens:** solar panels on the roof, north-facing as they would be in Brisbane. The project
 *   was a green-power trading desk; the door below still stays shut.
 * - **UQ:** a purple shield with a gold rim and an open book over the entrance — a university, not
 *   UQ's registered crest (§4 rule 4) — and the Aboriginal flag on a pole out front, as it flies on
 *   campus: black over red, the yellow circle in the middle. Free to reproduce since 2022.
 * - **Skyveil:** Olie the owl on the garage roof, turning her head now and then.
 * - **The Gallery:** a white gallery with a glass front, sawtooth skylights, banners and a sculpture,
 *   in place of the Kenney office block it was.
 *
 * Static parts merge into one mesh under the shared world shader; only Olie's head and the flag
 * move, and both stop under reduced motion.
 */

const STARLENS = { x: -22, z: -18, roof: 9.62 };
const UQ = { x: 2, front: -12.08, crestY: 11.2 };
export const FLAGPOLE = { x: 10.4, z: -10.7 };
const SKYVEIL_ROOF = { x: 0.6, y: 6.05, z: 7 };
export const GALLERY = { x: 0, z: 23.5, w: 12, d: 7.6, h: 6.2 };
export const SCULPTURE = { x: -4.6, z: 29.1 };

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** A shape's outline (x, y), extruded `depth` along +z from z0. */
function extrude(points: [number, number][], depth: number, color: string): BufferGeometry {
    return paint(new ExtrudeGeometry(new Shape(points.map(([x, y]) => new Vector2(x, y))), { depth, bevelEnabled: false }), color);
}

/** Colour a geometry flat, without the baked sun: flags and screens read better unshaded. */
function flat(geometry: BufferGeometry, color: string): BufferGeometry {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    const c = new Color(color);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < geo.attributes.position.count; i++) colors.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
}

function solarPanels(): BufferGeometry[] {
    const parts: BufferGeometry[] = [];
    // Two rows of three, tilted to face north (−z): Brisbane is in the southern hemisphere. Raised
    // on frames so they clear the parapet and read from the street.
    const tilt = -0.25;
    const y = STARLENS.roof + 1.1;
    for (const row of [-1.7, 1.7])
        for (const col of [-2.15, 0, 2.15]) {
            const x = STARLENS.x + col;
            const z = STARLENS.z + row;
            const onPanel = (w: number, d: number, dx: number, dz: number, lift: number, color: string) =>
                paint(new BoxGeometry(w, 0.08, d).translate(dx, lift, dz).rotateX(tilt).translate(x, y, z), color);
            parts.push(onPanel(2, 1.5, 0, 0, 0, "#2b52a8"));
            // Cell lines, so they read as solar panels rather than blue slabs.
            parts.push(onPanel(2.02, 0.05, 0, 0, 0.02, "#a9c1ea"));
            for (const dx of [-0.5, 0.5]) parts.push(onPanel(0.05, 1.52, dx, 0, 0.02, "#a9c1ea"));
            for (const dx of [-0.85, 0.85]) {
                parts.push(box(0.1, 1.25, 0.1, x + dx, STARLENS.roof + 0.62, z + 0.6, PALETTE.slate));
                parts.push(box(0.1, 0.85, 0.1, x + dx, STARLENS.roof + 0.42, z - 0.6, PALETTE.slate));
            }
        }
    return parts;
}

function uqCrest(): BufferGeometry[] {
    // A shield: flat top, straight sides, pointed foot. Gold rim behind, purple face in front.
    const shield = (s: number): [number, number][] => [
        [-0.8 * s, 0.95 * s],
        [0.8 * s, 0.95 * s],
        [0.8 * s, 0.05 * s],
        [0, -0.95 * s],
        [-0.8 * s, 0.05 * s],
    ];
    const rim = extrude(shield(1.5), 0.12, "#d4af37").translate(UQ.x, UQ.crestY, UQ.front);
    const face = extrude(shield(1.34), 0.14, "#51247a").translate(UQ.x, UQ.crestY, UQ.front + 0.02);
    // An open book in gold: two pages in a shallow V.
    const left = new BoxGeometry(0.82, 0.56, 0.04).rotateZ(0.12).translate(UQ.x - 0.43, UQ.crestY + 0.15, UQ.front + 0.18);
    const right = new BoxGeometry(0.82, 0.56, 0.04).rotateZ(-0.12).translate(UQ.x + 0.43, UQ.crestY + 0.15, UQ.front + 0.18);
    return [rim, face, paint(left, "#e8c766"), paint(right, "#e8c766")];
}

function flagpole(): BufferGeometry[] {
    return [
        box(0.7, 0.3, 0.7, FLAGPOLE.x, 0.15, FLAGPOLE.z, PALETTE.concrete),
        paint(new BoxGeometry(0.12, 7.6, 0.12).translate(FLAGPOLE.x, 3.8 + 0.3, FLAGPOLE.z), "#d6d8dc"),
        box(0.22, 0.22, 0.22, FLAGPOLE.x, 7.98, FLAGPOLE.z, "#d4af37"),
    ];
}

function gallery(): BufferGeometry[] {
    const { x, z, w, d, h } = GALLERY;
    const front = z + d / 2;
    const parts = [
        box(w, h, d, x, h / 2, z, PALETTE.white),
        // A plinth line along the base, as galleries have.
        box(w + 0.3, 0.35, d + 0.3, x, 0.175, z, "#cfcac0"),
        // The glass front: dark, full height of the ground floor, with mullions.
        box(7.4, 3.6, 0.12, x, 2.15, front + 0.04, "#2a3446"),
        ...[-2.47, 0, 2.47].map((dx) => box(0.12, 3.6, 0.16, x + dx, 2.15, front + 0.06, PALETTE.white)),
        // A thin cantilevered canopy over the door.
        box(8.6, 0.22, 1.8, x, 4.2, front + 0.9, PALETTE.white),
        // Two tall banners either side of the glass.
        box(0.9, 3.4, 0.06, x - 4.9, 3.6, front + 0.05, PALETTE.accent),
        box(0.9, 3.4, 0.06, x + 4.9, 3.6, front + 0.05, "#e2b33c"),
    ];
    // Sawtooth skylights on the roof, glazed faces towards the south (the cooler light here is north,
    // but these face the camera so the roofline reads as a gallery).
    for (const dz of [-2.4, 0, 2.4]) {
        const tooth = extrude(
            [
                [0, 0],
                [1.8, 0],
                [0, 1.2],
            ],
            w - 1.2,
            PALETTE.white,
        );
        // Build in the XY plane, then turn it so the triangle runs along z and the length along x.
        tooth.rotateY(Math.PI / 2).translate(x - (w - 1.2) / 2, h, z + dz + 0.9);
        parts.push(tooth);
        parts.push(box(w - 1.2, 1.0, 0.06, x, h + 0.55, z + dz + 0.92, "#8fb3e8"));
    }
    return parts;
}

function sculpture(): BufferGeometry[] {
    const { x, z } = SCULPTURE;
    return [
        box(1.6, 0.6, 1.6, x, 0.3, z, PALETTE.concrete),
        // A red arch: two legs and a lintel, slightly askew, the way outdoor pieces often are.
        box(0.3, 1.8, 0.3, x - 0.5, 1.5, z, "#d64545"),
        box(0.3, 1.4, 0.3, x + 0.5, 1.3, z, "#d64545"),
        box(1.4, 0.3, 0.3, x, 2.45, z, "#d64545"),
    ];
}

export default function Landmarks({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts([...solarPanels(), ...uqCrest(), ...flagpole(), ...gallery(), ...sculpture()]), []);
    const material = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <AboriginalFlag still={still} />
            <Olie still={still} />
        </>
    );
}

/** Black over red, the yellow circle centred, half the flag's height across. Drawn on both faces. */
function AboriginalFlag({ still }: { still: boolean }) {
    const flagRef = useRef<Group>(null);
    const timeRef = useRef(0);
    const geo = useMemo(() => {
        const W = 2.4;
        const H = 1.2;
        const parts = [
            flat(new PlaneGeometry(W, H / 2).translate(W / 2, H / 4, 0), "#000000"),
            flat(new PlaneGeometry(W, H / 2).translate(W / 2, -H / 4, 0), "#c8102e"),
            flat(new CircleGeometry(H / 4, 28).translate(W / 2, 0, 0.012), "#ffc72c"),
            flat(new CircleGeometry(H / 4, 28).rotateY(Math.PI).translate(W / 2, 0, -0.012), "#ffc72c"),
        ];
        return mergeParts(parts);
    }, []);
    // Not under the world shader: the flag flies in its own colours from the start, never greyed out
    // with the rest of an unexplored zone.
    const mat = useMemo(() => new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }), []);
    useFrame((_, dt) => {
        if (!flagRef.current || still) return;
        timeRef.current += dt;
        // A slow stir, not a flap: the flag swings a few degrees about its pole.
        flagRef.current.rotation.y = Math.sin(timeRef.current * 0.9) * 0.12;
    });
    return (
        <group ref={flagRef} position={[FLAGPOLE.x + 0.06, 7.2, FLAGPOLE.z]}>
            <mesh geometry={geo} material={mat} raycast={() => null} />
        </group>
    );
}

/** Olie, Skyveil's owl: brown and cream, big eyes, ear tufts. Turns her head every few seconds. */
const OWL = { body: "#7a5230", wing: "#5f3f24", belly: "#ead9b6", face: "#e9d6ae", eye: "#f5c518", pupil: "#141414", beak: "#e08a1e" };

function Olie({ still }: { still: boolean }) {
    const headRef = useRef<Group>(null);
    const timeRef = useRef(0);
    const body = useMemo(
        () =>
            mergeParts([
                // An owl has no neck to speak of: a stout body, a little wider at the base.
                box(0.66, 0.42, 0.52, 0, 0.27, 0, OWL.body),
                box(0.6, 0.3, 0.48, 0, 0.6, 0, OWL.body),
                // Cream belly with brown chevrons.
                box(0.42, 0.6, 0.05, 0, 0.42, 0.27, OWL.belly),
                ...[0.28, 0.44, 0.6].flatMap((y) => [
                    box(0.12, 0.04, 0.02, -0.08, y, 0.3, OWL.body),
                    box(0.12, 0.04, 0.02, 0.08, y, 0.3, OWL.body),
                ]),
                // Wings folded at the sides, a short tail behind, feet gripping the ridge.
                box(0.1, 0.56, 0.42, -0.36, 0.4, -0.02, OWL.wing),
                box(0.1, 0.56, 0.42, 0.36, 0.4, -0.02, OWL.wing),
                box(0.36, 0.22, 0.1, 0, 0.1, -0.3, OWL.wing),
                box(0.14, 0.06, 0.18, -0.13, 0.03, 0.14, OWL.beak),
                box(0.14, 0.06, 0.18, 0.13, 0.03, 0.14, OWL.beak),
            ]),
        [],
    );
    const face = useMemo(
        () =>
            mergeParts([
                box(0.68, 0.5, 0.54, 0, 0.25, 0, OWL.body),
                // The facial disc: two pale rounds side by side, the shape that says "owl".
                flat(new CircleGeometry(0.2, 22).translate(-0.13, 0.26, 0.275), OWL.face),
                flat(new CircleGeometry(0.2, 22).translate(0.13, 0.26, 0.276), OWL.face),
                // Ear tufts, angled out.
                paint(new BoxGeometry(0.11, 0.24, 0.1).rotateZ(0.4).translate(-0.27, 0.56, 0.05), OWL.wing),
                paint(new BoxGeometry(0.11, 0.24, 0.1).rotateZ(-0.4).translate(0.27, 0.56, 0.05), OWL.wing),
                // Big yellow eyes, black pupils, a glint; a hooked beak between.
                flat(new CircleGeometry(0.125, 22).translate(-0.13, 0.28, 0.28), OWL.eye),
                flat(new CircleGeometry(0.125, 22).translate(0.13, 0.28, 0.28), OWL.eye),
                flat(new CircleGeometry(0.065, 16).translate(-0.13, 0.28, 0.284), OWL.pupil),
                flat(new CircleGeometry(0.065, 16).translate(0.13, 0.28, 0.284), OWL.pupil),
                flat(new CircleGeometry(0.022, 10).translate(-0.11, 0.3, 0.288), "#ffffff"),
                flat(new CircleGeometry(0.022, 10).translate(0.15, 0.3, 0.288), "#ffffff"),
                extrude(
                    [
                        [-0.06, 0.2],
                        [0.06, 0.2],
                        [0, 0.06],
                    ],
                    0.08,
                    OWL.beak,
                ).translate(0, 0, 0.26),
            ]),
        [],
    );
    const mat = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    useFrame((_, dt) => {
        if (!headRef.current || still) return;
        timeRef.current += dt;
        // Look one way, hold, look back, hold: a turn every few seconds, the way owls do it.
        const phase = timeRef.current % 8;
        const target = phase < 3 ? 0 : phase < 5 ? 0.9 : phase < 6.5 ? -0.6 : 0;
        headRef.current.rotation.y += (target - headRef.current.rotation.y) * Math.min(1, dt * 5);
    });
    return (
        <group position={[SKYVEIL_ROOF.x, SKYVEIL_ROOF.y, SKYVEIL_ROOF.z]} scale={1.5}>
            <mesh geometry={body} material={mat} raycast={() => null} />
            <group ref={headRef} position={[0, 0.74, 0]}>
                <mesh geometry={face} material={mat} raycast={() => null} />
            </group>
        </group>
    );
}
