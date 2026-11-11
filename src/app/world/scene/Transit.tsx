"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, MeshBasicMaterial, type BufferGeometry, type Group, type Vector3 } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";
import { PALETTE } from "./Props";
import { STREET } from "../zones";

/**
 * A Metro-style articulated bus on the street (Steven's request, alongside the CityCat on the
 * river). It drives on the left: east in the north lane, west in the south lane, pulling in at a
 * stop on each side. It waits for Steven if he is in its lane ahead, and it fades out past the
 * table's edge instead of driving off into the air. Under reduced motion it stands at the first stop.
 */

const LANE = { east: STREET.z - 1.7, west: STREET.z + 1.7 };
/** Off-stage at both ends: the bus turns round out of sight, beyond the slab. */
const END = 52;
const LENGTH = 2 * END;
const STOPS = [
    { x: -14, side: "east" as const },
    { x: -20, side: "west" as const },
];
/** Distance along the loop (east pass, then west pass) at which the bus's nose meets each stop. */
const NOSE = 9.3;
// The bus pulls up with its front doors at the shelter, a third of its length past it.
const STOP_AT = STOPS.map(({ x, side }) => (side === "east" ? x + END + NOSE / 3 : LENGTH / 2 + (END - x) + NOSE / 3));
const CRUISE = 8;
const ACCEL = 3;
const DWELL = 4;
const EDGE = 40;

const BODY = "#f4f4f2";
const GLASS = "#2a3446";
const LIVERY = "#0b6e8a";

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** Three cars and two bellows, nose towards +x, centred on the origin at road level. */
function busGeometry(): BufferGeometry {
    const cars = [6.2, 5.2, 6.2];
    const gap = 0.5;
    const total = cars.reduce((a, b) => a + b, 0) + gap * (cars.length - 1);
    const parts: BufferGeometry[] = [];
    let x = -total / 2;
    cars.forEach((len, i) => {
        const cx = x + len / 2;
        parts.push(box(len, 2.5, 2.5, cx, 1.7, 0, BODY));
        parts.push(box(len - 0.4, 1.1, 2.52, cx, 2.05, 0, GLASS));
        parts.push(box(len, 0.35, 2.52, cx, 0.65, 0, LIVERY));
        parts.push(box(len * 0.6, 0.3, 1.6, cx, 3.1, 0, PALETTE.concrete));
        for (const dx of [-0.3, 0.3]) parts.push(box(0.9, 0.9, 2.56, cx + dx * len, 0.45, 0, "#1d2027"));
        // Doors on the kerb side (−z for the east pass; the whole bus turns round for the west).
        parts.push(box(1.1, 2.1, 0.04, cx, 1.5, -1.27, "#c9ccd2"));
        x += len;
        if (i < cars.length - 1) {
            parts.push(box(gap, 2.3, 2.3, x + gap / 2, 1.65, 0, "#3a3f4a"));
            x += gap;
        }
    });
    const nose = total / 2;
    parts.push(box(0.06, 1.4, 2.3, nose + 0.02, 2.0, 0, GLASS));
    parts.push(box(0.07, 0.3, 1.6, nose + 0.03, 2.8, 0, "#f0a92e"));
    for (const z of [-0.9, 0.9]) parts.push(box(0.06, 0.18, 0.4, nose + 0.03, 0.85, z, "#fff6d8"));
    return mergeParts(parts);
}

/** A shelter at each stop, facing the road, with a bench and a bus-stop sign. */
function shelterGeometry(): BufferGeometry {
    return mergeParts(
        STOPS.flatMap(({ x, side }) => {
            const face = side === "east" ? 1 : -1; // towards the road
            const z = side === "east" ? STREET.z - 5.3 : STREET.z + 5.3;
            return [
                box(3, 0.12, 1.2, x, 2.5, z, PALETTE.slate),
                box(2.9, 2.1, 0.06, x, 1.4, z - face * 0.55, "#9fc4e8"),
                box(0.1, 2.5, 0.1, x - 1.4, 1.25, z - face * 0.5, PALETTE.slate),
                box(0.1, 2.5, 0.1, x + 1.4, 1.25, z - face * 0.5, PALETTE.slate),
                box(2.2, 0.1, 0.45, x, 0.5, z - face * 0.25, PALETTE.wood),
                box(0.08, 2.6, 0.08, x + 2, 1.3, z + face * 0.4, PALETTE.slate),
                box(0.5, 0.6, 0.06, x + 2, 2.5, z + face * 0.4, "#3fbf6a"),
            ];
        }),
    );
}

/** The world shader, plus a cut at the table's edge so the bus fades into the wings. */
function edgeCutMaterial(): MeshBasicMaterial {
    const material = withWorldShader(new MeshBasicMaterial({ vertexColors: true }));
    const base = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
        base.call(material, shader, renderer);
        shader.fragmentShader = shader.fragmentShader.replace(
            "#include <clipping_planes_fragment>",
            `#include <clipping_planes_fragment>\n    if (abs(vWorldXZ.x) > ${EDGE.toFixed(1)}) discard;`,
        );
    };
    material.customProgramCacheKey = () => "world-edge";
    return material;
}

/** Where on the loop `u` puts the bus: its centre and heading. */
function place(u: number): { x: number; z: number; rot: number } {
    return u < LENGTH / 2 ? { x: u - END, z: LANE.east, rot: 0 } : { x: END - (u - LENGTH / 2), z: LANE.west, rot: Math.PI };
}

export default function Transit({ still, player }: { still: boolean; player: RefObject<Vector3> }) {
    const busRef = useRef<Group>(null);
    const stateRef = useRef({ u: STOP_AT[0], v: 0, dwell: 1.5, served: 1 });
    const bus = useMemo(() => busGeometry(), []);
    const shelters = useMemo(() => shelterGeometry(), []);
    const busMat = useMemo(() => edgeCutMaterial(), []);
    const shelterMat = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);

    useFrame((_, rawDt) => {
        const g = busRef.current;
        if (!g) return;
        const st = stateRef.current;
        const dt = Math.min(rawDt, 0.1);
        if (!still) {
            if (st.dwell > 0) {
                st.dwell -= dt;
                st.v = 0;
            } else {
                // Brake for the next stop, and for Steven if he is in the lane ahead.
                const next = STOP_AT[st.served];
                const toStop = (next - st.u + LENGTH) % LENGTH;
                let room = toStop;
                const here = place(st.u);
                const p = player.current;
                if (p) {
                    const dir = here.rot === 0 ? 1 : -1;
                    const ahead = (p.x - here.x) * dir - NOSE;
                    if (Math.abs(p.z - here.z) < 2 && ahead > -NOSE && ahead < 10) room = Math.min(room, Math.max(0, ahead - 1.5));
                }
                const target = Math.min(CRUISE, Math.sqrt(2 * ACCEL * Math.max(0, room)));
                st.v = st.v < target ? Math.min(target, st.v + ACCEL * dt) : target;
                const step = Math.min(st.v * dt, toStop);
                st.u = (st.u + step) % LENGTH;
                if (toStop - step < 0.05) {
                    st.u = next;
                    st.dwell = DWELL;
                    st.served = (st.served + 1) % STOPS.length;
                }
            }
        }
        const at = place(st.u);
        g.position.set(at.x, 0, at.z);
        g.rotation.y = at.rot;
    });

    return (
        <>
            <group ref={busRef}>
                <mesh geometry={bus} material={busMat} raycast={() => null} />
            </group>
            <mesh geometry={shelters} material={shelterMat} raycast={() => null} />
        </>
    );
}
