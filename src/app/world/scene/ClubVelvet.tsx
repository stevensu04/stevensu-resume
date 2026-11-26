"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, BufferAttribute, CanvasTexture, Color, MeshBasicMaterial, MeshLambertMaterial, SRGBColorSpace, type BufferGeometry, type Group, type Mesh } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 8 · Club Velvet (WORLD.md §3, §4), the hackathon game: a Red Light, Green Light party game where
 * Claude plays the bouncer. Shipped and live, so a whole building with its door shut only by a rope,
 * and the club the game is named after rather than a screen from it (§4 rule 3: no invented screens).
 *
 * Modelled on the game's own entrance, as the team drew it: red brick, a pink neon CLUB VELVET sign
 * over MEMBERS ONLY, two lit windows, a dumpster with a stray cat on it, and Gus the bouncer behind
 * a rope. A queue of five stands on the footpath. The game's rule is the idle motion: while Gus has
 * his back turned the queue creeps towards the rope, he flashes a "!" and turns round, and everyone
 * freezes. Then he turns away again and the queue is sent back to the start. It loops, and all of it
 * stops under prefers-reduced-motion: Gus faces the queue and nobody moves.
 *
 * Draw calls: one merged static mesh, Gus, the "!", five queuers, the sign's glow, and two textured
 * planes (the sign and its subtitle).
 */

/** Footprint, metres. The front faces +z, towards the default camera. */
const CLUB = { x: -16, z0: 37, z1: 46.5, w: 14, h: 5.6 };
const FRONT = CLUB.z1;
const GUS = { x: -16, z: 46.95 };
const ROPE_Z = 47.8;
const QUEUE_Z = 48.8;
const QUEUE_X = [-24.2, -22.9, -21.6, -20.3, -19];
const BIN = { x: -24.1, z: 43.5 };

const C = {
    brick: "#8c3f45",
    brickDark: "#6e2f35",
    trim: "#3a2f45",
    door: "#1d1a2c",
    gold: "#d9b13f",
    window: "#f2c14e",
    carpet: "#b3263e",
    pink: "#ff4f9a",
    night: "#1b1530",
    lavender: "#a9a0d6",
    navy: "#272a45",
    skin: "#9a6a45",
    visor: "#e5484d",
    cyan: "#4fd1c5",
    bin: "#3d6b55",
    binLid: "#2f4f40",
    cat: "#1a1a1f",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** Flat colour, no baked sun: a "!" and a neon tube read better unshaded. */
function flat(geometry: BufferGeometry, color: string): BufferGeometry {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    const c = new Color(color);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < geo.attributes.position.count; i++) colors.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
}

/* ---------------------------------------------------------------- the building */

function building(): BufferGeometry[] {
    const { x, z0, w, h } = CLUB;
    const depth = FRONT - z0;
    const parts = [
        box(w, h, depth, x, h / 2, (z0 + FRONT) / 2, C.brick),
        // The parapet, and a darker band where the brick meets the street.
        box(w + 0.4, 0.35, depth + 0.4, x, h + 0.175, (z0 + FRONT) / 2, C.trim),
        box(w + 0.02, 0.5, 0.06, x, 0.25, FRONT + 0.03, C.brickDark),
        // The door: a dark recess in a gold frame, with the red carpet running out to the rope.
        box(2.0, 2.9, 0.1, GUS.x, 1.45, FRONT + 0.05, C.door),
        box(2.5, 0.14, 0.16, GUS.x, 3.0, FRONT + 0.08, C.gold),
        box(0.14, 3.0, 0.16, GUS.x - 1.18, 1.5, FRONT + 0.08, C.gold),
        box(0.14, 3.0, 0.16, GUS.x + 1.18, 1.5, FRONT + 0.08, C.gold),
        box(2.0, 0.04, ROPE_Z + 0.4 - FRONT, GUS.x, 0.02, (FRONT + ROPE_Z + 0.4) / 2, C.carpet),
        // Two lit windows on the left of the door and one on the right.
        ...[-20.6, -19, -11.5].flatMap((wx) => [box(1.2, 1.3, 0.1, wx, 1.95, FRONT + 0.05, C.window), box(0.06, 1.3, 0.14, wx, 1.95, FRONT + 0.07, C.trim)]),
        // The sign's backing, and the subtitle's.
        box(9.4, 1.5, 0.14, GUS.x, 4.55, FRONT + 0.07, C.night),
        box(3.8, 0.5, 0.06, GUS.x, 3.55, FRONT + 0.03, C.night),
        // Roof vents, and the crown the game gives its winner, in gold on the parapet.
        box(1.2, 0.6, 1.2, -12, h + 0.65, 39.5, C.trim),
        box(1.2, 0.6, 1.2, -20, h + 0.65, 40.5, C.trim),
        box(1.6, 0.3, 0.5, GUS.x, h + 0.5, FRONT - 0.5, C.gold),
        ...[-0.55, 0, 0.55].map((dx) => box(0.3, dx === 0 ? 0.7 : 0.5, 0.5, GUS.x + dx, h + (dx === 0 ? 0.85 : 0.75), FRONT - 0.5, C.gold)),
        // The rope: two gold posts and a red cord, in front of the carpet.
        box(0.12, 0.95, 0.12, GUS.x - 1.1, 0.475, ROPE_Z, C.gold),
        box(0.12, 0.95, 0.12, GUS.x + 1.1, 0.475, ROPE_Z, C.gold),
        box(2.1, 0.07, 0.07, GUS.x, 0.8, ROPE_Z, C.carpet),
    ];
    return parts;
}

