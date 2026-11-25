"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
    BoxGeometry,
    CanvasTexture,
    CircleGeometry,
    ConeGeometry,
    CylinderGeometry,
    ExtrudeGeometry,
    IcosahedronGeometry,
    MeshBasicMaterial,
    SRGBColorSpace,
    Shape,
    type BufferGeometry,
    type Group,
} from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 5 · Skyveil's building (WORLD.md §3): a museum with a theatre behind it, in place of the Kenney
 * garage. Skyveil Studio's first title, Veilcore, is a hand-tracked browser game built as a museum
 * and a theatre, and Steven's own parts of it are Archery and Cradle (the user's words, 26 Nov
 * 2026), so the front is two arched bays that show them, the way the game's own rooms look:
 *
 * - **Archery** (left bay): a sunset room, a white sun, two acacias and a target.
 * - **Cradle** (right bay): a pale room with wires and round little birds on them. More of the birds
 *   sit on the cornice above it, with music notes drifting over.
 * - **The entrance** between them: a lit, open arched door with red theatre curtains either side.
 * - **The theatre** is the red fly tower behind the museum, striped like a curtain, with a gold
 *   valance and cap.
 * - **Olie**, the owl that stands for the studio, still perches on the cornice above the door
 *   (Landmarks.tsx), and archery targets stand on easels in the forecourt.
 *
 * It's a whole building with its door open and lit (§4: Steven is a co-founder and the studio is
 * live). Nothing from the game's screens is modelled beyond its look (§4 rule 3).
 *
 * Draw calls: one merged static mesh, two sign planes and two groups of drifting notes.
 */

/** Footprint, metres. The front faces +z, towards the default camera. */
export const MUSEUM = { x0: -5.8, x1: 5.8, z0: 3, z1: 11 };
/** Olie's perch, on the cornice over the door (Landmarks.tsx). */
export const OLIE_PERCH = { x: 0, y: 5.5, z: 10.6 };
/** The archery targets on easels in the forecourt. Exported for the walk grid (placements.ts). */
export const TARGETS = [
    { x: -4.1, z: 12.6 },
    { x: -2.1, z: 13.3 },
];

const ZF = MUSEUM.z1;
const BASE = 0.4;
const BODY = 5.2;

const C = {
    stone: "#9a7f98",
    pilaster: "#b79fb0",
    trim: "#e6d9d4",
    plinth: "#6e5668",
    gold: "#d4af37",
    red: "#a8232f",
    redDark: "#7a1a28",
    tower: "#8f2232",
    door: "#f2d98a",
    ink: "#1b1b1f",
    sunset: "#dc5a30",
    ground: "#8c2a1c",
    sun: "#fff0cf",
    acacia: "#7a4a20",
    pale: "#f2ece4",
    wood: "#b9825a",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** A flat arch: a w × h rectangle with a half-round top, extruded `depth` towards +z from z. */
function arch(w: number, h: number, depth: number, x: number, y: number, z: number, color: string): BufferGeometry {
    const r = w / 2;
    const s = new Shape();
    s.moveTo(-r, 0);
    s.lineTo(r, 0);
    s.lineTo(r, h - r);
    s.absarc(0, h - r, r, 0, Math.PI, false);
    s.lineTo(-r, 0);
    return paint(new ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 }).translate(x, y, z), color);
}

/**
 * One of Cradle's birds, facing +z: a round body, a pale cheek, two eyes, a beak, a tuft and a tail.
 * `y` is where its feet are; `s` scales it (1 is about a metre across).
 */
function bird(x: number, y: number, z: number, s: number, body: string): BufferGeometry[] {
    const cy = y + 0.46 * s;
    const part = (g: BufferGeometry, color: string) => paint(g.scale(s, s, s).translate(x, cy, z), color);
    return [
        part(new IcosahedronGeometry(0.5, 1).scale(1, 0.92, 1.05), body),
        part(new IcosahedronGeometry(0.1, 0).translate(-0.2, 0.1, 0.43), "#ffffff"),
        part(new IcosahedronGeometry(0.1, 0).translate(0.2, 0.1, 0.43), "#ffffff"),
        part(new IcosahedronGeometry(0.05, 0).translate(-0.2, 0.1, 0.52), C.ink),
        part(new IcosahedronGeometry(0.05, 0).translate(0.2, 0.1, 0.52), C.ink),
        part(new ConeGeometry(0.09, 0.24, 5).rotateX(Math.PI / 2).translate(0, -0.04, 0.58), "#e08a1e"),
        part(new ConeGeometry(0.09, 0.26, 4).translate(0.04, 0.55, 0.05), body),
        part(new BoxGeometry(0.2, 0.08, 0.34).rotateX(-0.3).translate(0, -0.05, -0.6), body),
    ];
}

