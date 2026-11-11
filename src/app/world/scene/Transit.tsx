"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, MeshBasicMaterial, type BufferGeometry, type Group, type Vector3 } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";
import { PALETTE } from "./Props";
import { STREET } from "../zones";

/**
 * A Brisbane Metro on the street (Steven's request, alongside the CityCat on the river), after his
 * photo: a dark bi-articulated bus with a white skirt under a blue line, a thin gold roofline,
 * silver bellows, white doors striped yellow and black, and the yellow dotted wave along each side.
 * A city's transit, like the CityCat and Taipei 101, not a brand (§4 rule 4). The "Brisbane Metro"
 * lettering is a plain blue panel.
 *
 * It drives on the left: east in the north lane, west in the south lane, pulling in with its
 * front door at a shelter on each side. It waits for Steven if he is in its lane ahead, and it is
 * cut off past the table's edge instead of driving off into the air. Under reduced motion it
 * stands at the first stop.
 */

const LANE = { east: STREET.z - 1.7, west: STREET.z + 1.7 };
/** Off-stage at both ends: the bus turns round out of sight, beyond the slab. */
const END = 52;
const LENGTH = 2 * END;
const STOPS = [
    { x: -14, side: "east" as const },
    { x: -20, side: "west" as const },
];
/** Rear to front: the long car carries the cab. */
const CARS = [3.8, 4.4, 8];
const BELLOWS = 0.9;
const TOTAL = CARS.reduce((a, b) => a + b, 0) + BELLOWS * (CARS.length - 1);
const NOSE = TOTAL / 2;
/** The front door, measured back from the nose. */
const FRONT_DOOR = 1.3;
/** Distance along the loop (east pass, then west pass) at which the front door meets each shelter. */
const STOP_AT = STOPS.map(({ x, side }) =>
    side === "east" ? x - (NOSE - FRONT_DOOR) + END : LENGTH / 2 + (END - (x + (NOSE - FRONT_DOOR))),
);
const CRUISE = 8;
const ACCEL = 3;
const DWELL = 4;
const EDGE = 40;

const METRO = {
    body: "#1b2030",
    glass: "#2b3448",
    skirt: "#f1f2f4",
    blue: "#2456d6",
    gold: "#e8b923",
    roof: "#e6e8ec",
    bellows: "#b9bdc5",
    rib: "#8f949e",
    door: "#f4f4f4",
    stripe: "#f2c230",
    tyre: "#15171c",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** A white door with the yellow-and-black stripe down its middle, on one side (±1). */
function door(x: number, side: number): BufferGeometry[] {
    const z = side * 1.27;
    const parts = [box(1.25, 2.3, 0.04, x, 1.6, z, METRO.door), box(0.32, 2.1, 0.05, x, 1.6, z + side * 0.01, METRO.stripe)];
    for (let y = 0.75; y < 2.6; y += 0.32) parts.push(box(0.34, 0.07, 0.06, x, y, z + side * 0.015, METRO.body));
    return parts;
}

/** The dotted yellow wave along one side of a car. */
function wave(x0: number, len: number, side: number, phase: number): BufferGeometry[] {
    const parts: BufferGeometry[] = [];
    for (let t = 0.3; t < len - 0.3; t += 0.28) {
        const y = 1.75 + Math.sin(phase + (t / len) * Math.PI * 2.2) * 0.45;
        parts.push(box(0.09, 0.09, 0.03, x0 + t, y, side * 1.27, METRO.gold));
    }
    return parts;
}

/** Three cars and two bellows, nose towards +x, centred on the origin at road level. */
function busGeometry(): BufferGeometry {
    const parts: BufferGeometry[] = [];
    let x = -TOTAL / 2;
    CARS.forEach((len, i) => {
        const cx = x + len / 2;
        parts.push(box(len, 2.55, 2.5, cx, 1.83, 0, METRO.body));
        parts.push(box(len - 0.3, 1.15, 2.52, cx, 2.1, 0, METRO.glass));
        parts.push(box(len, 0.32, 2.52, cx, 0.5, 0, METRO.skirt));
        parts.push(box(len, 0.1, 2.53, cx, 0.71, 0, METRO.blue));
        parts.push(box(len, 0.06, 2.54, cx, 3.06, 0, METRO.gold));
        parts.push(box(len, 0.14, 2.4, cx, 3.17, 0, METRO.roof));
        for (const side of [-1, 1]) parts.push(...wave(x, len, side, i * 1.7));
        const front = i === CARS.length - 1;
        // Wheels: two axles on the front car, one on each of the others.
        const axles = front ? [cx - len * 0.32, cx + len * 0.3] : [cx - len * 0.1];
        for (const ax of axles) parts.push(box(1, 1, 2.56, ax, 0.5, 0, METRO.tyre));
        // Doors on both sides, as the Metro has them.
        const doors = front ? [x + len - FRONT_DOOR, cx - 0.6] : [cx + 0.4];
        for (const dx of doors) for (const side of [-1, 1]) parts.push(...door(dx, side));
        x += len;
        if (i < CARS.length - 1) {
            parts.push(box(BELLOWS, 2.6, 2.34, x + BELLOWS / 2, 1.75, 0, METRO.bellows));
            for (let r = 0.12; r < BELLOWS; r += 0.16) parts.push(box(0.04, 2.6, 2.36, x + r, 1.75, 0, METRO.rib));
            x += BELLOWS;
        }
    });
    // The nose: dark glass, the blue band low down, a sign panel and headlights.
    const nose = TOTAL / 2;
    parts.push(box(0.08, 1.6, 2.3, nose + 0.03, 2.05, 0, METRO.glass));
    parts.push(box(0.09, 0.14, 2.4, nose + 0.04, 0.9, 0, METRO.blue));
    parts.push(box(0.09, 0.28, 1.7, nose + 0.04, 2.95, 0, "#f0a92e"));
    for (const z of [-0.95, 0.95]) parts.push(box(0.08, 0.16, 0.36, nose + 0.05, 0.62, z, "#fff6d8"));
    // The "Brisbane Metro" panel behind the front door, on both sides.
    for (const side of [-1, 1]) parts.push(box(2, 0.32, 0.03, nose - 3.4, 2.15, side * 1.275, METRO.blue));
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
