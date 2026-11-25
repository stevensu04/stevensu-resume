"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, MeshBasicMaterial, type BufferGeometry, type Group, type Vector3 } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";
import { PALETTE } from "./Props";
import { RING } from "../zones";

/**
 * Brisbane Metro on the ring road (Steven's request, alongside the CityCat on the river), after his
 * photo: a dark bi-articulated bus with a white skirt under a blue line, a thin gold roofline,
 * silver bellows, white doors striped yellow and black, and the yellow dotted wave along each side.
 * A city's transit, like the CityCat and Taipei 101, not a brand (§4 rule 4). The "Brisbane Metro"
 * lettering is a plain blue panel.
 *
 * Two buses run the ring that the north street, the south street and the two connectors make
 * (zones.ts `RING`), one each way, driving on the left as Brisbane does: bus A goes clockwise in the
 * outer lane, bus B anticlockwise in the inner lane. Each stops at a shelter on both streets, pulling
 * in with its front door at the shelter, and waits for Steven if he is in its lane ahead. The three
 * cars follow the road separately, so the bus bends round the corners instead of swinging wide.
 * Under reduced motion each stands at its first stop.
 */

/** Lane centres are this far either side of a road's centreline, and the corners are this round. */
const LANE = 1.7;
const BEND = { a: 6.5, b: 3.5 };

/** Rear to front: the long car carries the cab. */
const CARS = [3.8, 4.4, 8];
const BELLOWS = 0.9;
const TOTAL = CARS.reduce((a, b) => a + b, 0) + BELLOWS * (CARS.length - 1);
const NOSE = TOTAL / 2;
/** The front door, measured back from the nose. */
const FRONT_DOOR = 1.3;
const CRUISE = 8;
const ACCEL = 3;
const DWELL = 4;

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

/* ---------------------------------------------------------------- the route */

type Pt = [number, number];
type Segment = { len: number; at: (s: number) => { x: number; z: number; hx: number; hz: number } };

/**
 * A closed route through `way` (a rectangle's corners, walked in order), with each corner rounded by a
 * quarter circle of radius r. Returns the segments and the total length.
 */
function route(way: Pt[], r: number): { segments: Segment[]; length: number } {
    const n = way.length;
    const dir = (i: number): Pt => {
        const [ax, az] = way[i];
        const [bx, bz] = way[(i + 1) % n];
        const l = Math.hypot(bx - ax, bz - az);
        return [(bx - ax) / l, (bz - az) / l];
    };
    const segments: Segment[] = [];
    for (let i = 0; i < n; i++) {
        const d = dir(i);
        const [ax, az] = way[i];
        const [bx, bz] = way[(i + 1) % n];
        // The straight run, trimmed by r at both ends.
        const x0 = ax + d[0] * r;
        const z0 = az + d[1] * r;
        const len = Math.hypot(bx - ax, bz - az) - 2 * r;
        segments.push({ len, at: (s) => ({ x: x0 + d[0] * s, z: z0 + d[1] * s, hx: d[0], hz: d[1] }) });
        // The arc at the next corner, from heading d to the heading after it.
        const dOut = dir((i + 1) % n);
        const cx = bx - d[0] * r + dOut[0] * r;
        const cz = bz - d[1] * r + dOut[1] * r;
        const a: Pt = [-dOut[0], -dOut[1]];
        const b: Pt = d;
        segments.push({
            len: (Math.PI / 2) * r,
            at: (s) => {
                const t = (s / ((Math.PI / 2) * r)) * (Math.PI / 2);
                const c = Math.cos(t);
                const sn = Math.sin(t);
                return {
                    x: cx + r * (a[0] * c + b[0] * sn),
                    z: cz + r * (a[1] * c + b[1] * sn),
                    hx: -a[0] * sn + b[0] * c,
                    hz: -a[1] * sn + b[1] * c,
                };
            },
        });
    }
    return { segments, length: segments.reduce((sum, s) => sum + s.len, 0) };
}

type Pose = { x: number; z: number; hx: number; hz: number };
type Route = ReturnType<typeof route> & { place: (u: number) => Pose };

function makeRoute(way: Pt[], r: number): Route {
    const base = route(way, r);
    return {
        ...base,
        place: (u) => {
            let s = ((u % base.length) + base.length) % base.length;
            for (const seg of base.segments) {
                if (s <= seg.len) return seg.at(s);
                s -= seg.len;
            }
            return base.segments[0].at(0);
        },
    };
}

