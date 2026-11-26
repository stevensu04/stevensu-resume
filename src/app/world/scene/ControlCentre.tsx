"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, CanvasTexture, CylinderGeometry, MeshBasicMaterial, MeshLambertMaterial, SRGBColorSpace, type BufferGeometry } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 9 · BrisPulse's building (WORLD.md §3, §4): a transit control centre. BrisPulse is a live dashboard
 * of South East Queensland public transport, built and deployed (status "Live · Deployed"), so it is
 * a whole building with its door open and lit. It used to be a blueprint table in the prototype park
 * while it was a concept; §4 rule 5 promised it a building once the real work shipped, and it has.
 *
 * What the building says: a dish on the roof and a mast for the feeds coming in; a screen over the
 * door with dots moving along routes (the vehicle map) and a "data age" bar that fills and starts
 * again, because every figure in the product carries how fresh its data is. The screen draws no
 * numbers and no timetable: nothing on it can be read as real data (§4 rule 3). The product keeps
 * no history yet, so there is no archive wing, no trend board, nothing that looks like stored data.
 *
 * Draw calls: one merged static mesh and the screen's textured plane. The screen is redrawn ten
 * times a second, and once only under prefers-reduced-motion.
 */

/** Footprint of the ground floor, metres. The front faces +z, towards the default camera. */
export const CONTROL_CENTRE = { x0: 29.5, x1: 38.5, z0: 27, z1: 35 };

const C = {
    wall: "#e6e9ef",
    plinth: "#b9bfcc",
    navy: "#2f3e63",
    navyDark: "#1c2744",
    teal: "#0f8fa0",
    glass: "#24324d",
    door: "#f2d98a",
    unit: "#aab3c2",
    mast: "#eef0f2",
    dish: "#e6e9ee",
    dishInner: "#9aa4b5",
    beacon: "#3ee0c8",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

const GROUND = 3.6;
/** The upper floor stands a little proud of the ground floor on every side but is lowered into it, so no two faces share a plane. */
const UPPER_FRONT = CONTROL_CENTRE.z1 + 0.6;

function parts(): BufferGeometry[] {
    const { x0, x1, z0, z1 } = CONTROL_CENTRE;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const out: BufferGeometry[] = [
        // The ground floor, a low plinth line round its foot, and the upper floor over it.
        box(w, GROUND, d, cx, GROUND / 2, cz, C.wall),
        box(w + 0.2, 0.3, d + 0.2, cx, 0.15, cz, C.plinth),
        box(w + 0.6, 3.5, d + 0.8, cx, 3.5 + 1.75, cz + 0.2, C.navy),
        // The teal roof edge.
        box(w + 0.8, 0.3, d + 1.0, cx, 7.05, cz + 0.2, C.teal),
    ];

    // The glazed front of the ground floor, left of the door, in a row of panes. The glass, its
    // mullions and the canopy stop short of the door, which stands proud of the glass.
    const doorX = x1 - 1.3;
    const glassEnd = doorX - 0.6 - 0.45;
    const glassStart = x0 + 0.6;
    const glassC = (glassStart + glassEnd) / 2;
    out.push(box(glassEnd - glassStart, 2.3, 0.1, glassC, 1.75, z1 + 0.05, C.glass));
    for (let x = glassStart + 1.4; x < glassEnd - 0.5; x += 1.4) out.push(box(0.08, 2.3, 0.14, x, 1.75, z1 + 0.07, C.wall));
    out.push(box(1.2, 2.4, 0.2, doorX, 1.2, z1 + 0.1, C.door));
    out.push(box(2.0, 0.12, 0.9, doorX, 2.6, z1 + 0.45, C.teal));
    // A teal canopy along the whole front, under the overhang.
    out.push(box(w - 0.2, 0.14, 0.8, cx, 3.3, z1 + 0.4, C.teal));

    // The frame of the big screen on the upper floor (the picture itself is a textured plane).
    out.push(box(7.4, 2.4, 0.12, cx, 5.3, UPPER_FRONT + 0.06, C.navyDark));

    // The roof: a plant room, the mast with its two cross-bars and a beacon, and a satellite dish.
    out.push(box(2.2, 0.8, 1.8, x1 - 2.2, 7.2 + 0.4, z0 + 1.8, C.unit));
    const mx = x0 + 2.2;
    const mz = z0 + 1.6;
    out.push(box(0.14, 3.0, 0.14, mx, 7.2 + 1.5, mz, C.mast));
    out.push(box(1.3, 0.07, 0.07, mx, 9.5, mz, C.mast));
    out.push(box(0.8, 0.07, 0.07, mx, 9.0, mz, C.mast));
    out.push(box(0.22, 0.22, 0.22, mx, 10.31, mz, C.beacon));
    out.push(...dish(cx + 0.2, 7.2 + 1.1, z0 + 2.6));

    // A stop-style information pillar by the entrance, its little screen lit.
    out.push(box(0.5, 2.0, 0.3, x0 + 2.7, 1.0, z1 + 1.6, C.navy));
    out.push(box(0.38, 0.7, 0.04, x0 + 2.7, 1.5, z1 + 1.6 + 0.18, C.beacon));
    return out;
}

/** A satellite dish on a short post, tilted up towards the camera: the feeds come in over the air. */
function dish(x: number, y: number, z: number): BufferGeometry[] {
    const tilt = 0.6;
    const placed = (geometry: BufferGeometry, color: string) => paint(geometry.rotateX(tilt).translate(x, y, z), color);
    return [
        box(0.3, 1.0, 0.3, x, y - 0.55, z, C.unit),
        placed(new CylinderGeometry(0.95, 0.14, 0.3, 18), C.dish),
        placed(new CylinderGeometry(0.72, 0.72, 0.06, 18).translate(0, 0.21, 0), C.dishInner),
        placed(new BoxGeometry(0.06, 0.9, 0.06).translate(0, 0.65, 0), C.mast),
        placed(new BoxGeometry(0.16, 0.12, 0.16).translate(0, 1.12, 0), C.dishInner),
    ];
}

/* ---------------------------------------------------------------- the screen */

const SCREEN = { w: 7, h: 2, px: 1050, py: 300 };

/** Three routes as polylines in 0–1 map space; a dot runs along each. */
const ROUTES: { colour: string; points: [number, number][]; speed: number; offsets: number[] }[] = [
    { colour: "#2dd4bf", points: [[0.04, 0.78], [0.2, 0.6], [0.4, 0.64], [0.62, 0.34], [0.96, 0.28]], speed: 0.07, offsets: [0, 0.5] },
    { colour: "#f6c21c", points: [[0.1, 0.18], [0.3, 0.3], [0.5, 0.46], [0.7, 0.66], [0.94, 0.8]], speed: 0.055, offsets: [0.2, 0.7] },
    { colour: "#60a5fa", points: [[0.5, 0.06], [0.52, 0.3], [0.46, 0.6], [0.5, 0.94]], speed: 0.09, offsets: [0.35] },
];

/** Where a fraction `k` (0–1) of the way along a polyline is. */
function along(points: [number, number][], k: number): [number, number] {
    const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
    let rest = k * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
        if (rest <= lengths[i] || i === lengths.length - 1) {
            const f = Math.min(rest / lengths[i], 1);
            return [points[i][0] + (points[i + 1][0] - points[i][0]) * f, points[i][1] + (points[i + 1][1] - points[i][1]) * f];
        }
        rest -= lengths[i];
    }
    return points[0];
}