/** An archery target on an easel, tilted back a little, with one arrow in the gold. `face` tilts it. */
function target(x: number, z: number): BufferGeometry[] {
    const r = 0.66;
    const cy = 1.45;
    const rings: [number, string][] = [
        [1, "#f4f2ea"],
        [0.8, C.ink],
        [0.6, "#2f6fd0"],
        [0.4, "#d6342c"],
        [0.2, "#f2c230"],
    ];
    const tilt = -0.3;
    const onFace = (g: BufferGeometry, color: string) => paint(g.rotateX(tilt).translate(x, cy, z), color);
    const out: BufferGeometry[] = [onFace(new CylinderGeometry(r * 1.1, r * 1.1, 0.06, 22).rotateX(Math.PI / 2).translate(0, 0, 0.03), C.wood)];
    rings.forEach(([f, color], i) => {
        const h = 0.1 + i * 0.05;
        out.push(onFace(new CylinderGeometry(r * f, r * f, h, 22).rotateX(Math.PI / 2).translate(0, 0, h / 2), color));
    });
    // The arrow: a pale shaft sticking out of the gold, with red fletching at its tail.
    out.push(onFace(new BoxGeometry(0.035, 0.035, 0.9).translate(0.06, 0.04, 0.6), "#caa56a"));
    out.push(onFace(new BoxGeometry(0.14, 0.02, 0.16).translate(0.06, 0.04, 1.0), "#d6342c"));
    out.push(onFace(new BoxGeometry(0.02, 0.14, 0.16).translate(0.06, 0.04, 1.0), "#d6342c"));
    // The easel: two front legs and one back leg.
    for (const dx of [-0.42, 0.42]) out.push(box(0.08, 1.15, 0.08, x + dx, 0.575, z - 0.12, C.wood));
    out.push(paint(new BoxGeometry(0.08, 1.9, 0.08).rotateX(0.42).translate(x, 0.88, z - 0.55), C.wood));
    return out;
}

function parts(): BufferGeometry[] {
    const { x0, x1, z0, z1 } = MUSEUM;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const out: BufferGeometry[] = [
        // The museum: a mauve stone block, a dark plinth round its foot, a pale cornice on top.
        box(w, BODY, d, cx, BODY / 2, cz, C.stone),
        box(w + 0.3, BASE, d + 0.3, cx, BASE / 2, cz, C.plinth),
        box(w + 0.4, 0.4, d + 0.4, cx, 5.3, cz, C.trim),
    ];

    // Four pilasters with capitals divide the front into three bays.
    for (const px of [-4.6, -1.2, 1.2, 4.6]) {
        out.push(box(0.6, 4.5, 0.35, px, 2.65, ZF + 0.175, C.pilaster));
        out.push(box(0.8, 0.2, 0.5, px, 5.0, ZF + 0.25, C.trim));
        out.push(box(0.8, 0.2, 0.5, px, 0.5, ZF + 0.25, C.trim));
    }
    // Gold finials at the corners.
    for (const fx of [-5.6, 5.6]) out.push(box(0.3, 0.6, 0.3, fx, 5.8, z1 - 0.3, C.gold));

    // The three arched bays: a pale frame, then what's inside.
    const bay = (bx: number, w2: number, h: number, fill: string) => {
        out.push(arch(w2 + 0.5, h + 0.25, 0.1, bx, BASE, ZF, C.trim));
        out.push(arch(w2, h, 0.1, bx, BASE, ZF + 0.05, fill));
    };

    // Archery, left: a sunset room, a white sun, two acacias, a target and a strip of red ground.
    const ax = -2.9;
    bay(ax, 2.8, 3.2, C.sunset);
    const inBay = ZF + 0.2;
    out.push(paint(new CircleGeometry(0.5, 24).translate(ax, BASE + 2.3, inBay), C.sun));
    out.push(box(2.8, 0.8, 0.06, ax, BASE + 0.4, inBay + 0.01, C.ground));
    for (const dx of [-0.85, 0.85]) {
        out.push(box(0.07, 1.0, 0.07, ax + dx, BASE + 1.7, inBay, C.acacia));
        out.push(paint(new IcosahedronGeometry(0.55, 0).scale(1, 0.35, 0.5).translate(ax + dx, BASE + 2.25 + (dx > 0 ? -0.1 : 0.1), inBay), C.acacia));
    }
    const inner = target(ax, inBay).map((g) => g.scale(0.62, 0.62, 0.62));
    // The bay's own target stands in the room, so it is the easel's size scaled to fit.
    out.push(...inner.map((g) => g.translate(ax - ax * 0.62, 0.32, 0)));

    // The door, centre: lit and open, with theatre curtains either side.
    bay(0, 1.8, 3.0, C.door);
    for (const dx of [-0.62, 0.62]) out.push(box(0.4, 2.5, 0.08, dx, BASE + 1.3, inBay, C.red));
    out.push(box(1.6, 0.22, 0.1, 0, BASE + 2.55, inBay + 0.02, C.red));

    // Cradle, right: a pale room, two wires and four of the birds on them.
    const rx = 2.9;
    bay(rx, 2.8, 3.2, C.pale);
    for (const wy of [1.9, 0.6]) out.push(box(2.7, 0.04, 0.04, rx, BASE + wy, inBay, C.ink));
    out.push(...bird(rx - 0.8, BASE + 1.92, inBay, 0.4, C.ink));
    out.push(...bird(rx + 0.15, BASE + 1.92, inBay, 0.4, "#d24a3a"));
    out.push(...bird(rx + 0.95, BASE + 1.92, inBay, 0.4, "#f1b69a"));
    out.push(...bird(rx + 0.3, BASE + 0.62, inBay, 0.4, C.ink));

    // Name plates over the two game bays (their lettering is drawn on the planes below).
    for (const sx of [ax, rx]) out.push(box(2.8, 0.7, 0.06, sx, 4.35, ZF + 0.03, "#2a1a26"));

    // Cradle's birds on the cornice over its bay, looking out at the street.
    out.push(...bird(2.2, 5.5, z1 - 0.5, 0.85, C.ink));
    out.push(...bird(3.2, 5.5, z1 - 0.5, 1.0, "#d24a3a"));
    out.push(...bird(4.2, 5.5, z1 - 0.5, 0.8, "#f1b69a"));

    // The theatre: a red fly tower behind, striped like a curtain, under a gold valance and cap.
    const tz0 = z0 - 0.1;
    const tz1 = 7;
    out.push(box(6, 7.4, tz1 - tz0, 0, 3.7, (tz0 + tz1) / 2, C.tower));
    out.push(box(6.4, 0.3, tz1 - tz0 + 0.4, 0, 7.55, (tz0 + tz1) / 2, C.gold));
    for (let i = 0; i < 9; i++) out.push(box(0.4, 1.9, 0.06, -2.8 + i * 0.7, 6.5, tz1 + 0.03, i % 2 ? C.redDark : C.red));
    out.push(box(6.0, 0.16, 0.08, 0, 7.3, tz1 + 0.08, C.gold));

    // Archery targets on easels in the forecourt.
    for (const t of TARGETS) out.push(...target(t.x, t.z));
    return out;
}

