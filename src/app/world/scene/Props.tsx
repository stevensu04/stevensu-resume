"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, Color, ExtrudeGeometry, MeshBasicMaterial, PlaneGeometry, Shape, Vector2, type BufferGeometry, type Group, type ShaderMaterial } from "three";
import { withWorldShader } from "./worldShader";
import { PIER, RACQUET } from "../placements";
import { RIVER, SLAB } from "../zones";
import { mergeBoxes, mergeParts, paint, shadedBox, type BoxSpec } from "./shading";

/**
 * Everything the kits don't have (WORLD.md §6): the river, pier, ferry, shutter, frosted glass,
 * scaffolding, crane, arcade cabinet, noticeboards, plinths and blueprint table. All box-level,
 * coloured from the palette below, shaded through vertex colours, and unlit.
 *
 * Draw calls (§9: < 80): every static box is merged into one mesh. Only what moves (ferry, crane
 * jib, arcade screen) or is see-through (frosted glass, the blueprint wireframe) stands alone.
 *
 * Idle motion (§6) lives here too. All of it stops under prefers-reduced-motion (`still`).
 */
export const PALETTE = {
    white: "#f1efe9",
    slate: "#4b5161",
    wood: "#b9825a",
    green: "#5fae6e",
    water: "#7cc4e4",
    concrete: "#b7b3aa",
    accent: "#2563eb",
} as const;

const CRANE_YELLOW = "#e2b33c";

export default function Props({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeBoxes(STATIC_BOXES), []);
    const staticsMaterial = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    return (
        <>
            <mesh geometry={statics} material={staticsMaterial} raycast={() => null} />
            <River still={still} />
            <Ferry still={still} />
            <CraneJib still={still} />
            <Arcade still={still} />
            <Racquet />
            {/* Finance Forms: frosted glass over the entrance (§4: confidential stays closed). */}
            <Glass at={[27, 2, -11.85]} size={[4, 4, 0.2]} />
            {/* BrisPulse: a translucent wireframe over the blueprint table, no walls (§4: concept). */}
            <mesh position={[-31, 1.75, 24.5]} raycast={() => null}>
                <boxGeometry args={[2, 1.5, 1.3]} />
                <meshBasicMaterial color="#9cc0ff" wireframe transparent opacity={0.8} />
            </mesh>
        </>
    );
}

/* ---------------------------------------------------------------- static boxes */

const box = (at: BoxSpec["at"], size: BoxSpec["size"], color: string, rotY?: number): BoxSpec => ({ at, size, color, rotY });

function pierBoxes(): BoxSpec[] {
    const len = PIER.maxZ - PIER.minZ;
    const cz = (PIER.minZ + PIER.maxZ) / 2;
    const out = [box([PIER.x, -0.05, cz], [PIER.w, 0.3, len], PALETTE.wood)];
    for (const z of [PIER.minZ + 0.3, cz, PIER.maxZ - 0.6]) {
        out.push(box([PIER.x - PIER.w / 2 + 0.2, -0.6, z], [0.3, 1.2, 0.3], PALETTE.slate));
        out.push(box([PIER.x + PIER.w / 2 - 0.2, -0.6, z], [0.3, 1.2, 0.3], PALETTE.slate));
    }
    return out;
}

function noticeboard(x: number, z: number, wide = false): BoxSpec[] {
    const w = wide ? 4.2 : 2.4;
    return [
        box([x - w / 2 + 0.15, 1, z], [0.15, 2, 0.15], PALETTE.slate),
        box([x + w / 2 - 0.15, 1, z], [0.15, 2, 0.15], PALETTE.slate),
        box([x, 1.7, z], [w, 1.4, 0.15], PALETTE.wood),
        box([x - w / 4, 1.75, z + 0.09], [w / 3, 0.8, 0.02], PALETTE.white),
        box([x + w / 5, 1.6, z + 0.09], [w / 4, 0.6, 0.02], "#fde68a"),
    ];
}

