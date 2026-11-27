"use client";

import { useMemo } from "react";
import {
    BoxGeometry,
    BufferAttribute,
    CanvasTexture,
    CircleGeometry,
    Color,
    DoubleSide,
    ExtrudeGeometry,
    IcosahedronGeometry,
    LatheGeometry,
    MeshBasicMaterial,
    MeshLambertMaterial,
    PlaneGeometry,
    RepeatWrapping,
    SRGBColorSpace,
    Shape,
    ShapeGeometry,
    TorusGeometry,
    Vector2,
    type BufferGeometry,
} from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";
import { PALETTE } from "./Props";

/**
 * 4 · Formosa Bauhaus (WORLD.md §4: shipped, so a whole building with its door open). It replaced
 * the building site on 16 Nov 2026, when the capstone was finished and selected for UQ Illuminate.
 *
 * Modelled on the team's own storefront, as it opens the showcase film: two shops side by side.
 * BAUHAUS is white with a black fascia and red, blue and yellow shapes in the window ("opening
 * soon", as it was in the real build). FORMOSA has the dark green fascia with its gold edge and the
 * three marks, an arched doorway, and the banyan from the FORMOSA garden growing in a courtyard
 * behind, its crown over the roof so the building reads from across the block.
 *
 * The project's idea, built in: the default camera (from the south-east) is the "photograph", so
 * the faces it sees, south and east, keep their colour. The faces it never sees, north and west,
 * are plain hatched grey, the way the store shows a surface no photo covered, and a sign on the
 * north wall says so in words (§4 rule 2: geometry can be misread, a sentence can't).
 *
 * "One more thing" (the avatar came out of this project) stands on a fitting mirror out front.
 *
 * Since 27 Nov 2026 it won the Smart Tech Award at UQ Illuminate 2026: a gold cup stands on the
 * BAUHAUS roof with a lit winner sign in front of it (see "the award", below).
 *
 * Draw calls: one merged static mesh (the cup included), one for the swaying crown, one for the
 * hatching, three textured planes (two fascias and the north sign) and the winner sign.
 */

/** Footprints, metres. Fronts face +z, towards the default camera. */
const BAUHAUS = { x0: 19.5, x1: 25.5, z0: 4, z1: 11, h: 4.6 };
const FORMOSA = { x0: 25.5, x1: 33, z0: 4, z1: 11, h: 4.8, shopDepth: 3, wallH: 3.2 };
const FRONT = 11;
const BASE = 0.25;
const DOOR_X = 29.25;
const BANYAN = { x: 29.6, z: 6 };
export const FITTING_MIRROR = { x: 33.75, z: 12 };

/** Colours sampled from the showcase film's storefront frame, and the poster's brand green. */
const C = {
    green: "#24382c",
    gold: "#c5a92e",
    sage: "#94ab75",
    red: "#c8312b",
    yellow: "#e2b33c",
    blue: "#1d56a7",
    bauhausRed: "#e74940",
    black: "#191917",
    glass: "#d3e0e5",
    arch: "#5f7851",
    stone: "#e3ddcf",
    bark: "#6b4a33",
    leaves: ["#4f7d43", "#5f8a4f", "#6d9a5b", "#7aa866"],
    clay: "#cfccc4",
    clayLine: "#b4b0a7",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** Flat colour, no baked sun: shapes on glass read cleaner unshaded. */
function flat(geometry: BufferGeometry, color: string): BufferGeometry {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    const c = new Color(color);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < geo.attributes.position.count; i++) colors.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
}

function shape(points: [number, number][]): Shape {
    const s = new Shape();
    points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
    s.closePath();
    return s;
}

/* ---------------------------------------------------------------- the two shops */