/** The dumpster beside the club, and the stray cat on its lid. */
function bin(): BufferGeometry[] {
    const { x, z } = BIN;
    return [
        box(1.2, 1.0, 2.0, x, 0.5, z, C.bin),
        box(1.3, 0.12, 2.1, x, 1.06, z, C.binLid),
        // The cat: body, head, two ears and a tail, seen side-on, looking at the street.
        box(0.3, 0.22, 0.5, x, 1.23, z - 0.15, C.cat),
        box(0.24, 0.2, 0.22, x, 1.38, z + 0.15, C.cat),
        box(0.07, 0.1, 0.06, x - 0.07, 1.54, z + 0.17, C.cat),
        box(0.07, 0.1, 0.06, x + 0.07, 1.54, z + 0.17, C.cat),
        box(0.07, 0.35, 0.07, x, 1.3, z - 0.45, C.cat),
        flat(new BoxGeometry(0.06, 0.04, 0.02).translate(x - 0.06, 1.4, z + 0.27), C.window),
        flat(new BoxGeometry(0.06, 0.04, 0.02).translate(x + 0.06, 1.4, z + 0.27), C.window),
    ];
}

/* ---------------------------------------------------------------- people */

/** A queuer: legs, shirt, head, hair and a cap brim to show which way they face (+z). */
function person(shirt: string, skin: string, hair: string): BufferGeometry {
    return mergeParts([
        box(0.5, 0.6, 0.28, 0, 0.3, 0, "#2b2d4a"),
        box(0.56, 0.62, 0.32, 0, 0.91, 0, shirt),
        box(0.36, 0.36, 0.34, 0, 1.4, 0, skin),
        box(0.4, 0.14, 0.38, 0, 1.64, 0, hair),
        box(0.34, 0.04, 0.16, 0, 1.58, 0.22, hair),
    ]);
}

/** Gus: broad, in navy, with the red visor and the cyan earpiece the game gives him. */
function gus(): BufferGeometry {
    return mergeParts([
        box(0.9, 0.9, 0.5, 0, 0.45, 0, "#1c1f36"),
        box(1.1, 0.95, 0.6, 0, 1.38, 0, C.navy),
        box(0.46, 0.46, 0.44, 0, 2.08, 0, C.skin),
        box(0.5, 0.14, 0.48, 0, 2.38, 0, "#2a1f1a"),
        box(0.5, 0.1, 0.04, 0, 2.1, 0.24, C.visor),
        box(0.06, 0.16, 0.1, 0.26, 2.06, 0, C.cyan),
        // Arms folded in front: a stripe across the chest.
        box(1.0, 0.26, 0.12, 0, 1.45, 0.3, "#1c1f36"),
    ]);
}

/** The "!" that pops over his head one beat before he turns. */
function exclaim(): BufferGeometry {
    return mergeParts([flat(new BoxGeometry(0.22, 0.55, 0.12).translate(0, 3.3, 0), C.window), flat(new BoxGeometry(0.22, 0.2, 0.12).translate(0, 2.85, 0), C.window)]);
}

const QUEUERS: { shirt: string; skin: string; hair: string; speed: number }[] = [
    { shirt: "#e0834a", skin: "#e8b894", hair: "#2a1f1a", speed: 0.7 },
    { shirt: "#8ab45f", skin: "#a86f4a", hair: "#caa24a", speed: 1 },
    { shirt: "#7c6bd1", skin: "#6f4430", hair: "#d46a9a", speed: 0.85 },
    { shirt: "#4fb0b8", skin: "#f1c9a5", hair: "#4a2e20", speed: 0.6 },
    { shirt: "#e0b53c", skin: "#c58a63", hair: "#9a9aa5", speed: 0.95 },
];

/* ---------------------------------------------------------------- signs */

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

const MONO = '"Courier New", Courier, monospace';

/** Text with even tracking, a letter at a time (canvas letterSpacing isn't in every browser yet). */
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