/** 4 · The building site: a two-storey concrete core, scaffolding round it, the crane's mast. */
const SITE = { x: 25, z: 8 };
const CRANE = { x: SITE.x + 6, z: SITE.z - 2, height: 14 };

function siteBoxes(): BoxSpec[] {
    const out = [box([SITE.x, 3, SITE.z], [8, 6, 6], PALETTE.concrete)];
    for (const x of [-4.5, -1.5, 1.5, 4.5]) for (const z of [-3.5, 3.5]) out.push(box([SITE.x + x, 4.5, SITE.z + z], [0.15, 9, 0.15], PALETTE.wood));
    for (const y of [3, 6]) for (const z of [-3.5, 3.5]) out.push(box([SITE.x, y, SITE.z + z], [9.2, 0.15, 0.9], PALETTE.wood));
    out.push(box([CRANE.x, CRANE.height / 2, CRANE.z], [0.8, CRANE.height, 0.8], CRANE_YELLOW));
    return out;
}

const ARCADE = { x: 3.5, z: 13.2 };

const STATIC_BOXES: BoxSpec[] = [
    ...pierBoxes(),
    // 1 · StarLens: a shutter pulled down over the front (§4: confidential stays closed).
    box([-22, 1.6, -14.15], [4.2, 3.2, 0.25], PALETTE.slate),
    // 3 · Finance Forms: the padlock on the frosted door (the glass itself is translucent, below).
    box([27, 1.4, -11.65], [0.5, 0.6, 0.2], PALETTE.accent),
    // 2 · The volunteer noticeboard at the UQ corner.
    ...noticeboard(4.5, -10.6),
    ...siteBoxes(),
    // 5 · The arcade cabinet's body (the screen flickers, below).
    box([ARCADE.x, 0.9, ARCADE.z], [0.9, 1.8, 0.8], PALETTE.slate),
    // 7 · The park: grass, the blueprint table, two plinths (their models are in Landmarks.tsx).
    box([-26, 0.04, 24], [18, 0.08, 10], PALETTE.green),
    box([-31, 0.45, 24.5], [3.2, 0.9, 2.2], PALETTE.wood),
    box([-31, 0.92, 24.5], [2.9, 0.04, 1.9], "#3b6fd8"),
    box([-25, 0.55, 24.5], [2, 1.1, 2], PALETTE.white),
    box([-20, 0.55, 24.5], [2, 1.1, 2], PALETTE.white),
    // The exit noticeboard.
    ...noticeboard(26, 22, true),
];

/* ---------------------------------------------------------------- river */

const WATER_VERT = /* glsl */ `
uniform float uTime;
varying float vSwell;
void main() {
    vec3 p = position;
    // Two crossing sine swells. Small: a diorama's river, not an ocean.
    float s = sin(p.x * 0.45 + uTime * 0.9) * 0.5 + cos(p.y * 0.8 + uTime * 0.7) * 0.5;
    p.z += s * 0.12;
    vSwell = s;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const WATER_FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vSwell;
void main() {
    gl_FragColor = vec4(uColor * (0.92 + 0.1 * vSwell), 1.0);
    #include <colorspace_fragment>
}`;

function River({ still }: { still: boolean }) {
    const width = SLAB.maxX - SLAB.minX;
    const depth = RIVER.maxZ - RIVER.minZ;
    const geo = useMemo(() => new PlaneGeometry(width, depth, 64, 8), [width, depth]);
    const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new Color(PALETTE.water) } }), []);
    const mat = useRef<ShaderMaterial>(null);
    useFrame((_, dt) => {
        if (mat.current && !still) mat.current.uniforms.uTime.value += dt;
    });
    // The riverbed is lowered (Stage), so the water sits below the bank.
    return (
        <mesh geometry={geo} position={[0, -0.35, (RIVER.minZ + RIVER.maxZ) / 2]} rotation-x={-Math.PI / 2} raycast={() => null}>
            <shaderMaterial ref={mat} vertexShader={WATER_VERT} fragmentShader={WATER_FRAG} uniforms={uniforms} />
        </mesh>
    );
}