function bauhaus(): BufferGeometry[] {
    const { x0, x1, z0, z1, h } = BAUHAUS;
    const cx = (x0 + x1) / 2;
    const parts = [box(x1 - x0, h, z1 - z0, cx, h / 2, (z0 + z1) / 2, PALETTE.white)];
    // The shop window: pale glass in a black frame, two mullions.
    parts.push(box(5.2, 2.6, 0.08, cx, BASE + 1.45, FRONT + 0.04, C.glass));
    for (const [w, hh, x, y] of [
        [5.4, 0.12, cx, BASE + 2.8],
        [5.4, 0.12, cx, BASE + 0.12],
        [0.12, 2.8, cx - 2.65, BASE + 1.45],
        [0.12, 2.8, cx + 2.65, BASE + 1.45],
        [0.08, 2.6, cx - 0.9, BASE + 1.45],
        [0.08, 2.6, cx + 0.9, BASE + 1.45],
    ] as const)
        parts.push(box(w, hh, 0.12, x, y, FRONT + 0.06, C.black));
    // The display: a blue circle, a red square, a yellow triangle, and a white "opening soon" card.
    const z = FRONT + 0.1;
    parts.push(flat(new CircleGeometry(0.55, 28).translate(cx - 1.75, BASE + 1.35, z), C.blue));
    parts.push(flat(new PlaneGeometry(0.95, 0.95).translate(cx, BASE + 1.3, z), C.bauhausRed));
    parts.push(flat(new ShapeGeometry(shape([[-0.55, -0.45], [0.55, -0.45], [0, 0.55]])).translate(cx + 1.75, BASE + 1.3, z), C.yellow));
    parts.push(flat(new PlaneGeometry(0.6, 0.34).translate(cx + 1.9, BASE + 2.3, z), "#ffffff"));
    // The fascia's backing (the lettered face is a textured plane, below).
    parts.push(box(x1 - x0 + 0.1, 0.9, 0.1, cx, 3.95, FRONT + 0.03, C.black));
    return parts;
}

function formosa(): BufferGeometry[] {
    const { x0, x1, z0, z1, h, shopDepth, wallH } = FORMOSA;
    const cx = (x0 + x1) / 2;
    const shopZ = z1 - shopDepth / 2;
    const parts = [
        // The shop: a roofed front three metres deep.
        box(x1 - x0, h, shopDepth, cx, h / 2, shopZ, PALETTE.white),
        // The courtyard behind it: a low back wall and an east wall, stone underfoot.
        box(x1 - x0, wallH, 0.3, cx, wallH / 2, z0 + 0.15, PALETTE.white),
        box(0.3, wallH, z1 - shopDepth - z0, x1 - 0.15, wallH / 2, (z0 + z1 - shopDepth) / 2, PALETTE.white),
        box(x1 - x0 - 0.3, BASE, z1 - shopDepth - z0 - 0.3, cx - 0.15, BASE / 2, (z0 + 0.3 + z1 - shopDepth) / 2, C.stone),
        flat(new CircleGeometry(1.7, 24).rotateX(-Math.PI / 2).translate(BANYAN.x, BASE + 0.02, BANYAN.z), C.leaves[3]),
    ];
    // Two glass panels in dark green frames either side of the door.
    for (const gx of [27.15, 31.35]) {
        parts.push(box(2.3, 2.6, 0.08, gx, BASE + 1.45, FRONT + 0.04, C.glass));
        for (const [w, hh, x, y] of [
            [2.5, 0.12, gx, BASE + 2.8],
            [2.5, 0.12, gx, BASE + 0.12],
            [0.12, 2.8, gx - 1.2, BASE + 1.45],
            [0.12, 2.8, gx + 1.2, BASE + 1.45],
        ] as const)
            parts.push(box(w, hh, 0.12, x, y, FRONT + 0.06, C.green));
    }
    // The doorway: open, an arch onto the green garden wall beyond, framed in gold.
    const arch = new Shape();
    arch.moveTo(-0.8, 0);
    arch.lineTo(0.8, 0);
    arch.lineTo(0.8, 1.9);
    arch.absarc(0, 1.9, 0.8, 0, Math.PI, false);
    arch.closePath();
    parts.push(flat(new ShapeGeometry(arch, 16).translate(DOOR_X, BASE, FRONT + 0.03), C.arch));
    const rim = new Shape();
    rim.moveTo(-0.92, 0);
    rim.lineTo(0.92, 0);
    rim.lineTo(0.92, 1.9);
    rim.absarc(0, 1.9, 0.92, 0, Math.PI, false);
    rim.closePath();
    parts.push(flat(new ShapeGeometry(rim, 16).translate(DOOR_X, BASE, FRONT + 0.02), C.gold));
    parts.push(box(1.9, 0.06, 0.6, DOOR_X, BASE + 0.03, FRONT + 0.3, C.gold));
    // The fascia's backing, edged in gold.
    parts.push(box(x1 - x0 + 0.14, 1.04, 0.1, cx, 3.95, FRONT + 0.02, C.gold));
    parts.push(box(x1 - x0, 0.9, 0.1, cx, 3.95, FRONT + 0.04, C.green));
    // Two potted olive trees either side of the door, as in the film.
    for (const px of [27.9, 30.6]) {
        parts.push(box(0.6, 0.55, 0.6, px, 0.275, 11.6, PALETTE.wood));
        parts.push(box(0.08, 0.6, 0.08, px, 0.85, 11.6, C.bark));
        parts.push(paint(new IcosahedronGeometry(0.42, 0).scale(1, 1.2, 1).translate(px, 1.35, 11.6), C.leaves[2]));
    }
    return parts;
}

