"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CanvasTexture, PlaneGeometry, Box3, SRGBColorSpace, BoxGeometry, MeshLambertMaterial, type BufferGeometry, type Group, Vector3, MeshBasicMaterial, type BufferAttribute, Matrix4, Quaternion, type InstancedMesh } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";
import { PALETTE } from "./Props";
import { nearestFree, type Nav } from "./nav";
import { BUS_FLOOR, type RideInfo, type RideState } from "./ride";
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
 *
 * Steven can ride (ride.ts): a bus standing at a stop offers its front door to anyone within a few
 * metres, waits a little for someone walking up, and once he boards it carries him on its normal
 * round with the camera inside. The inside is part of each car's geometry (floor, seats, poles, open
 * windows): from outside the shell hides it, from inside the shell's back faces are culled, so the
 * same boxes serve both.
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
    { x: -14, z: north - 5.3, face: 1, name: "North Street · UQ corner" }, // eastbound: bus A
    { x: -20, z: north + 5.3, face: -1, name: "North Street · Open-source shed" }, // westbound: bus B
    { x: 6, z: south - 5.3, face: 1, name: "Night Street · Seoul Garden" }, // eastbound: bus B
    { x: 16, z: south + 5.3, face: -1, name: "Night Street · D.W. Steakhouse" }, // westbound: bus A
];
type Shelter = (typeof SHELTERS)[number];

/** The distance along a route at which the front door of the bus meets a shelter. */
function stopAt(route: Route, shelter: Shelter): number {
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
].map(({ route, stops }) => ({
    route,
    // In the order the bus reaches them, each with the shelter it serves.
    stops: stops.map((shelter) => ({ at: stopAt(route, shelter), shelter })).sort((a, b) => a.at - b.at),
}));

/**
 * Where he steps down: on the footpath in front of the shelter, then moved to the nearest cell he can
 * actually stand on. The shelter and the buildings round it are solid in the walk grid, so the spot
 * in front of the roof can be blocked; landing on a blocked cell would leave him unable to take a step.
 */
function alightPoint(shelter: Shelter, nav: Nav | null): [number, number] {
    const x = shelter.x - 0.3;
    const z = shelter.z + shelter.face * 1.4; // 2.2 m from the lane, so the bus doesn't wait for him
    return (nav && nearestFree(nav, x, z)) || [x, z];
}

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
 * The Metro's inside, after Steven's photo: a charcoal floor with yellow lines at the doors, a silver
 * ceiling under tube lights, thick yellow poles and overhead rails with hanging straps, high-backed
 * black seats on black plinths (the priority seats by the doors in blue and red moquette), pale walls
 * with dark window pillars, a route screen hanging in the aisle, red EXIT signs and pink card readers.
 * The ceiling and lights are lamp colours (shading.ts), so they stay lit: a ceiling only ever sees
 * the green ground's bounce light, and the real one is bright.
 */
const INSIDE = {
    wall: "#cfd3d8",
    pillar: "#4a4e56",
    floor: "#2c2f35",
    ceiling: "#d9dde2",
    tube: "#fbfdff",
    seat: "#30343b",
    back: "#272a30",
    plinth: "#1f2227",
    blueSeat: "#34408f",
    redBack: "#8f2f48",
    pole: "#f2c41a",
    strap: "#3a3d44",
    line: "#e8c230",
    red: "#a8322d",
    exit: "#d9382f",
    reader: "#c2409b",
    screen: "#12151a",
    cyan: "#2fb5e8",
    cab: "#2b2f3a",
};

/** The runs of [a, b] left once each doorway (its centre ± half) is cut out. */
function spans(a: number, b: number, doors: number[], half: number): [number, number][] {
    const out: [number, number][] = [];
    let at = a;
    for (const d of [...doors].sort((p, q) => p - q)) {
        if (d - half > at) out.push([at, d - half]);
        at = Math.max(at, d + half);
    }
    if (b > at) out.push([at, b]);
    return out;
}