/* ---------------------------------------------------------------- ferry */

/** One crossing every 30 s (§6): in from the west, 8 s at the pier, out to the east. */
const FERRY_LANE_Z = -29.2;
const CYCLE = 30;
const DOCKED = 10;

/**
 * A Brisbane CityCat, ~24 m: white twin hulls, a royal-blue body with a raked bow, the yellow
 * stripe that sweeps up to the cabin, a dark window band, a white roof and a wheelhouse forward.
 * Each part is a side profile extruded across the beam, painted with the fixed sun (`paint`) and
 * merged into one mesh. The bow points +x, the way it sails.
 */
const CITYCAT = { white: "#f4f5f2", blue: "#1f4fbf", yellow: "#f6c21c", glass: "#141b2b" };

function profile(points: [number, number][], depth: number, z: number, color: string): BufferGeometry {
    const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)));
    const geo = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    geo.translate(0, 0, z - depth / 2);
    return paint(geo, color);
}

function cityCat(): BufferGeometry {
    const { white, blue, yellow, glass } = CITYCAT;
    const hull: [number, number][] = [[-12, -0.4], [9.6, -0.4], [12.2, 0.9], [-12, 0.9]];
    const body: [number, number][] = [[-11.8, 0.9], [12.2, 0.9], [8.9, 2.4], [-11.8, 2.4]];
    const cabin: [number, number][] = [[-10, 2.4], [7.2, 2.4], [4.7, 3.9], [-10, 3.9]];
    const stripe: [number, number][] = [[-11.8, 2.16], [9.3, 2.16], [8.9, 2.4], [-11.8, 2.4]];
    const sweep: [number, number][] = [[6.4, 2.4], [7.3, 2.4], [4.9, 3.95], [4.0, 3.95]];
    const windows: [number, number][] = [[-9.4, 2.75], [6.3, 2.75], [4.9, 3.62], [-9.4, 3.62]];
    const wheelhouse: [number, number][] = [[0.8, 4.15], [4.6, 4.15], [3.7, 5.1], [0.8, 5.1]];
    const bridgeGlass: [number, number][] = [[1.2, 4.45], [4.25, 4.45], [3.85, 4.95], [1.2, 4.95]];
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
        paint(new BoxGeometry(w, h, d).translate(x, y, z), color);
    return mergeParts([
        profile(hull, 1.3, 2.2, white),
        profile(hull, 1.3, -2.2, white),
        profile(body, 5.8, 0, blue),
        profile(stripe, 0.08, 2.94, yellow),
        profile(stripe, 0.08, -2.94, yellow),
        profile(sweep, 0.08, 2.94, yellow),
        profile(sweep, 0.08, -2.94, yellow),
        profile(cabin, 5.4, 0, blue),
        profile(windows, 0.06, 2.73, glass),
        profile(windows, 0.06, -2.73, glass),
        box(15.4, 0.25, 5.6, -2.7, 4.03, 0, white), // roof
        profile(wheelhouse, 3, 0, white),
        profile(bridgeGlass, 3.06, 0, glass),
        box(0.12, 1.6, 0.12, 2, 5.9, 0, white), // mast
        box(0.12, 0.08, 1.4, 2, 6.55, 0, white), // radar bar
    ]);
}

function Ferry({ still }: { still: boolean }) {
    const ref = useRef<Group>(null);
    const t = useRef(DOCKED); // start at the pier, so the first frame shows a docked ferry
    const geo = useMemo(() => cityCat(), []);
    useFrame((_, dt) => {
        if (!ref.current) return;
        if (!still) t.current = (t.current + dt) % CYCLE;
        ref.current.position.set(ferryX(still ? DOCKED : t.current), -0.35, FERRY_LANE_Z);
    });
    return (
        <group ref={ref}>
            <mesh geometry={geo} raycast={() => null}>
                <meshBasicMaterial vertexColors />
            </mesh>
        </group>
    );
}