/** The plinth line both shops stand on. */
function base(): BufferGeometry[] {
    return [box(FORMOSA.x1 - BAUHAUS.x0 + 0.3, BASE, FORMOSA.z1 - BAUHAUS.z0 + 0.3, (BAUHAUS.x0 + FORMOSA.x1) / 2, BASE / 2, (BAUHAUS.z0 + FORMOSA.z1) / 2, "#cfcac0")];
}

/** The fitting mirror: a tall glass in a wooden frame on two feet, facing the street. */
function mirror(): BufferGeometry[] {
    const { x, z } = FITTING_MIRROR;
    return [
        box(1.0, 2.1, 0.08, x, 1.25, z, PALETTE.wood),
        box(0.82, 1.9, 0.02, x, 1.25, z + 0.05, "#cfe3ef"),
        paint(new PlaneGeometry(0.16, 1.5).rotateZ(0.35).translate(x - 0.12, 1.3, z + 0.065), "#eef6fb"),
        box(0.1, 0.2, 0.5, x - 0.4, 0.1, z, PALETTE.wood),
        box(0.1, 0.2, 0.5, x + 0.4, 0.1, z, PALETTE.wood),
    ];
}

/* ---------------------------------------------------------------- the award */

/**
 * The Smart Tech Award, UQ Illuminate 2026 (won 27 Nov 2026). A gold cup on a dark plinth at the
 * back of the BAUHAUS roof, so it stands clear of the banyan, with a sign along the roof's front
 * edge saying in words what it is (§4 rule 2). No Illuminate, Optiver or UQ logo (§4 rule 4): the
 * sign is lettering on the gradient the event's own winner sign used.
 */
const AWARD = { x: (BAUHAUS.x0 + BAUHAUS.x1) / 2, z: 6.6, plinth: 0.7 };
/** Turned towards the default camera (south-east), so the lettering faces the visitor rather than the street. */
const AWARD_SIGN = { w: 5.2, h: 1.5, y: BAUHAUS.h + 0.25 + 0.75, z: FRONT - 1.4, rot: 0.5 };
const GOLD = "#d9a92b";

/** A faceted cup, turned from one profile: foot, stem, knot, bowl, and the bowl's inside back down. */
function trophyCup(): BufferGeometry {
    const s = 1.25;
    const profile: [number, number][] = [
        [0, 0], [0.42, 0], [0.42, 0.1], [0.28, 0.16], [0.09, 0.22], [0.09, 0.5], [0.17, 0.56], [0.09, 0.62],
        [0.09, 0.72], [0.22, 0.78], [0.44, 0.98], [0.52, 1.26], [0.54, 1.42], [0.46, 1.42], [0.43, 1.26], [0.36, 1.02], [0.12, 0.84], [0, 0.84],
    ];
    const g = new LatheGeometry(profile.map(([r, y]) => new Vector2(r * s, y * s)), 8).toNonIndexed();
    g.deleteAttribute("normal");
    g.computeVertexNormals();
    return g;
}

