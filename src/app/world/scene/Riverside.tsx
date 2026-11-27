"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
    AdditiveBlending,
    BoxGeometry,
    BufferAttribute,
    BufferGeometry as Geometry,
    CanvasTexture,
    Color,
    CylinderGeometry,
    DoubleSide,
    InstancedBufferAttribute,
    InstancedMesh,
    MeshBasicMaterial,
    MeshLambertMaterial,
    Object3D,
    PointsMaterial,
    Quaternion,
    RepeatWrapping,
    SRGBColorSpace,
    Vector3,
    type BufferGeometry,
    type Mesh,
    type Points,
} from "three";
import { RIVERSIDE } from "../zones";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * The riverside landmarks (27 Nov 2026, Steven's request), in the island's north-east corner.
 * Scenery only, like Taipei 101 (WORLD.md §4 rule 4): no zone, no card, nothing to walk on.
 *
 * - **The Story Bridge** over the river's east end, from the Brisbane bank to Taipei's: a grey steel
 *   cantilever truss rising to a peak over each of its two piers and dipping between them. The piers
 *   stand either side of the ferry's lane, and the deck is high enough for the ferry's wheelhouse to
 *   pass under. **At night it lights up**: strings of lamps along both trusses' top chords and the
 *   deck's edges run through the rainbow, the colours flowing along the bridge, with their
 *   reflection on the water below. Held still (not dark) under reduced motion.
 * - **The Star** (Queen's Wharf) beside its landing: a round glass tower split by a deep vertical
 *   slot (turned to face the default camera), its facade a field of gold fins, on a banded podium,
 *   with the sky deck's ring on top. By day the fins are gold on dark glass; at night they glow.
 *
 * Draw calls: the bridge's steel and stone (one merged mesh), its lamps (instanced), the reflection;
 * The Star's shell, core, podium and crown (four meshes).
 */

const STEEL = "#5f6f82";
const STONE = "#b9ab93";
const ASPHALT = "#4a4f5c";

/* ---------------------------------------------------------------- the bridge */

const { bridge } = RIVERSIDE;
/** Deck top, metres. The ferry's wheelhouse tops out near 4.8 m. */
const DECK_Y = 6.5;
const END_N = bridge.z1 + 0.8; // the truss ends, just inside the abutments
const END_S = bridge.z0 - 0.8;
const PIERS = [-26.5, -41.5];
/** The top chord's profile along z: low at the ends, a peak over each pier, a dip at midspan. */
const CHORD: [number, number][] = [
    [END_S, DECK_Y + 0.7],
    [PIERS[0], DECK_Y + 7],
    [(PIERS[0] + PIERS[1]) / 2, DECK_Y + 1.1],
    [PIERS[1], DECK_Y + 7],
    [END_N, DECK_Y + 0.7],
];

/** The top chord's height at z (linear between the profile's points). */
function chordY(z: number): number {
    for (let i = 0; i < CHORD.length - 1; i++) {
        const [z0, y0] = CHORD[i];
        const [z1, y1] = CHORD[i + 1];
        if ((z <= z0 && z >= z1) || (z >= z0 && z <= z1)) return y0 + ((z - z0) / (z1 - z0)) * (y1 - y0);
    }
    return DECK_Y;
}

const UP_Z = new Vector3(0, 0, 1);

/** A straight member from a to b, t thick. */
function beam(a: Vector3, b: Vector3, t: number, color: string): BufferGeometry {
    const d = b.clone().sub(a);
    const g = new BoxGeometry(t, t, d.length());
    g.applyQuaternion(new Quaternion().setFromUnitVectors(UP_Z, d.normalize()));
    return paint(g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), color);
}

function bridgeParts(): BufferGeometry[] {
    const { x, width } = bridge;
    const out: BufferGeometry[] = [];
    const len = END_S - END_N;
    // The deck: asphalt on a steel girder, kerbs either side.
    out.push(paint(new BoxGeometry(width, 0.55, len).translate(x, DECK_Y - 0.28, (END_S + END_N) / 2), STEEL));
    out.push(paint(new BoxGeometry(width - 0.4, 0.04, len).translate(x, DECK_Y + 0.02, (END_S + END_N) / 2), ASPHALT));
    // The piers, from the riverbed, and the abutments on each bank.
    for (const pz of PIERS) out.push(paint(new BoxGeometry(width + 1.2, DECK_Y + 0.3, 1.6).translate(x, (DECK_Y - 0.8) / 2 - 0.1, pz), STONE));
    for (const az of [bridge.z0 - 0.4, bridge.z1 + 0.4]) out.push(paint(new BoxGeometry(width + 1.4, DECK_Y, 2.2).translate(x, DECK_Y / 2 - 0.3, az), STONE));
    // Two trusses, one each side: a top chord, the deck chord, and Warren webbing between.
    const step = 1.35;
    const n = Math.round(len / step);
    for (const side of [-1, 1]) {
        const tx = x + side * (width / 2 - 0.1);
        const top = (z: number) => new Vector3(tx, chordY(z), z);
        const bottom = (z: number) => new Vector3(tx, DECK_Y, z);
        for (let i = 0; i < CHORD.length - 1; i++) out.push(beam(top(CHORD[i][0]), top(CHORD[i + 1][0]), 0.32, STEEL));
        out.push(beam(bottom(END_S), bottom(END_N), 0.28, STEEL));
        for (let i = 0; i <= n; i++) {
            const z = END_S - (i / n) * len;
            out.push(beam(bottom(z), top(z), 0.14, STEEL));
            if (i < n) {
                const z2 = END_S - ((i + 1) / n) * len;
                out.push(i % 2 ? beam(bottom(z), top(z2), 0.12, STEEL) : beam(top(z), bottom(z2), 0.12, STEEL));
            }
        }
    }
    // Bracing across the top where the trusses stand tall enough to clear the traffic.
    for (let i = 0; i <= n; i++) {
        const z = END_S - (i / n) * len;
        const y = chordY(z);
        if (y < DECK_Y + 4.5) continue;
        out.push(beam(new Vector3(x - width / 2 + 0.1, y, z), new Vector3(x + width / 2 - 0.1, y, z), 0.14, STEEL));
    }
    return out;
}

/**
 * The Riverwalk: a timber boardwalk along the bank, out over the water, passing under the bridge
 * between the Brisbane abutment and the first pier. Piles into the river every 2.5 m, a railing on
 * the water side and across the east end, where it stops at a small lookout.
 */
function riverwalkParts(): BufferGeometry[] {
    const { minX, maxX, minZ } = RIVERSIDE.riverwalk;
    const maxZ = -23.4; // tucked under the bank's edge, so the deck meets the grass
    const out: BufferGeometry[] = [];
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    out.push(paint(new BoxGeometry(maxX - minX, 0.22, maxZ - minZ).translate(cx, -0.06, cz), "#a9825c"));
    // Board lines across the deck.
    for (let x = minX + 0.6; x < maxX; x += 0.6) out.push(paint(new BoxGeometry(0.04, 0.01, maxZ - minZ - 0.1).translate(x, 0.055, cz), "#8e6b48"));
    // Piles.
    for (let x = minX + 0.4; x <= maxX; x += 2.5) out.push(paint(new BoxGeometry(0.22, 1.2, 0.22).translate(x, -0.6, minZ + 0.2), "#6f5640"));
    // The railing: posts and a top rail along the water side, and across the east end.
    for (let x = minX + 0.2; x <= maxX - 0.1; x += 1.25) out.push(paint(new BoxGeometry(0.08, 1.0, 0.08).translate(x, 0.55, minZ + 0.12), "#e9e4da"));
    out.push(paint(new BoxGeometry(maxX - minX, 0.07, 0.1).translate(cx, 1.05, minZ + 0.12), "#e9e4da"));
    out.push(paint(new BoxGeometry(maxX - minX, 0.05, 0.06).translate(cx, 0.6, minZ + 0.12), "#e9e4da"));
    for (let z = minZ + 0.12; z <= maxZ; z += 1.0) out.push(paint(new BoxGeometry(0.08, 1.0, 0.08).translate(maxX - 0.12, 0.55, z), "#e9e4da"));
    out.push(paint(new BoxGeometry(0.1, 0.07, maxZ - minZ).translate(maxX - 0.12, 1.05, cz), "#e9e4da"));
    return out;
}

/** Where the lamps go: along both top chords and both deck edges, about every 0.42 m. */
function lampPoints(): { p: Vector3; s: number }[] {
    const { x, width } = bridge;
    const pts: { p: Vector3; s: number }[] = [];
    const len = END_S - END_N;
    const count = Math.round(len / 0.42);
    for (const side of [-1, 1]) {
        const tx = x + side * (width / 2 + 0.05);
        for (let i = 0; i <= count; i++) {
            const k = i / count;
            const z = END_S - k * len;
            pts.push({ p: new Vector3(tx, chordY(z) + 0.2, z), s: k });
            pts.push({ p: new Vector3(tx, DECK_Y - 0.05, z), s: k });
        }
    }
    return pts;
}

/** The lamps' reflection: rainbow bands along the length, fading to nothing at the sides. */
function reflectionTexture(): CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d")!;
    for (let y = 0; y < 256; y++) {
        g.fillStyle = `hsl(${(y / 256) * 360}, 95%, 60%)`;
        g.fillRect(0, y, 64, 1);
    }
    // Fade the sides out.
    g.globalCompositeOperation = "destination-in";
    const fade = g.createLinearGradient(0, 0, 64, 0);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(0.5, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = fade;
    g.fillRect(0, 0, 64, 256);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapT = RepeatWrapping;
    return t;
}

/** A soft white glow; the halos tint it per lamp. */
function haloTexture(): CanvasTexture {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.25, "rgba(255,255,255,0.55)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
}

/* ---------------------------------------------------------------- The Star */

const { star } = RIVERSIDE;
const PODIUM_H = 4.2;
const TOWER_H = 11.5;
/** The slot faces the default camera (south-east); cylinder angles run from +z towards +x. */
const SLOT_AT = Math.PI / 4;
const SLOT_HALF = 0.2;

/** The tower's facade: staggered gold fins on dark glass. `glow` draws only the fins, for the night. */
function finTexture(glow: boolean): CanvasTexture {
    const W = 1024;
    const H = 256;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = glow ? "#000000" : "#1c2230";
    g.fillRect(0, 0, W, H);
    const cols = 72;
    const floors = 12;
    for (let i = 0; i < cols; i++)
        for (let f = 0; f < floors; f++) {
            // Each column's fins sit at its own height in the floor, so the field shimmers like the real one's.
            const shift = ((i * 7) % 5) / 5;
            const y = ((f + shift) / floors) * H;
            const lit = ((i * 13 + f * 5) % 7) < 5;
            g.fillStyle = glow ? (lit ? "#ffcf7a" : "#4a3418") : lit ? "#c9a25a" : "#8a7350";
            g.fillRect((i / cols) * W + 3, y + 2, W / cols - 7, H / floors - 6);
        }
    // Floor lines.
    if (!glow) {
        g.fillStyle = "#11151d";
        for (let f = 0; f <= floors; f++) g.fillRect(0, (f / floors) * H - 1, W, 2);
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

/** The podium: bands of glass with warm lit windows, between dark spandrels. */
function podiumTexture(glow: boolean): CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.fillStyle = glow ? "#000000" : "#2a2f3a";
    g.fillRect(0, 0, 512, 128);
    for (let b = 0; b < 3; b++) {
        const y = 8 + b * 40;
        for (let i = 0; i < 48; i++) {
            const lit = (i * 11 + b * 3) % 5 < 3;
            g.fillStyle = glow ? (lit ? "#ffd38a" : "#2a1d0c") : lit ? "#d9c08a" : "#6f7a8a";
            g.fillRect(i * (512 / 48) + 1, y, 512 / 48 - 2, 26);
        }
    }
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    return t;
}

/* ---------------------------------------------------------------- the whole corner */

/** Eases 0 (day) to 1 (night), like the street lamps do. */
function step(current: number, night: boolean, still: boolean, dt: number): number {
    const goal = night ? 1 : 0;
    if (still) return goal;
    const next = current + Math.sign(goal - current) * dt * 0.8;
    return goal > current ? Math.min(next, goal) : Math.max(next, goal);
}

export default function Riverside({ night, still }: { night: boolean; still: boolean }) {
    const steel = useMemo(() => mergeParts([...bridgeParts(), ...riverwalkParts()]), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const lamps = useMemo(() => lampPoints(), []);
    const lampMat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
    const lampGeo = useMemo(() => new BoxGeometry(0.22, 0.22, 0.22), []);
    const lampRef = useRef<InstancedMesh>(null);
    const reflection = useMemo(() => {
        const map = reflectionTexture();
        return new MeshBasicMaterial({ map, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    }, []);
    const reflectionRef = useRef<Mesh>(null);
    // Halos round the lamps, so the colours carry from across the island (a lamp is a few pixels at most).
    const halos = useMemo(() => {
        const geometry = new Geometry();
        geometry.setAttribute("position", new BufferAttribute(new Float32Array(lamps.flatMap(({ p }) => [p.x, p.y, p.z])), 3));
        geometry.setAttribute("color", new BufferAttribute(new Float32Array(lamps.length * 3), 3));
        const material = new PointsMaterial({ map: haloTexture(), size: 1.5, sizeAttenuation: true, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, toneMapped: false });
        return { geometry, material };
    }, [lamps]);
    const haloRef = useRef<Points>(null);

    // The Star: day textures as maps, night ones as emissive maps faded in by the blend.
    const shell = useMemo(() => {
        const g = new CylinderGeometry(star.r, star.r, TOWER_H, 40, 1, true, SLOT_AT + SLOT_HALF, Math.PI * 2 - SLOT_HALF * 2);
        return g.translate(star.x, PODIUM_H + TOWER_H / 2, star.z);
    }, []);
    const shellMat = useMemo(
        () => withWorldShader(new MeshLambertMaterial({ map: finTexture(false), emissiveMap: finTexture(true), emissive: new Color("#ffffff"), emissiveIntensity: 0, side: DoubleSide })),
        [],
    );
    const podium = useMemo(() => new CylinderGeometry(star.r + 1, star.r + 1.2, PODIUM_H, 40).translate(star.x, PODIUM_H / 2, star.z), []);
    const podiumMat = useMemo(
        () => withWorldShader(new MeshLambertMaterial({ map: podiumTexture(false), emissiveMap: podiumTexture(true), emissive: new Color("#ffffff"), emissiveIntensity: 0 })),
        [],
    );
    const crown = useMemo(
        () =>
            mergeParts([
                // The core, seen through the slot; the roof; the sky deck's white ring and its glass rail.
                paint(new CylinderGeometry(star.r * 0.55, star.r * 0.55, TOWER_H, 16).translate(star.x, PODIUM_H + TOWER_H / 2, star.z), "#2b3342"),
                paint(new CylinderGeometry(star.r - 0.05, star.r - 0.05, 0.3, 40).translate(star.x, PODIUM_H + TOWER_H - 0.15, star.z), "#3a4250"),
                paint(new CylinderGeometry(star.r + 0.7, star.r + 0.7, 0.45, 40).translate(star.x, PODIUM_H + TOWER_H + 0.1, star.z), "#eef0f2"),
                paint(new CylinderGeometry(star.r + 0.62, star.r + 0.62, 0.7, 40, 1, true).translate(star.x, PODIUM_H + TOWER_H + 0.65, star.z), "#cfe3ef"),
                paint(new CylinderGeometry(star.r + 1.25, star.r + 1.25, 0.3, 40).translate(star.x, PODIUM_H + 0.15, star.z), "#eef0f2"),
            ]),
        [],
    );

    const blend = useRef(night ? 1 : 0);
    const scratch = useMemo(() => ({ o: new Object3D(), c: new Color() }), []);
    useEffect(() => {
        const m = lampRef.current;
        if (!m) return;
        lamps.forEach(({ p }, i) => {
            scratch.o.position.copy(p);
            scratch.o.updateMatrix();
            m.setMatrixAt(i, scratch.o.matrix);
        });
        m.instanceMatrix.needsUpdate = true;
        // The colour attribute exists before the material compiles its shader for it.
        if (!m.instanceColor) m.instanceColor = new InstancedBufferAttribute(new Float32Array(lamps.length * 3), 3);
        (m.material as MeshBasicMaterial).needsUpdate = true;
    }, [lamps, scratch]);

    // Materials are reached through their meshes (refs), never mutated from the memo directly.
    const shellRef = useRef<Mesh>(null);
    const podiumRef = useRef<Mesh>(null);
    useFrame((state, dt) => {
        const b = (blend.current = step(blend.current, night, still, Math.min(dt, 0.1)));
        if (shellRef.current) (shellRef.current.material as MeshLambertMaterial).emissiveIntensity = b * 0.95;
        if (podiumRef.current) (podiumRef.current.material as MeshLambertMaterial).emissiveIntensity = b * 0.85;
        const m = lampRef.current;
        if (m) {
            m.visible = b > 0.01;
            if (m.visible) {
                // The rainbow flows along the bridge; held where it is under reduced motion.
                const t = still ? 0 : state.clock.elapsedTime * 0.12;
                const halo = haloRef.current;
                const colours = halo?.geometry.getAttribute("color") as BufferAttribute | undefined;
                lamps.forEach(({ s }, i) => {
                    scratch.c.setHSL((((s * 1.4 - t) % 1) + 1) % 1, 0.95, 0.58).multiplyScalar(b);
                    m.setColorAt(i, scratch.c);
                    colours?.setXYZ(i, scratch.c.r, scratch.c.g, scratch.c.b);
                });
                if (m.instanceColor) m.instanceColor.needsUpdate = true;
                if (colours) colours.needsUpdate = true;
            }
        }
        const halo = haloRef.current;
        if (halo) {
            halo.visible = b > 0.01;
            (halo.material as PointsMaterial).opacity = b * 0.9;
        }
        const r = reflectionRef.current;
        if (r) {
            const mat = r.material as MeshBasicMaterial;
            mat.opacity = b * 0.42;
            if (mat.map) mat.map.offset.y = still ? 0 : -state.clock.elapsedTime * 0.12 * 1.4;
            r.visible = b > 0.01;
        }
    });

    const len = END_S - END_N;
    return (
        <>
            <mesh geometry={steel} material={material} raycast={() => null} />
            <points ref={haloRef} geometry={halos.geometry} material={halos.material} frustumCulled={false} raycast={() => null} userData={{ dynamic: true }} />
            <instancedMesh ref={lampRef} args={[lampGeo, lampMat, lamps.length]} raycast={() => null} frustumCulled={false} userData={{ dynamic: true }} />
            <mesh
                ref={reflectionRef}
                position={[bridge.x, -0.24, (END_S + END_N) / 2]}
                rotation-x={-Math.PI / 2}
                material={reflection}
                raycast={() => null}
                userData={{ dynamic: true }}
            >
                <planeGeometry args={[6, len]} />
            </mesh>
            <mesh ref={shellRef} geometry={shell} material={shellMat} raycast={() => null} />
            <mesh ref={podiumRef} geometry={podium} material={podiumMat} raycast={() => null} />
            <mesh geometry={crown} material={material} raycast={() => null} />
        </>
    );
}