/** The route screen hanging in each car's aisle: size and height, metres. Big enough to read from the far end of the car. */
const SCREEN = { w: 1.5, h: 0.5, y: 2.68 };
/** How far ahead of a car's centre its screen hangs: between the doorways, 3 m from where Steven stands, and the screen's text canvas. */
const SCREEN_X = 0.9;
const CANVAS = { w: 768, h: 256 };

type ScreenText = { header: string; street: string; place: string; stops: string[]; at: number };

/**
 * The next-stop display, as the Metro's own: a cyan header saying what the bus is doing, the stop's
 * street in small type and its landmark in large, and a line of dots for the bus's stops with the
 * current one lit. Drawn only when the text changes (Transit's frame loop), never per frame.
 */
function drawScreen(ctx: CanvasRenderingContext2D, t: ScreenText) {
    const { w, h } = CANVAS;
    ctx.fillStyle = "#12151a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2fb5e8";
    ctx.fillRect(0, 0, w, 64);
    ctx.fillStyle = "#06222e";
    ctx.font = "700 40px system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(t.header, 24, 34);
    ctx.textAlign = "right";
    ctx.font = "600 30px system-ui, sans-serif";
    ctx.fillText("Brisbane Metro", w - 24, 34);
    ctx.textAlign = "left";
    ctx.fillStyle = "#9fb0bd";
    ctx.font = "600 34px system-ui, sans-serif";
    ctx.fillText(t.street, 28, 102);
    // The landmark: as large as fits.
    let size = 68;
    ctx.fillStyle = "#ffffff";
    do ctx.font = `700 ${size}px system-ui, sans-serif`;
    while (ctx.measureText(t.place).width > w - 56 && (size -= 4) > 28);
    ctx.fillText(t.place, 28, 158);
    // The stops: a line with a dot each, the current one filled in cyan.
    const x0 = 60;
    const x1 = w - 60;
    ctx.strokeStyle = "#4b5563";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x0, 218);
    ctx.lineTo(x1, 218);
    ctx.stroke();
    t.stops.forEach((_, i) => {
        const x = t.stops.length > 1 ? x0 + ((x1 - x0) * i) / (t.stops.length - 1) : (x0 + x1) / 2;
        ctx.beginPath();
        ctx.arc(x, 218, i === t.at ? 16 : 11, 0, Math.PI * 2);
        ctx.fillStyle = i === t.at ? "#2fb5e8" : "#e5e7eb";
        ctx.fill();
    });
}