function award(): BufferGeometry[] {
    const { x, z, plinth } = AWARD;
    const top = BAUHAUS.h + plinth;
    const parts = [
        box(1.4, plinth, 1.4, x, BAUHAUS.h + plinth / 2, z, PALETTE.slate),
        box(1.55, 0.08, 1.55, x, top + 0.04, z, GOLD),
        paint(trophyCup().translate(x, top + 0.08, z), GOLD),
    ];
    // Two handles, half-rings either side of the bowl.
    for (const side of [-1, 1])
        parts.push(paint(new TorusGeometry(0.28, 0.06, 4, 8, Math.PI).rotateZ(-side * Math.PI / 2).translate(x + side * 0.62, top + 1.48, z), GOLD));
    // A star on top of the lid line, so it reads as a prize even from across the island.
    const star = new Shape();
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.14 : 0.32;
        const a = Math.PI / 2 + (i * Math.PI) / 5;
        if (i) star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        else star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    parts.push(paint(new ExtrudeGeometry(star, { depth: 0.1, bevelEnabled: false }).translate(0, 0, -0.05).translate(x, top + 2.25, z), GOLD));
    parts.push(box(0.06, 0.22, 0.06, x, top + 1.98, z, GOLD));
    // The sign's frame and two posts, built at the origin and turned with the sign.
    const { w, h, y, z: sz, rot } = AWARD_SIGN;
    const frame = [box(w + 0.14, h + 0.14, 0.08, 0, y, -0.06, PALETTE.slate)];
    for (const dx of [-2.1, 2.1]) frame.push(box(0.12, 0.6, 0.12, dx, BAUHAUS.h + 0.3, -0.08, PALETTE.slate));
    for (const f of frame) parts.push(f.rotateY(rot).translate(x, 0, sz));
    return parts;
}

/** The winner sign: the event's gradient, three lines of white lettering. */
function awardSign(): CanvasTexture {
    return canvasTexture(1024, 296, (g) => {
        const grad = g.createLinearGradient(0, 0, 1024, 296);
        grad.addColorStop(0, "#4c2ad1");
        grad.addColorStop(0.5, "#c2338f");
        grad.addColorStop(1, "#f2843a");
        g.fillStyle = grad;
        g.fillRect(0, 0, 1024, 296);
        g.fillStyle = "#ffffff";
        g.textAlign = "left";
        g.font = `700 46px ${SANS}`;
        tracked(g, "★  WINNER  ★", 512, 56, 10);
        g.font = `700 92px ${SANS}`;
        tracked(g, "Smart Tech Award", 512, 150, 2);
        g.font = `500 52px ${SANS}`;
        tracked(g, "UQ Illuminate 2026", 512, 244, 4);
    });
}

/* ---------------------------------------------------------------- the banyan */

/** A thick trunk, aerial roots dropping from the limbs, and a wide, low crown. */
function banyanWood(): BufferGeometry[] {
    const { x, z } = BANYAN;
    const parts = [
        paint(new BoxGeometry(0.9, 3.6, 0.9).translate(x, BASE + 1.8, z), C.bark),
        paint(new BoxGeometry(0.3, 2.6, 0.3).rotateZ(-0.8).translate(x + 1.0, BASE + 3.9, z), C.bark),
        paint(new BoxGeometry(0.3, 2.4, 0.3).rotateZ(0.8).translate(x - 1.0, BASE + 3.8, z + 0.2), C.bark),
        paint(new BoxGeometry(0.28, 2.2, 0.28).rotateX(0.75).translate(x, BASE + 3.8, z + 0.9), C.bark),
    ];
    // Aerial roots: thin, straight down to the ground, the banyan's signature.
    for (const [dx, dz] of [
        [1.7, 0.2],
        [-1.6, 0.4],
        [0.5, 1.4],
        [-0.6, -1.1],
        [1.1, -0.9],
    ])
        parts.push(paint(new BoxGeometry(0.1, 4.2, 0.1).translate(x + dx, BASE + 2.1, z + dz), "#7d5a40"));
    return parts;
}