function ferryX(t: number): number {
    const dock = PIER.x + PIER.w / 2 + 12.4; // stern alongside the pier's east side
    if (t < 8) return lerp(-60, dock, smooth(t / 8)); // arriving
    if (t < 16) return dock; // at the pier
    if (t < 26) return lerp(dock, 60, smooth((t - 16) / 10)); // leaving
    return 60; // off-stage until the next crossing
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (k: number) => k * k * (3 - 2 * k);

/* ---------------------------------------------------------------- crane, arcade, glass */

const JIB_BOXES: BoxSpec[] = [
    box([3.5, 0, 0], [13, 0.6, 0.6], CRANE_YELLOW),
    box([-3.5, -0.4, 0], [1.6, 1, 1], PALETTE.slate),
    box([0, 0.6, 0], [1.2, 1, 1.2], PALETTE.white),
    box([8.5, -2.5, 0], [0.06, 5, 0.06], PALETTE.slate),
];

function CraneJib({ still }: { still: boolean }) {
    const ref = useRef<Group>(null);
    const geo = useMemo(() => mergeBoxes(JIB_BOXES), []);
    useFrame((_, dt) => {
        if (ref.current && !still) ref.current.rotation.y += dt * 0.12;
    });
    return (
        <group ref={ref} position={[CRANE.x, CRANE.height + 0.3, CRANE.z]}>
            <mesh geometry={geo} raycast={() => null}>
                <meshBasicMaterial vertexColors />
            </mesh>
        </group>
    );
}

function Arcade({ still }: { still: boolean }) {
    const screen = useRef<MeshBasicMaterial>(null);
    const t = useRef(0);
    const base = useMemo(() => new Color("#38bdf8"), []);
    const geo = useMemo(() => shadedBox(0.7, 0.55, 0.05), []);
    useFrame((_, dt) => {
        if (!screen.current) return;
        t.current += still ? 0 : dt;
        // A soft flicker, never a strobe: brightness wanders between 84 % and 100 %.
        screen.current.color.copy(base).multiplyScalar(0.92 + 0.08 * Math.sin(t.current * 7) * Math.sin(t.current * 2.3));
    });
    return (
        <mesh geometry={geo} position={[ARCADE.x, 1.35, ARCADE.z + 0.42]} raycast={() => null}>
            <meshBasicMaterial ref={screen} color={base} />
        </mesh>
    );
}

function Glass({ at, size }: { at: BoxSpec["at"]; size: BoxSpec["size"] }) {
    const [w, h, d] = size;
    const geo = useMemo(() => shadedBox(w, h, d), [w, h, d]);
    return (
        <mesh geometry={geo} position={at} raycast={() => null}>
            <meshBasicMaterial vertexColors color="#dfe8f0" transparent opacity={0.85} />
        </mesh>
    );
}

/** The racquet: a handle and an oval head, leaning on the fence's sunny side. */
function Racquet() {
    const handle = useMemo(() => shadedBox(0.05, 0.36, 0.05), []);
    return (
        <group position={[RACQUET.x, 0, RACQUET.z]} rotation-z={0.3} scale={1.3}>
            <mesh geometry={handle} position={[0, 0.18, 0]} raycast={() => null}>
                <meshBasicMaterial vertexColors color={PALETTE.slate} />
            </mesh>
            <mesh position={[0, 0.56, 0]} rotation-y={Math.PI / 2} scale={[1, 1.3, 1]} raycast={() => null}>
                <torusGeometry args={[0.14, 0.022, 6, 18]} />
                <meshBasicMaterial color="#e11d48" />
            </mesh>
        </group>
    );
}