function neonSign(): CanvasTexture {
    return canvasTexture(1024, 148, (g) => {
        g.fillStyle = C.night;
        g.fillRect(0, 0, 1024, 148);
        g.fillStyle = C.pink;
        g.font = `700 112px ${MONO}`;
        tracked(g, "CLUB VELVET", 512, 76, 12);
    });
}

function subtitle(): CanvasTexture {
    return canvasTexture(512, 64, (g) => {
        g.fillStyle = C.night;
        g.fillRect(0, 0, 512, 64);
        g.fillStyle = C.lavender;
        g.font = `700 36px ${MONO}`;
        tracked(g, "MEMBERS ONLY", 256, 34, 10);
    });
}

function Textured({ make, width, height, position }: { make: () => CanvasTexture; width: number; height: number; position: [number, number, number] }) {
    const mat = useMemo(() => withWorldShader(new MeshBasicMaterial({ map: make() })), [make]);
    return (
        <mesh position={position} material={mat} raycast={() => null}>
            <planeGeometry args={[width, height]} />
        </mesh>
    );
}

/* ---------------------------------------------------------------- the loop */

/** One round of the game, in seconds: back turned, the tell, facing, sent back. */
const CYCLE = 7;
const AWAY = 4;
const TELL = 4.5;
const BACK = 6.5;
const SNEAK = 0.55;

/** 0 = Gus faces the queue, 1 = his back is turned. Turns are quick, as they are in the game. */
function turned(t: number) {
    if (t < TELL) return 1;
    if (t < TELL + 0.15) return 1 - (t - TELL) / 0.15;
    if (t < CYCLE - 0.2) return 0;
    return (t - (CYCLE - 0.2)) / 0.2;
}

/** How far along its creep the queue is: up while he's turned away, frozen while he watches, back at the end. */
function creep(t: number) {
    if (t < AWAY) return t / AWAY;
    if (t < BACK) return 1;
    return 1 - (t - BACK) / (CYCLE - BACK);
}

/* ---------------------------------------------------------------- the whole club */

export default function ClubVelvet({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts([...building(), ...bin()]), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const gusGeo = useMemo(() => gus(), []);
    const exclaimGeo = useMemo(() => exclaim(), []);
    const queuers = useMemo(() => QUEUERS.map((q) => person(q.shirt, q.skin, q.hair)), []);
    const glow = useMemo(() => withWorldShader(new MeshBasicMaterial({ color: C.pink, transparent: true, opacity: 0.22, depthWrite: false })), []);
    const glowRef = useRef<Mesh>(null);

    const gusRef = useRef<Group>(null);
    const exclaimRef = useRef<Group>(null);
    const queueRefs = useRef<(Group | null)[]>([]);

    useFrame((state) => {
        const t = still ? 0 : state.clock.elapsedTime % CYCLE;
        // Still: Gus faces the queue and nobody moves. Otherwise the loop runs.
        if (gusRef.current) gusRef.current.rotation.y = Math.PI * (still ? 0 : turned(t));
        if (exclaimRef.current) exclaimRef.current.visible = !still && t >= AWAY && t < TELL + 0.15;
        const c = still ? 0 : creep(t);
        queueRefs.current.forEach((g, i) => {
            if (g) g.position.x = QUEUE_X[i] + c * SNEAK * QUEUERS[i].speed;
        });
        if (glowRef.current) (glowRef.current.material as MeshBasicMaterial).opacity = still ? 0.22 : 0.22 + 0.08 * Math.sin(state.clock.elapsedTime * 2.4);
    });

    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <mesh ref={glowRef} position={[GUS.x, 4.55, FRONT + 0.22]} material={glow} raycast={() => null}>
                <planeGeometry args={[10, 1.9]} />
            </mesh>
            <Textured make={neonSign} width={9} height={1.3} position={[GUS.x, 4.55, FRONT + 0.3]} />
            <Textured make={subtitle} width={3.6} height={0.45} position={[GUS.x, 3.55, FRONT + 0.12]} />

            <group ref={gusRef} userData={{ dynamic: true }} position={[GUS.x, 0, GUS.z]}>
                <mesh geometry={gusGeo} material={material} raycast={() => null} />
            </group>
            <group ref={exclaimRef} userData={{ dynamic: true }} position={[GUS.x, 0, GUS.z]} visible={false}>
                <mesh geometry={exclaimGeo} material={material} raycast={() => null} />
            </group>
            {queuers.map((geo, i) => (
                <group
                    key={i}
                    userData={{ dynamic: true }}
                    ref={(g) => {
                        queueRefs.current[i] = g;
                    }}
                    position={[QUEUE_X[i], 0, QUEUE_Z]}
                    rotation-y={Math.PI / 2}
                >
                    <mesh geometry={geo} material={material} raycast={() => null} />
                </group>
            ))}
        </>
    );
}