function banyanCrown(): BufferGeometry[] {
    const { x, z } = BANYAN;
    const blobs: [number, number, number, number][] = [
        [0, 6.5, 0, 2.6],
        [2.2, 6.0, 0.5, 1.9],
        [-2.0, 5.9, -0.3, 1.9],
        [0.5, 5.9, 1.9, 1.7],
        [-0.5, 6.1, -1.8, 1.7],
        [0.8, 7.3, -0.4, 1.4],
    ];
    return blobs.map(([dx, y, dz, r], i) =>
        paint(new IcosahedronGeometry(r, 0).scale(1, 0.58, 1).rotateY(i * 0.9).translate(x + dx, y, z + dz), C.leaves[i % C.leaves.length]),
    );
}

/* ---------------------------------------------------------------- the faces no photo saw */

/** Every face the default camera never sees: north (−z) and west (−x). w × h, centre, facing. */
const UNSEEN: { w: number; h: number; at: [number, number, number]; face: "north" | "west" }[] = [
    { w: BAUHAUS.x1 - BAUHAUS.x0, h: BAUHAUS.h, at: [(BAUHAUS.x0 + BAUHAUS.x1) / 2, BAUHAUS.h / 2, BAUHAUS.z0 - 0.02], face: "north" },
    { w: BAUHAUS.z1 - BAUHAUS.z0, h: BAUHAUS.h, at: [BAUHAUS.x0 - 0.02, BAUHAUS.h / 2, (BAUHAUS.z0 + BAUHAUS.z1) / 2], face: "west" },
    { w: FORMOSA.x1 - FORMOSA.x0, h: FORMOSA.wallH, at: [(FORMOSA.x0 + FORMOSA.x1) / 2, FORMOSA.wallH / 2, FORMOSA.z0 - 0.02], face: "north" },
    // The shop's back wall, seen over the courtyard wall from the north.
    {
        w: FORMOSA.x1 - FORMOSA.x0,
        h: FORMOSA.h - FORMOSA.wallH,
        at: [(FORMOSA.x0 + FORMOSA.x1) / 2, (FORMOSA.h + FORMOSA.wallH) / 2, FORMOSA.z1 - FORMOSA.shopDepth - 0.02],
        face: "north",
    },
];

/** Hatching, 1.2 m per stripe repeat, with UVs scaled to each face so the stripes match across walls. */
function unseenGeometry(): BufferGeometry {
    const parts = UNSEEN.map(({ w, h, at, face }) => {
        const g = new PlaneGeometry(w, h);
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / 1.2, (uv.getY(i) * h) / 1.2);
        g.rotateY(face === "north" ? Math.PI : -Math.PI / 2);
        return g.translate(...at);
    });
    return mergeParts(parts);
}