/** Everything a rider sees inside one car (centre cx, length len, doorways at `doors`, front car or not). All of it sits inside the shell, so it is invisible from out. */
function interior(cx: number, len: number, doors: number[], front: boolean): BufferGeometry[] {
    // The floor sits above the shell's blue stripe, and a ceiling just under its gold roofline: both of
    // those are full-width boxes whose inner faces would otherwise show.
    const F = BUS_FLOOR;
    const parts: BufferGeometry[] = [box(len, 0.04, 2.3, cx, F - 0.02, 0, INSIDE.floor), box(len, 0.02, 2.3, cx, 3.0, 0, INSIDE.ceiling)];
    const start = cx - len / 2;
    const end = cx + len / 2;
    for (const side of [-1, 1]) {
        for (const [a, b] of spans(start + 0.05, end - 0.05, doors, 0.75)) {
            const m = (a + b) / 2;
            parts.push(box(b - a, 0.85, 0.05, m, 1.1, side * 1.19, INSIDE.wall));
            parts.push(box(b - a, 0.32, 0.05, m, 2.85, side * 1.19, INSIDE.wall));
            for (let x = a + 1.4; x < b - 0.3; x += 1.5) parts.push(box(0.06, 1.2, 0.05, x, 2.1, side * 1.19, INSIDE.pillar));
            for (let x = a + 0.4; x < b - 0.3; x += 0.62) {
                // The seats nearest a doorway are the priority ones.
                const priority = doors.some((d) => Math.abs(d - x) < 1.6);
                parts.push(box(0.5, 0.4, 0.42, x, F + 0.2, side * 0.95, INSIDE.plinth));
                parts.push(box(0.5, 0.08, 0.46, x, F + 0.44, side * 0.95, priority ? INSIDE.blueSeat : INSIDE.seat));
                parts.push(box(0.5, 0.56, 0.07, x, F + 0.76, side * 1.12, priority ? INSIDE.redBack : INSIDE.back));
            }
        }
        // The rail overhead, with a strap hanging every metre or so, and a tube light along the ceiling.
        parts.push(box(len - 0.6, 0.06, 0.06, cx, 2.9, side * 0.62, INSIDE.pole));
        for (let x = start + 0.9; x < end - 0.5; x += 1.1) parts.push(box(0.02, 0.2, 0.05, x, 2.77, side * 0.62, INSIDE.strap));
        parts.push(box(len - 1, 0.03, 0.14, cx, 2.985, side * 0.45, INSIDE.tube));
        for (let x = start + 1.2; x < end - 0.6; x += 2.2) {
            if (doors.every((d) => Math.abs(d - x) > 0.9)) parts.push(box(0.07, 2.1, 0.07, x, F + 1.05, side * 0.62, INSIDE.pole));
        }
        for (const d of doors) {
            // A pole each side of the doorway with the pink card reader on it, a red EXIT over it, and
            // the yellow lines across the floor.
            for (const o of [-0.85, 0.85]) {
                parts.push(box(0.07, 2.1, 0.07, d + o, F + 1.05, side * 0.62, INSIDE.pole));
                if (o > 0) parts.push(box(0.14, 0.22, 0.05, d + o, 1.55, side * 0.62 - side * 0.05, INSIDE.reader));
            }
            parts.push(box(0.5, 0.16, 0.04, d, 2.8, side * 1.17, INSIDE.exit));
        }
    }
    for (const d of doors) for (const o of [-0.78, 0.78]) parts.push(box(0.07, 0.012, 2.2, d + o, F + 0.006, 0, INSIDE.line));
    // The red "no standing" patch by the front door, and the route screen hanging in the aisle: dark,
    // a cyan header and a dotted line of stops, readable from both ends of the car.
    if (front) parts.push(box(1.1, 0.012, 0.8, doors[0] - 0.1, F + 0.006, 0.55, INSIDE.red));
    // The front car's face is the live next-stop display (`Screen` below, drawn on a canvas); the
    // other cars carry the static route diagram.
    const sx = cx + SCREEN_X;
    parts.push(box(0.06, SCREEN.h, SCREEN.w, sx, SCREEN.y, 0, INSIDE.screen));
    if (!front) {
        parts.push(box(0.075, 0.06, SCREEN.w - 0.06, sx, SCREEN.y + 0.19, 0, INSIDE.cyan));
        for (let k = 0; k < 8; k++) parts.push(box(0.075, 0.06, 0.07, sx, SCREEN.y - 0.08 + (k % 2) * 0.08, -0.55 + k * 0.157, INSIDE.tube));
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
        // Each wheel is two arches, one per side, not a block across the car, so the floor stays clear inside.
        for (const ax of axles) for (const side of [-1, 1]) parts.push(box(1, 1, 0.22, ax, 0.5, side * 1.17, METRO.tyre));
        // Doors on both sides, as the Metro has them.
        const doors = front ? [x + len - FRONT_DOOR, cx - 0.6] : [cx + 0.4];
        for (const dx of doors) for (const side of [-1, 1]) parts.push(...door(dx, side));
        parts.push(...interior(cx, len, doors, front));
        if (i === 0) parts.push(box(0.06, 2.3, 2.3, cx - len / 2 + 0.05, 1.85, 0, INSIDE.wall)); // the rear wall
        x += len;
        if (i < CARS.length - 1) {
            const b = bellows[i];
            bellowsCentres.push(x + BELLOWS / 2);
            b.push(box(BELLOWS, 2.6, 2.34, x + BELLOWS / 2, 1.75, 0, METRO.bellows));
            for (let r = 0.12; r < BELLOWS; r += 0.16) b.push(box(0.04, 2.6, 2.36, x + r, 1.75, 0, METRO.rib));
            // Inside the bellows: a turntable floor and folded walls, so the passage between cars is closed.
            b.push(box(BELLOWS, 0.04, 2.0, x + BELLOWS / 2, BUS_FLOOR - 0.02, 0, "#aeb4bc"));
            for (const side of [-1, 1]) b.push(box(BELLOWS, 2.3, 0.04, x + BELLOWS / 2, 1.85, side * 1.1, METRO.rib));
            x += BELLOWS;
        }
    });
    // The nose, on the front car: dark glass, the blue band low down, a sign panel and headlights.
    const front = cars[CARS.length - 1];
    // The windscreen is a single-sided plane, so it is dark from outside and clear from inside: a rider
    // looks down the road through it. Below it, a dashboard and the driver's desk close the cab.
    front.push(paint(new PlaneGeometry(2.3, 1.6).rotateY(Math.PI / 2).translate(NOSE + 0.07, 2.05, 0), METRO.glass));
    front.push(box(0.12, 0.6, 2.3, NOSE - 0.1, BUS_FLOOR + 0.3, 0, INSIDE.cab));
    front.push(box(0.55, 0.3, 1.1, NOSE - 0.5, 1.4, 0.55, "#1f242e"));
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