/** The screen's texture and a function that redraws it for time `t` in seconds. */
function makeScreen() {
    const canvas = document.createElement("canvas");
    canvas.width = SCREEN.px;
    canvas.height = SCREEN.py;
    const g = canvas.getContext("2d")!;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;

    const mapW = 640;
    const draw = (t: number) => {
        g.fillStyle = "#0e1a2e";
        g.fillRect(0, 0, SCREEN.px, SCREEN.py);
        // The map: a faint grid, the routes and a dot on each running along them.
        g.strokeStyle = "#1c2c47";
        g.lineWidth = 2;
        for (let x = 0; x <= mapW; x += 64) {
            g.beginPath();
            g.moveTo(x + 20, 20);
            g.lineTo(x + 20, SCREEN.py - 20);
            g.stroke();
        }
        for (let y = 20; y <= SCREEN.py - 20; y += 52) {
            g.beginPath();
            g.moveTo(20, y);
            g.lineTo(mapW + 20, y);
            g.stroke();
        }
        const toPx = ([x, y]: [number, number]): [number, number] => [20 + x * mapW, 20 + y * (SCREEN.py - 40)];
        for (const route of ROUTES) {
            g.strokeStyle = route.colour;
            g.globalAlpha = 0.55;
            g.lineWidth = 6;
            g.lineJoin = "round";
            g.beginPath();
            route.points.forEach((p, i) => {
                const [x, y] = toPx(p);
                if (i) g.lineTo(x, y);
                else g.moveTo(x, y);
            });
            g.stroke();
            g.globalAlpha = 1;
            g.fillStyle = "#ffffff";
            for (const offset of route.offsets) {
                const [x, y] = toPx(along(route.points, (t * route.speed + offset) % 1));
                g.beginPath();
                g.arc(x, y, 12, 0, Math.PI * 2);
                g.fill();
                g.fillStyle = route.colour;
                g.beginPath();
                g.arc(x, y, 7, 0, Math.PI * 2);
                g.fill();
                g.fillStyle = "#ffffff";
            }
        }
        // The right-hand panel: the name, a LIVE pill, and the data-age bar.
        g.fillStyle = "#ffffff";
        g.font = '800 62px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif';
        g.textBaseline = "alphabetic";
        g.textAlign = "left";
        g.fillText("BrisPulse", 700, 108);
        g.fillStyle = "#14303a";
        g.beginPath();
        g.roundRect(700, 140, 150, 50, 25);
        g.fill();
        g.fillStyle = "#3ee0a0";
        g.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(t * 2));
        g.beginPath();
        g.arc(732, 165, 10, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
        g.font = '800 30px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif';
        g.fillText("LIVE", 756, 176);
        // "How fresh is this?": a bar that fills over fifteen seconds, then starts again, as a feed would.
        const age = (t % 15) / 15;
        g.fillStyle = "#1c2c47";
        g.fillRect(700, 226, 300, 16);
        g.fillStyle = age < 0.7 ? "#3ee0a0" : "#f6c21c";
        g.fillRect(700, 226, 300 * age, 16);
        g.fillStyle = "#8da2c0";
        g.font = '600 24px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif';
        g.fillText("data age", 700, 270);
        texture.needsUpdate = true;
    };
    draw(3);
    return { texture, draw };
}

export default function ControlCentre({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts(parts()), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const screen = useMemo(() => makeScreen(), []);
    const screenMaterial = useMemo(() => withWorldShader(new MeshBasicMaterial({ map: screen.texture })), [screen]);
    const last = useRef(0);

    useFrame((state) => {
        if (still) return;
        const now = state.clock.elapsedTime;
        if (now - last.current < 0.1) return;
        last.current = now;
        screen.draw(now);
    });

    const { x0, x1 } = CONTROL_CENTRE;
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <mesh position={[(x0 + x1) / 2, 5.3, UPPER_FRONT + 0.18]} material={screenMaterial} raycast={() => null}>
                <planeGeometry args={[SCREEN.w, SCREEN.h]} />
            </mesh>
        </>
    );
}