function hatchTexture(): CanvasTexture {
    const S = 128;
    const c = document.createElement("canvas");
    c.width = S;
    c.height = S;
    const g = c.getContext("2d")!;
    g.fillStyle = C.clay;
    g.fillRect(0, 0, S, S);
    g.strokeStyle = C.clayLine;
    g.lineWidth = 14;
    for (let k = -S; k <= S * 2; k += S / 2) {
        g.beginPath();
        g.moveTo(k, 0);
        g.lineTo(k - S, S);
        g.stroke();
    }
    const t = new CanvasTexture(c);
    t.wrapS = t.wrapT = RepeatWrapping;
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

/* ---------------------------------------------------------------- lettering */

/** Text with even tracking, drawn a letter at a time (canvas letterSpacing isn't in every browser yet). */
function tracked(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, spacing: number) {
    const widths = [...text].map((ch) => g.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    let x = cx - total / 2;
    g.textBaseline = "middle";
    [...text].forEach((ch, i) => {
        g.fillText(ch, x, cy);
        x += widths[i] + spacing;
    });
}

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): CanvasTexture {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d")!);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

/** FORMOSA: the three marks, then the wordmark, cream on the brand green. */
function formosaFascia(): CanvasTexture {
    return canvasTexture(1024, 120, (g) => {
        g.fillStyle = C.green;
        g.fillRect(0, 0, 1024, 120);
        const y = 60;
        // Marks on the left, a clear gap, then the wordmark; the pair centred on the fascia.
        g.fillStyle = C.sage;
        g.beginPath();
        g.arc(192, y, 22, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = C.red;
        g.fillRect(228, y - 21, 42, 42);
        g.fillStyle = C.yellow;
        g.beginPath();
        g.moveTo(282, y + 21);
        g.lineTo(330, y + 21);
        g.lineTo(306, y - 23);
        g.closePath();
        g.fill();
        g.fillStyle = "#f1efe9";
        g.font = `500 62px ${SANS}`;
        tracked(g, "FORMOSA", 662, y + 2, 22);
    });
}

function bauhausFascia(): CanvasTexture {
    return canvasTexture(1024, 150, (g) => {
        g.fillStyle = C.black;
        g.fillRect(0, 0, 1024, 150);
        g.fillStyle = "#f1efe9";
        g.font = `400 70px ${SANS}`;
        tracked(g, "BAUHAUS", 512, 77, 26);
    });
}

/** The sign on the north wall: the project's idea, in one plain sentence. */
function unseenSign(): CanvasTexture {
    // Three short lines, large: at follow zoom on a laptop the capitals come out around 20 px.
    return canvasTexture(1024, 400, (g) => {
        g.fillStyle = "#f1efe9";
        g.fillRect(0, 0, 1024, 400);
        g.strokeStyle = PALETTE.slate;
        g.lineWidth = 14;
        g.strokeRect(7, 7, 1010, 386);
        g.fillStyle = PALETTE.slate;
        g.font = `700 84px ${SANS}`;
        g.textBaseline = "middle";
        g.textAlign = "center";
        g.fillText("This side was", 512, 98);
        g.fillText("never photographed,", 512, 200);
        g.fillText("so it stays grey.", 512, 302);
    });
}

function Lettered({ make, width, height, position, rotationY = 0 }: { make: () => CanvasTexture; width: number; height: number; position: [number, number, number]; rotationY?: number }) {
    const mat = useMemo(() => withWorldShader(new MeshLambertMaterial({ map: make() })), [make]);
    return (
        <mesh position={position} rotation-y={rotationY} material={mat} raycast={() => null}>
            <planeGeometry args={[width, height]} />
        </mesh>
    );
}

/* ---------------------------------------------------------------- the whole building */

export default function Formosa({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts([...base(), ...bauhaus(), ...formosa(), ...banyanWood(), ...mirror(), ...award()]), []);
    // Unlit, like Club Velvet's neon, so the winner sign stays bright after dark.
    const signMat = useMemo(() => withWorldShader(new MeshBasicMaterial({ map: awardSign() })), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const crown = useMemo(() => mergeParts(banyanCrown()), []);
    const swaying = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true }), { sway: !still }), [still]);
    const unseen = useMemo(() => unseenGeometry(), []);
    const unseenMat = useMemo(() => withWorldShader(new MeshLambertMaterial({ map: hatchTexture(), side: DoubleSide })), []);
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <mesh geometry={crown} material={swaying} raycast={() => null} />
            <mesh geometry={unseen} material={unseenMat} raycast={() => null} />
            <Lettered make={formosaFascia} width={FORMOSA.x1 - FORMOSA.x0 - 0.1} height={0.82} position={[(FORMOSA.x0 + FORMOSA.x1) / 2, 3.95, FRONT + 0.1]} />
            <Lettered make={bauhausFascia} width={BAUHAUS.x1 - BAUHAUS.x0} height={0.88} position={[(BAUHAUS.x0 + BAUHAUS.x1) / 2, 3.95, FRONT + 0.09]} />
            <Lettered
                make={unseenSign}
                width={5.4}
                height={2.1}
                position={[(BAUHAUS.x0 + BAUHAUS.x1) / 2, 2.35, BAUHAUS.z0 - 0.05]}
                rotationY={Math.PI}
            />
            <mesh position={[AWARD.x, AWARD_SIGN.y, AWARD_SIGN.z]} rotation-y={AWARD_SIGN.rot} material={signMat} raycast={() => null}>
                <planeGeometry args={[AWARD_SIGN.w, AWARD_SIGN.h]} />
            </mesh>
        </>
    );
}
