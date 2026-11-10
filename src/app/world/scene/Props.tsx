"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, MeshBasicMaterial, PlaneGeometry, type Group, type ShaderMaterial } from "three";
import { withExplore } from "./explore";
import { PIER } from "../placements";
import { RIVER, SLAB } from "../zones";
import { mergeBoxes, shadedBox, type BoxSpec } from "./shading";

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
    const staticsMaterial = useMemo(() => withExplore(new MeshBasicMaterial({ vertexColors: true })), []);
    return (
        <>
            <mesh geometry={statics} material={staticsMaterial} raycast={() => null} />
            <River still={still} />
            <Ferry still={still} />
            <CraneJib still={still} />
            <Arcade still={still} />
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
    // 7 · The park: grass, the blueprint table, two plinths (their scale models are kit placements).
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
const FERRY_LANE_Z = -30;
const CYCLE = 30;
const DOCKED = 10;

/** A CityCat-ish catamaran, ~16 m: two hulls, a blue stripe, a cabin with a dark window band. */
const FERRY_BOXES: BoxSpec[] = [
    box([0, 0.25, -1], [16, 0.8, 1], PALETTE.white),
    box([0, 0.25, 1], [16, 0.8, 1], PALETTE.white),
    box([0, 0.85, 0], [15, 0.4, 3], PALETTE.accent),
    box([0.5, 1.75, 0], [10, 1.4, 2.6], PALETTE.white),
    box([0.5, 1.75, 0], [9.4, 0.5, 2.7], PALETTE.slate),
    box([0.5, 2.55, 0], [10.4, 0.2, 2.9], PALETTE.white),
];

function Ferry({ still }: { still: boolean }) {
    const ref = useRef<Group>(null);
    const t = useRef(DOCKED); // start at the pier, so the first frame shows a docked ferry
    const geo = useMemo(() => mergeBoxes(FERRY_BOXES), []);
    useFrame((_, dt) => {
        if (!ref.current) return;
        if (!still) t.current = (t.current + dt) % CYCLE;
        ref.current.position.set(ferryX(still ? DOCKED : t.current), -0.3, FERRY_LANE_Z);
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
    const dock = PIER.x + 9.5; // alongside the end of the pier
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