const { west, east, north, south } = RING;
/** Bus A: clockwise, in the outer lanes (the left-hand side of the road for it). */
const ROUTE_A = makeRoute(
    [
        [west - LANE, north - LANE],
        [east + LANE, north - LANE],
        [east + LANE, south + LANE],
        [west - LANE, south + LANE],
    ],
    BEND.a,
);
/** Bus B: anticlockwise, in the inner lanes. */
const ROUTE_B = makeRoute(
    [
        [east - LANE, north + LANE],
        [west + LANE, north + LANE],
        [west + LANE, south - LANE],
        [east - LANE, south - LANE],
    ],
    BEND.b,
);

/**
 * A shelter at each stop, facing the road. `face` is +1 when the road is to its south (+z), −1 when
 * it is to its north. The two on the north street stood alone before the ring; the two on the night
 * street are new.
 */
const SHELTERS = [
    { x: -14, z: north - 5.3, face: 1 }, // north street, eastbound: bus A
    { x: -20, z: north + 5.3, face: -1 }, // north street, westbound: bus B
    { x: 6, z: south - 5.3, face: 1 }, // night street, eastbound: bus B
    { x: 16, z: south + 5.3, face: -1 }, // night street, westbound: bus A
];

/** The distance along a route at which the front door of the bus meets a shelter. */
function stopAt(route: Route, shelter: (typeof SHELTERS)[number]): number {
    let best = 0;
    let bestD = Infinity;
    for (let u = 0; u < route.length; u += 0.1) {
        const p = route.place(u + NOSE - FRONT_DOOR);
        const d = Math.hypot(p.x - shelter.x, p.z - shelter.z);
        if (d < bestD) [best, bestD] = [u, d];
    }
    return best;
}

const BUSES = [
    { route: ROUTE_A, stops: [SHELTERS[0], SHELTERS[3]] },
    { route: ROUTE_B, stops: [SHELTERS[1], SHELTERS[2]] },
].map(({ route, stops }) => ({ route, stopAt: stops.map((s) => stopAt(route, s)).sort((a, b) => a - b) }));

/* ---------------------------------------------------------------- the bus */

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

/**
 * Three cars and two bellows, each its own geometry centred on itself, nose towards +x. `offset` is how
 * far ahead of the whole bus's centre each piece's centre sits, so a piece can be placed on the route
 * at (the bus's distance + its offset) and follow the road on its own.
 */
function busPieces(): { geometry: BufferGeometry; offset: number }[] {
    const cars: BufferGeometry[][] = CARS.map(() => []);
    const bellows: BufferGeometry[][] = CARS.slice(1).map(() => []);
    const centres: number[] = [];
    const bellowsCentres: number[] = [];
    let x = -TOTAL / 2;
    CARS.forEach((len, i) => {
        const cx = x + len / 2;
        centres.push(cx);
        const parts = cars[i];
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
            const b = bellows[i];
            bellowsCentres.push(x + BELLOWS / 2);
            b.push(box(BELLOWS, 2.6, 2.34, x + BELLOWS / 2, 1.75, 0, METRO.bellows));
            for (let r = 0.12; r < BELLOWS; r += 0.16) b.push(box(0.04, 2.6, 2.36, x + r, 1.75, 0, METRO.rib));
            x += BELLOWS;
        }
    });
    // The nose, on the front car: dark glass, the blue band low down, a sign panel and headlights.
    const front = cars[CARS.length - 1];
    front.push(box(0.08, 1.6, 2.3, NOSE + 0.03, 2.05, 0, METRO.glass));
    front.push(box(0.09, 0.14, 2.4, NOSE + 0.04, 0.9, 0, METRO.blue));
    front.push(box(0.09, 0.28, 1.7, NOSE + 0.04, 2.95, 0, "#f0a92e"));
    for (const z of [-0.95, 0.95]) front.push(box(0.08, 0.16, 0.36, NOSE + 0.05, 0.62, z, "#fff6d8"));
    // The "Brisbane Metro" panel behind the front door, on both sides.
    for (const side of [-1, 1]) front.push(box(2, 0.32, 0.03, NOSE - 3.4, 2.15, side * 1.275, METRO.blue));

    const pieces: { geometry: BufferGeometry; offset: number }[] = [];
    cars.forEach((parts, i) => pieces.push({ geometry: mergeParts(parts).translate(-centres[i], 0, 0), offset: centres[i] }));
    bellows.forEach((parts, i) => pieces.push({ geometry: mergeParts(parts).translate(-bellowsCentres[i], 0, 0), offset: bellowsCentres[i] }));
    return pieces;
}