type BusState = { u: number; v: number; dwell: number; served: number; hold: number };
type Bus = (typeof BUSES)[number];

/** How close to a standing bus's front door a visitor must be for it to offer the ride, metres. */
const BOARD_REACH = 6.5;
/** A bus holds its doors for someone walking up to them, up to this long (seconds), then goes anyway. */
const HOLD_MAX = 10;
/** He rides in the front car, 2.4 m behind its centre: among the seats, the route screen and the road ahead in view. */
const RIDE_CAR = CARS.length - 1;
const RIDE_BACK = 2.4;

function doorDistance(bus: Bus, st: BusState, p: Vector3): number {
    const d = bus.route.place(st.u + NOSE - FRONT_DOOR);
    return Math.hypot(p.x - d.x, p.z - d.z);
}

/** The stop the bus is standing at (or has just left): `served` is always the one after it. */
const lastStop = (bus: Bus, st: BusState) => bus.stops[(st.served + bus.stops.length - 1) % bus.stops.length];

const SCREEN_PLANE = new PlaneGeometry(SCREEN.w - 0.06, (SCREEN.w - 0.06) * (CANVAS.h / CANVAS.w));

/** The front car's live display, on both faces of its screen box so it reads from either end of the car. */
function Screen({ material }: { material: MeshBasicMaterial }) {
    return (
        <>
            <mesh geometry={SCREEN_PLANE} material={material} position={[SCREEN_X - 0.034, SCREEN.y, 0]} rotation-y={-Math.PI / 2} raycast={() => null} />
            <mesh geometry={SCREEN_PLANE} material={material} position={[SCREEN_X + 0.034, SCREEN.y, 0]} rotation-y={Math.PI / 2} raycast={() => null} />
        </>
    );
}

const BLOB = new MeshBasicMaterial({ color: "#1f2937", transparent: true, opacity: 0.22, depthWrite: false });
/** One unit plane, instanced once per car (WORLD2.md Phase 5: one draw call for every bus shadow). */
const BLOB_PLANE = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const blobMatrix = new Matrix4();