/* ---------------------------------------------------------------- the name plates */

function plateTexture(text: string): CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = "#e8c872";
    g.font = '700 84px Georgia, "Times New Roman", serif';
    g.textAlign = "left";
    g.textBaseline = "middle";
    const spacing = 10;
    const widths = [...text].map((ch) => g.measureText(ch).width);
    let x = (512 - (widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1))) / 2;
    [...text].forEach((ch, i) => {
        g.fillText(ch, x, 68);
        x += widths[i] + spacing;
    });
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

function Plate({ text, x }: { text: string; x: number }) {
    const material = useMemo(() => withWorldShader(new MeshBasicMaterial({ map: plateTexture(text), transparent: true, alphaTest: 0.3 })), [text]);
    return (
        <mesh position={[x, 4.35, ZF + 0.12]} material={material} raycast={() => null}>
            <planeGeometry args={[2.6, 0.65]} />
        </mesh>
    );
}

/* ---------------------------------------------------------------- the notes */

/** A music note: a tilted head, a stem and a flag. */
function note(): BufferGeometry {
    return mergeParts([
        paint(new IcosahedronGeometry(0.13, 0).scale(1.3, 0.85, 1).rotateZ(0.35), C.ink),
        paint(new BoxGeometry(0.04, 0.55, 0.04).translate(0.15, 0.3, 0), C.ink),
        paint(new BoxGeometry(0.2, 0.06, 0.04).rotateZ(-0.5).translate(0.25, 0.55, 0), C.ink),
    ]);
}

const NOTES = [
    { x: 3.4, y: 6.7, z: z1Note(), phase: 0 },
    { x: 4.6, y: 7.2, z: z1Note() - 0.2, phase: 2.1 },
    { x: 5.5, y: 6.5, z: z1Note(), phase: 4.2 },
];
function z1Note() {
    return MUSEUM.z1 - 0.3;
}

export default function SkyveilMuseum({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts(parts()), []);
    const material = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    const noteGeo = useMemo(() => note(), []);
    const groups = useRef<(Group | null)[]>([]);

    useFrame((state) => {
        if (still) return;
        const t = state.clock.elapsedTime;
        NOTES.forEach((n, i) => {
            const g = groups.current[i];
            if (!g) return;
            // Drifting, not dancing: a slow bob and a gentle turn.
            g.position.y = n.y + Math.sin(t * 1.4 + n.phase) * 0.18;
            g.rotation.y = Math.sin(t * 0.8 + n.phase) * 0.5;
        });
    });

    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <Plate text="ARCHERY" x={-2.9} />
            <Plate text="CRADLE" x={2.9} />
            {NOTES.map((n, i) => (
                <group
                    key={i}
                    ref={(g) => {
                        groups.current[i] = g;
                    }}
                    position={[n.x, n.y, n.z]}
                >
                    <mesh geometry={noteGeo} material={material} raycast={() => null} />
                </group>
            ))}
        </>
    );
}
