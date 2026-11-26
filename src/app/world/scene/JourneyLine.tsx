"use client";

import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, ShaderMaterial, type Mesh } from "three";
import { OBJECTS, TOUR, objectStandPoint } from "../objects";
import { TERMINAL } from "../placements";
import { findPath, type Nav } from "./nav";

/**
 * The career-journey line (WORLD2.md §5 and Phase 4, from Steven's own list: "a route from Taipei to
 * Brisbane linking the bank, the change of career, UQ, the internship and the software work"). During
 * the quick tour a soft gold line draws itself from Taipei's shore, across the water to the ferry
 * terminal, then on to each stop in turn as the tour reaches it.
 *
 * It's routed by the walk grid's own pathfinder (nav.ts), so it follows the ground Steven can walk and
 * never cuts through a building. It is only shown while the tour runs; it fades out when the tour ends.
 * Under reduced motion it jumps from stop to stop and the dashes stand still.
 */
const WIDTH = 1.2;
/** Module-level, like worldUniforms, so the frame loop can drive them. */
const uniforms = {
    uProgress: { value: 0 },
    uOpacity: { value: 0 },
    uTime: { value: 0 },
    uColor: { value: new Color("#ffb627") },
    fogColor: { value: new Color() },
    fogNear: { value: 1e4 },
    fogFar: { value: 2e4 },
};
const LAND_Y = 0.08;
const WATER_Y = 0.3;

const VERT = /* glsl */ `
attribute float along;
varying float vAlong;
#include <common>
#include <fog_pars_vertex>
void main() {
    vAlong = along;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
}`;
const FRAG = /* glsl */ `
uniform float uProgress;
uniform float uOpacity;
uniform float uTime;
uniform vec3 uColor;
varying float vAlong;
#include <common>
#include <fog_pars_fragment>
void main() {
    if (vAlong > uProgress) discard;
    // Dashes flowing forward, and a brighter head where the line is drawing.
    float dash = step(0.45, fract(vAlong * 0.32 - uTime * 0.7));
    float head = smoothstep(uProgress - 6.0, uProgress, vAlong);
    vec3 col = mix(uColor, vec3(1.0, 0.97, 0.88), dash * 0.35 + head * 0.4);
    // Softer at the edges of the strip, so it reads as a glowing trail rather than tape.
    gl_FragColor = vec4(col, uOpacity * (0.78 + 0.22 * dash) * (0.9 + 0.1 * head));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
}`;

export default function JourneyLine({ navRef, active, stop, still }: { navRef: RefObject<Nav | null>; active: boolean; stop: number; still: boolean }) {
    const [built, setBuilt] = useState<{ geometry: BufferGeometry; stops: number[] } | null>(null);
    const material = useMemo(
        () =>
            new ShaderMaterial({
                vertexShader: VERT,
                fragmentShader: FRAG,
                uniforms,
                transparent: true,
                depthWrite: false,
                side: DoubleSide,
                fog: true,
                polygonOffset: true,
                polygonOffsetFactor: -2,
            }),
        [],
    );
    const progress = useRef(0);
    const mesh = useRef<Mesh>(null);

    useFrame((_, delta) => {
        // Built once, as soon as the walk grid exists (Stage fills it after the kit loads).
        if (!built && navRef.current) setBuilt(build(navRef.current));
        if (!built) return;
        const u = uniforms;
        const dt = Math.min(delta, 0.1);
        const goal = active ? built.stops[Math.min(stop, built.stops.length - 1)] : progress.current;
        progress.current = still ? goal : progress.current + (goal - progress.current) * Math.min(1, dt * 1.6);
        u.uProgress.value = progress.current;
        u.uOpacity.value += ((active ? 1 : 0) - u.uOpacity.value) * (still ? 1 : Math.min(1, dt * 3));
        if (!active && u.uOpacity.value < 0.01) progress.current = 0;
        // Hidden outright when it isn't showing, so it costs no draw call outside the tour.
        if (mesh.current) mesh.current.visible = u.uOpacity.value > 0.005;
        if (!still) u.uTime.value += dt;
    });

    if (!built) return null;
    return <mesh ref={mesh} geometry={built.geometry} material={material} renderOrder={2} visible={false} raycast={() => null} />;
}

/** The route as a ribbon with distance-along on every vertex, and the distance at each tour stop. */
function build(nav: Nav): { geometry: BufferGeometry; stops: number[] } {
    const pontoon: [number, number] = [(TERMINAL.pontoon.minX + TERMINAL.pontoon.maxX) / 2, (TERMINAL.pontoon.minZ + TERMINAL.pontoon.maxZ) / 2];
    // Taipei's shore, straight across the water from the terminal.
    const points: [number, number, number][] = [
        [pontoon[0], WATER_Y, -44.6],
        [pontoon[0], WATER_Y, pontoon[1]],
    ];
    const stops: number[] = [];
    let length = Math.abs(-44.6 - pontoon[1]);
    let [x, z] = pontoon;
    const byId = new Map(OBJECTS.map((o) => [o.id, o]));
    for (const id of TOUR) {
        const object = byId.get(id);
        if (!object) continue;
        const [tx, tz] = objectStandPoint(object);
        for (const [wx, wz] of findPath(nav, x, z, tx, tz)) {
            length += Math.hypot(wx - x, wz - z);
            // Over the water and the terminal it floats a little higher than on land.
            points.push([wx, wz < -23.2 ? WATER_Y : LAND_Y, wz]);
            [x, z] = [wx, wz];
        }
        stops.push(length);
    }
    // A strip: each point offset either side along the averaged direction, so corners join cleanly.
    const pos: number[] = [];
    const along: number[] = [];
    let d = 0;
    for (let i = 0; i < points.length; i++) {
        const [px, py, pz] = points[i];
        if (i > 0) d += Math.hypot(px - points[i - 1][0], pz - points[i - 1][2]);
        const a = points[Math.max(i - 1, 0)];
        const b = points[Math.min(i + 1, points.length - 1)];
        const tx = b[0] - a[0];
        const tz = b[2] - a[2];
        const len = Math.hypot(tx, tz) || 1;
        const nx = (-tz / len) * (WIDTH / 2);
        const nz = (tx / len) * (WIDTH / 2);
        pos.push(px + nx, py, pz + nz, px - nx, py, pz - nz);
        along.push(d, d);
    }
    const index: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
        const k = i * 2;
        index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    geometry.setAttribute("along", new BufferAttribute(new Float32Array(along), 1));
    geometry.setIndex(index);
    geometry.computeBoundingSphere();
    return { geometry, stops };
}