export default function Transit({
    still,
    player,
    navRef,
    rideRef,
    canBoard,
    onStatus,
    onAlight,
}: {
    still: boolean;
    player: RefObject<Vector3>;
    /** The walk grid: where Steven steps down. */
    navRef: RefObject<Nav | null>;
    /** The ride (ride.ts): Transit writes who is aboard and consumes the UI's commands. */
    rideRef: RefObject<RideState>;
    /** Offer the ride: Explore only (and never on the tour). */
    canBoard: boolean;
    /** The HUD's view of the ride, reported only when it changes. */
    onStatus: (info: RideInfo | null) => void;
    /** He stepped down at (x, z). */
    onAlight: (x: number, z: number) => void;
}) {
    const pieces = useMemo(() => busPieces(), []);
    const shelters = useMemo(() => shelterGeometry(), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    // One next-stop display per bus: a canvas, its texture and an unlit material (a screen glows).
    const screens = useMemo(
        () =>
            BUSES.map(() => {
                const canvas = document.createElement("canvas");
                canvas.width = CANVAS.w;
                canvas.height = CANVAS.h;
                const texture = new CanvasTexture(canvas);
                texture.colorSpace = SRGBColorSpace;
                texture.anisotropy = 4;
                return { canvas, texture, material: new MeshBasicMaterial({ map: texture, toneMapped: false }), key: "" };
            }),
        [],
    );
    useEffect(
        () => () =>
            screens.forEach((s) => {
                s.texture.dispose();
                s.material.dispose();
            }),
        [screens],
    );
    // One group per piece per bus, moved every frame.
    const groups = useRef<(Group | null)[][]>(BUSES.map(() => []));
    const states = useRef<BusState[]>(BUSES.map((b) => ({ u: b.stops[0].at, v: 0, dwell: 1.5, served: 1, hold: 0 })));
    // The rider: whether he has pulled the cord, a short lockout after stepping down (so one press can't
    // board the bus he just left), and the last status reported.
    const rider = useRef({ requested: false, lockout: 0, key: "" });
    const shadowMesh = useRef<InstancedMesh>(null);
    // A soft contact shadow under each car (WORLD2.md Phase 4): buses move, so they can't be in the
    // baked shadow map. Each is the car's own footprint, as a scale and offset of one unit plane.
    const blobLocal = useMemo(
        () =>
            pieces.map(({ geometry }) => {
                const b = new Box3().setFromBufferAttribute(geometry.attributes.position as BufferAttribute);
                return new Matrix4().compose(
                    new Vector3((b.max.x + b.min.x) / 2, 0.035, (b.max.z + b.min.z) / 2),
                    new Quaternion(),
                    new Vector3(b.max.x - b.min.x + 0.5, 1, b.max.z - b.min.z + 0.5),
                );
            }),
        [pieces],
    );

    // `?debug` (development only): where each bus is and what it is doing, for the ride checks.
    useEffect(() => {
        if (process.env.NODE_ENV !== "development" || !new URLSearchParams(window.location.search).has("debug")) return;
        (window as unknown as { __buses?: unknown }).__buses = () =>
            BUSES.map((bus, bi) => {
                const st = states.current[bi];
                const at = bus.route.place(st.u);
                return { x: +at.x.toFixed(1), z: +at.z.toFixed(1), v: +st.v.toFixed(1), dwell: +st.dwell.toFixed(1), served: st.served, stops: bus.stops.map((x) => x.shelter.name) };
            });
    }, []);

    // Runs before the camera and Steven (priority −2, both are 0): while he rides, this frame moves him
    // with the bus first, so the camera never lags a frame behind. A negative priority leaves R3F's own
    // rendering on.
    useFrame((_, rawDt) => {
        const dt = Math.min(rawDt, 0.1);
        const ride = rideRef.current;
        const p = player.current;
        const rs = rider.current;
        const riding = ride.bus >= 0;
        const live = canBoard && !still;
        rs.lockout = Math.max(0, rs.lockout - dt);

        BUSES.forEach((bus, bi) => {
            const st = states.current[bi];
            if (!still) {
                if (st.dwell > 0) {
                    st.dwell -= dt;
                    st.v = 0;
                    // Someone is walking up to the door: wait for them.
                    if (st.dwell < 1.5 && st.hold < HOLD_MAX && live && !riding && rs.lockout === 0 && p && doorDistance(bus, st, p) < BOARD_REACH) {
                        st.dwell = 1.5;
                        st.hold += dt;
                    }
                } else {
                    // Brake for the next stop, and for Steven if he is in the lane ahead (not when he is aboard).
                    const next = bus.stops[st.served].at;
                    const toStop = (next - st.u + bus.route.length) % bus.route.length;
                    let room = toStop;
                    if (p && !riding) {
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
                        st.hold = 0;
                        st.served = (st.served + 1) % bus.stops.length;
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
                g.updateMatrix();
                shadowMesh.current?.setMatrixAt(bi * pieces.length + pi, blobMatrix.multiplyMatrices(g.matrix, blobLocal[pi]));
            });
        });
        if (shadowMesh.current) shadowMesh.current.instanceMatrix.needsUpdate = true;

        // Each bus's display: "Next stop" while it runs, "Doors open" at a stop, and the cord's answer
        // for the bus Steven is on. Redrawn only when the words change.
        BUSES.forEach((bus, bi) => {
            const st = states.current[bi];
            const stopped = st.dwell > 0 && st.v === 0;
            const next = bus.stops[st.served];
            const shown = stopped ? lastStop(bus, st) : next;
            const requested = ride.bus === bi && rs.requested;
            const header = stopped ? "Doors open" : requested ? "Stopping" : "Next stop";
            const key = `${header}|${shown.shelter.name}|${bus.stops.indexOf(shown)}`;
            if (key === screens[bi].key) return;
            screens[bi].key = key;
            const [street, ...rest] = shown.shelter.name.split(" · ");
            const ctx = screens[bi].canvas.getContext("2d");
            if (!ctx) return;
            drawScreen(ctx, { header, street, place: rest.join(" · ") || street, stops: bus.stops.map((x) => x.shelter.name), at: bus.stops.indexOf(shown) });
            screens[bi].texture.needsUpdate = true;
        });

        // The ride. A command is acted on once, here, and cleared.
        const command = ride.command;
        ride.command = null;
        const report = (info: RideInfo | null) => {
            const key = JSON.stringify(info);
            if (key === rs.key) return;
            rs.key = key;
            onStatus(info);
        };

        if (ride.bus < 0) {
            // Which standing bus, if any, has its door within reach?
            let best = -1;
            let bestD = BOARD_REACH;
            if (live && rs.lockout === 0 && p) {
                BUSES.forEach((bus, bi) => {
                    const st = states.current[bi];
                    if (st.dwell <= 0 || st.v !== 0) return;
                    const d = doorDistance(bus, st, p);
                    if (d < bestD) [best, bestD] = [bi, d];
                });
            }
            if (command === "board" && best >= 0) {
                ride.bus = best;
                rs.requested = false;
                const st = states.current[best];
                st.dwell = Math.max(st.dwell, 1.2); // the doors close, then it goes
            } else {
                const st = best >= 0 ? states.current[best] : null;
                report(st ? { kind: "offer", stop: lastStop(BUSES[best], st).shelter.name } : null);
            }
        }

        if (ride.bus >= 0 && p) {
            const bus = BUSES[ride.bus];
            const st = states.current[ride.bus];
            const stopped = st.dwell > 0 && st.v === 0;
            const here = stopped ? lastStop(bus, st) : null;
            const at = bus.route.place(st.u + pieces[RIDE_CAR].offset - RIDE_BACK);
            p.set(at.x, BUS_FLOOR, at.z);
            ride.heading = Math.atan2(-at.hx, -at.hz);
            // Pulling the cord asks for the next stop; at a stop it means "get off now".
            if (command === "alight") rs.requested = here ? true : !rs.requested;
            let stop: Shelter | null = null;
            if (command === "eject") {
                // Leaving Explore: set him down at whichever shelter is nearest.
                let bestD = Infinity;
                for (const s of SHELTERS) {
                    const d = Math.hypot(s.x - p.x, s.z - p.z);
                    if (d < bestD) [stop, bestD] = [s, d];
                }
            } else if (rs.requested && here) stop = here.shelter;
            if (stop) {
                const [x, z] = alightPoint(stop, navRef.current);
                p.set(x, 0, z);
                ride.bus = -1;
                rs.requested = false;
                rs.lockout = 1.2;
                onAlight(x, z);
                report(null);
            } else {
                report({ kind: "riding", here: here?.shelter.name ?? null, next: bus.stops[st.served].shelter.name, requested: rs.requested });
            }
        }
    }, -2);

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
                        <mesh geometry={geometry} material={material} receiveShadow raycast={() => null} />
                        {pi === RIDE_CAR && <Screen material={screens[bi].material} />}
                    </group>
                )),
            )}
            <instancedMesh ref={shadowMesh} args={[BLOB_PLANE, BLOB, BUSES.length * pieces.length]} frustumCulled={false} raycast={() => null} />
            <mesh geometry={shelters} material={material} castShadow receiveShadow raycast={() => null} />
        </>
    );
}