/** A shelter at each stop, with a bench and a bus-stop sign. */
function shelterGeometry(): BufferGeometry {
    return mergeParts(
        SHELTERS.flatMap(({ x, z, face }) => [
            box(3, 0.12, 1.2, x, 2.5, z, PALETTE.slate),
            box(2.9, 2.1, 0.06, x, 1.4, z - face * 0.55, "#9fc4e8"),
            box(0.1, 2.5, 0.1, x - 1.4, 1.25, z - face * 0.5, PALETTE.slate),
            box(0.1, 2.5, 0.1, x + 1.4, 1.25, z - face * 0.5, PALETTE.slate),
            box(2.2, 0.1, 0.45, x, 0.5, z - face * 0.25, PALETTE.wood),
            box(0.08, 2.6, 0.08, x + 2, 1.3, z + face * 0.4, PALETTE.slate),
            box(0.5, 0.6, 0.06, x + 2, 2.5, z + face * 0.4, "#3fbf6a"),
        ]),
    );
}

/* ---------------------------------------------------------------- driving */

type BusState = { u: number; v: number; dwell: number; served: number };

export default function Transit({ still, player }: { still: boolean; player: RefObject<Vector3> }) {
    const pieces = useMemo(() => busPieces(), []);
    const shelters = useMemo(() => shelterGeometry(), []);
    const material = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    // One group per piece per bus, moved every frame.
    const groups = useRef<(Group | null)[][]>(BUSES.map(() => []));
    const states = useRef<BusState[]>(BUSES.map((b) => ({ u: b.stopAt[0], v: 0, dwell: 1.5, served: 1 })));

    useFrame((_, rawDt) => {
        const dt = Math.min(rawDt, 0.1);
        BUSES.forEach((bus, bi) => {
            const st = states.current[bi];
            if (!still) {
                if (st.dwell > 0) {
                    st.dwell -= dt;
                    st.v = 0;
                } else {
                    // Brake for the next stop, and for Steven if he is in the lane ahead.
                    const next = bus.stopAt[st.served];
                    const toStop = (next - st.u + bus.route.length) % bus.route.length;
                    let room = toStop;
                    const p = player.current;
                    if (p) {
                        const nose = bus.route.place(st.u + NOSE);
                        const ahead = (p.x - nose.x) * nose.hx + (p.z - nose.z) * nose.hz;
                        const aside = Math.abs((p.x - nose.x) * nose.hz - (p.z - nose.z) * nose.hx);
                        if (aside < 2 && ahead > -NOSE && ahead < 10) room = Math.min(room, Math.max(0, ahead - 1.5));
                    }
                    const target = Math.min(CRUISE, Math.sqrt(2 * ACCEL * Math.max(0, room)));
                    st.v = st.v < target ? Math.min(target, st.v + ACCEL * dt) : target;
                    const step = Math.min(st.v * dt, toStop);
                    st.u = (st.u + step) % bus.route.length;
                    if (toStop - step < 0.05) {
                        st.u = next;
                        st.dwell = DWELL;
                        st.served = (st.served + 1) % bus.stopAt.length;
                    }
                }
            }
            pieces.forEach(({ offset }, pi) => {
                const g = groups.current[bi][pi];
                if (!g) return;
                const at = bus.route.place(st.u + offset);
                g.position.set(at.x, 0, at.z);
                // The bus's nose is +x; rotating by θ about y turns +x towards (cos θ, −sin θ).
                g.rotation.y = Math.atan2(-at.hz, at.hx);
            });
        });
    });

    return (
        <>
            {BUSES.map((_, bi) =>
                pieces.map(({ geometry }, pi) => (
                    <group
                        key={`${bi}-${pi}`}
                        ref={(g) => {
                            groups.current[bi][pi] = g;
                        }}
                    >
                        <mesh geometry={geometry} material={material} raycast={() => null} />
                    </group>
                )),
            )}
            <mesh geometry={shelters} material={material} raycast={() => null} />
        </>
    );
}
