"use client";

import { useMemo } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Color, MeshLambertMaterial, Shape, ShapeGeometry, Vector2 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { LOOK } from "./look";

/**
 * The island (WORLD2.md §3, decision D4). Until 2.0 the block was a flat rectangular slab; now it is
 * one floating platform that holds water, with two pieces of land in it:
 *
 * - **Brisbane**, the big landmass, where everything walkable is. It covers the old slab's land
 *   (and a little more), so no placement, walk area or zone moves.
 * - **Taipei**, a long islet across the channel where the far bank was: past tense, never walkable.
 *   The ferry crossing is now literally from one island to the other.
 *
 * Under the water's edge the platform drops as a thick tapered skirt, soil over rock, with the water
 * shown in section at the cut. Outlines are rounded rectangles pushed **outwards only** by a little
 * periodic noise, so the shore never cuts into ground Steven can stand on.
 *
 * Draw calls: land + islet + skirt merge into one mesh (one lit, vertex-coloured material); the water
 * is a second mesh. Both receive the baked shadows; the water doesn't cast (it swells).
 */

/** Heights, metres. Land tops are y = 0 (as the old slab's were). */
const WATER_Y = -0.35;
/** The water's clock: module-level, like worldUniforms, so the frame loop can advance it. */
const waterTime = { value: 0 };
const BED_Y = -0.8;

type Outline = { cx: number; cz: number; hw: number; hd: number; r: number; wobble: [number, number]; seed: number };

/**
 * Brisbane: the old slab's land (x ±48, z −24…60) with room for the ring road's corners and the
 * south shelters, and since 27 Nov 2026 a South Bank strip past the night street (to z 82.5) for
 * Streets Beach, the BRISBANE letters and the Wheel (SouthBank.tsx).
 */
const BRISBANE: Outline = { cx: 0, cz: 29.25, hw: 50.5, hd: 53.25, r: 6, wobble: [0.2, 0.9], seed: 1 };
/** Taipei: where FAR_BANK was (z −51.5…−44), a little deeper for the skyline's footprints. */
const TAIPEI: Outline = { cx: 0, cz: -48.25, hw: 49, hd: 4.75, r: 3.5, wobble: [0.2, 0.8], seed: 2 };
/** The platform, with about 5 m of water round both. */
const PLATFORM: Outline = { cx: 0, cz: 15, hw: 57, hd: 74, r: 16, wobble: [0, 2.2], seed: 3 };
/** Brisbane's outline before its wobble, for anything that needs to know what's land (Vegetation.tsx). */
export const BRISBANE_LAND = BRISBANE;
/** Both shorelines as they're drawn, with outward normals (rocks go along them). */
export function shorePoints(): Point[][] {
    return [shore(BRISBANE, 360), shore(TAIPEI, 360)];
}
/** The ferry is clipped here (Props.tsx), so it sails out of the diorama rather than off into the air. */
export const ISLAND_EDGE_X = 56.5;

const C = {
    grass: LOOK.grass,
    bank: "#d6c398",
    waterSection: "#69b3d6",
    waterSectionDeep: "#4f95bf",
    soil: "#9e7a50",
    soilDark: "#86653f",
    rock: "#8a7a6a",
    rockDark: "#756859",
    rockDeep: "#625850",
};

export default function Island({ still, onGround }: { still: boolean; onGround: (x: number, z: number) => void }) {
    const solid = useMemo(() => {
        const land = landmass(BRISBANE);
        const islet = landmass(TAIPEI);
        const skirt = skirtGeometry(PLATFORM);
        const merged = mergeGeometries([land, islet, skirt]);
        [land, islet, skirt].forEach((g) => g.dispose());
        return merged;
    }, []);
    const solidMaterial = useMemo(() => new MeshLambertMaterial({ vertexColors: true }), []);

    const water = useMemo(() => waterGeometry(PLATFORM), []);
    const waterMaterial = useMemo(() => makeWater(), []);
    useFrame((_, dt) => {
        if (!still) waterTime.value += dt;
    });

    const walk = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta > 6) return; // a drag was an orbit (Global view), not a click
        onGround(e.point.x, e.point.z);
    };

    return (
        <>
            {/* Taps on Brisbane walk there; taps on Taipei or the water clamp to the nearest bank (walk.ts). */}
            <mesh geometry={solid} material={solidMaterial} onClick={walk} />
            <mesh geometry={water} material={waterMaterial} position-y={WATER_Y} onClick={walk} userData={{ dynamic: true }} />
        </>
    );
}

/* ---------------------------------------------------------------- outlines */

/** Smooth periodic noise along an outline, roughly −1…1. */
function wave(t: number, seed: number): number {
    const a = 2 * Math.PI * t;
    return 0.5 * Math.sin(3 * a + seed * 1.7) + 0.3 * Math.sin(7 * a + seed * 0.9 + 0.4) + 0.2 * Math.sin(13 * a + seed * 2.3 + 2.1);
}

type Point = { x: number; z: number; nx: number; nz: number; t: number };

/** `n` points evenly spaced round a rounded rectangle, with outward normals. */
function roundedRect({ cx, cz, hw, hd, r }: Outline, n: number): Point[] {
    const sx = hw - r;
    const sz = hd - r;
    const arc = (Math.PI / 2) * r;
    // East edge (going south), SE corner, south edge (going west), SW, west edge (north), NW, north edge (east), NE.
    const pieces: { len: number; at: (k: number) => [number, number, number, number] }[] = [
        { len: 2 * sz, at: (k) => [cx + hw, cz - sz + 2 * sz * k, 1, 0] },
        { len: arc, at: (k) => corner(cx + sx, cz + sz, (Math.PI / 2) * k) },
        { len: 2 * sx, at: (k) => [cx + sx - 2 * sx * k, cz + hd, 0, 1] },
        { len: arc, at: (k) => corner(cx - sx, cz + sz, Math.PI / 2 + (Math.PI / 2) * k) },
        { len: 2 * sz, at: (k) => [cx - hw, cz + sz - 2 * sz * k, -1, 0] },
        { len: arc, at: (k) => corner(cx - sx, cz - sz, Math.PI + (Math.PI / 2) * k) },
        { len: 2 * sx, at: (k) => [cx - sx + 2 * sx * k, cz - hd, 0, -1] },
        { len: arc, at: (k) => corner(cx + sx, cz - sz, 1.5 * Math.PI + (Math.PI / 2) * k) },
    ];
    function corner(ox: number, oz: number, a: number): [number, number, number, number] {
        return [ox + r * Math.cos(a), oz + r * Math.sin(a), Math.cos(a), Math.sin(a)];
    }
    const total = pieces.reduce((s, p) => s + p.len, 0);
    const out: Point[] = [];
    for (let i = 0; i < n; i++) {
        let s = (i / n) * total;
        let piece = pieces[0];
        for (const p of pieces) {
            piece = p;
            if (s <= p.len) break;
            s -= p.len;
        }
        const [x, z, nx, nz] = piece.at(Math.min(s / piece.len, 1));
        out.push({ x, z, nx, nz, t: i / n });
    }
    return out;
}

/** The outline pushed outwards by its noise: never inwards, so walkable ground is never cut. */
function shore(o: Outline, n: number): Point[] {
    const [lo, hi] = o.wobble;
    return roundedRect(o, n).map((p) => {
        const push = lo + (hi - lo) * (0.5 + 0.5 * wave(p.t, o.seed));
        return { ...p, x: p.x + p.nx * push, z: p.z + p.nz * push };
    });
}

/* ---------------------------------------------------------------- geometry */

type Ring = { pts: { x: number; z: number }[]; y: number[]; color: string };

/** Quads between consecutive rings, wound so faces point outwards; flat-shaded, colour per ring. */
function loft(rings: Ring[], outward: Point[]): BufferGeometry {
    const pos: number[] = [];
    const col: number[] = [];
    const tint = rings.map((r) => new Color(r.color));
    const n = outward.length;
    for (let i = 0; i < rings.length - 1; i++) {
        const A = rings[i];
        const B = rings[i + 1];
        for (let k = 0; k < n; k++) {
            const k1 = (k + 1) % n;
            const a = [A.pts[k].x, A.y[k], A.pts[k].z];
            const b = [A.pts[k1].x, A.y[k1], A.pts[k1].z];
            const c = [B.pts[k1].x, B.y[k1], B.pts[k1].z];
            const d = [B.pts[k].x, B.y[k], B.pts[k].z];
            // Which way round faces out: test the quad's normal against the outline's outward normal.
            const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
            const e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
            const nx = e1[1] * e2[2] - e1[2] * e2[1];
            const nz = e1[0] * e2[1] - e1[1] * e2[0];
            const flip = nx * outward[k].nx + nz * outward[k].nz < 0;
            const tris = flip ? [a, c, b, a, d, c] : [a, b, c, a, c, d];
            tris.forEach((v) => {
                pos.push(v[0], v[1], v[2]);
                const t = v === a || v === b ? tint[i] : tint[i + 1]; // a, b on ring i; c, d on ring i + 1
                col.push(t.r, t.g, t.b);
            });
        }
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
    geo.setAttribute("uv", new BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    geo.computeVertexNormals();
    return geo;
}

/** A flat cap over an outline at height y, facing up (or down). */
function cap(pts: { x: number; z: number }[], y: number, color: string, down = false): BufferGeometry {
    // ShapeGeometry lies in XY; rotating −90° about X maps shape (x, y) to world (x, −y), facing up.
    const shape = new Shape(pts.map((p) => new Vector2(p.x, -p.z)));
    const geo = new ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, y, 0).toNonIndexed();
    if (down) {
        // Face down: reverse each triangle's winding (mirroring a flat cap wouldn't turn it over).
        const p = geo.attributes.position;
        for (let i = 0; i < p.count; i += 3) {
            const [x, yy, z] = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
            p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2));
            p.setXYZ(i + 2, x, yy, z);
        }
    }
    const c = new Color(color);
    geo.setAttribute("color", new BufferAttribute(new Float32Array(geo.attributes.position.count * 3).map((_, i) => [c.r, c.g, c.b][i % 3]), 3));
    geo.setAttribute("uv", new BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.deleteAttribute("normal");
    geo.computeVertexNormals();
    return geo;
}

/** A landmass: a grass top at y = 0 and a sandy bank down to the bed. */
function landmass(o: Outline): BufferGeometry {
    const pts = shore(o, 360);
    const flat = pts.map((p) => ({ x: p.x, z: p.z }));
    const ring = (y: number, color: string): Ring => ({ pts: flat, y: flat.map(() => y), color });
    const sides = loft([ring(0, C.grass), ring(-0.06, C.grass), ring(-0.06, C.bank), ring(BED_Y, C.bank)], pts);
    const top = cap(flat, 0, C.grass);
    const geo = mergeGeometries([top, sides]);
    top.dispose();
    sides.dispose();
    return geo;
}

/**
 * The platform's skirt: the water in section at the top, then soil, then rock, tapering to a rough
 * point underneath like a floating island. Rings are the outline scaled towards its centre, with
 * jagged heights on the rock.
 */
function skirtGeometry(o: Outline): BufferGeometry {
    const pts = shore(o, 240);
    const rings: Ring[] = [];
    const add = (y: number, scale: number, color: string, jag = 0, seed = 0) => {
        rings.push({
            pts: pts.map((p) => ({ x: o.cx + (p.x - o.cx) * scale, z: o.cz + (p.z - o.cz) * scale })),
            y: pts.map((p) => y + jag * wave(p.t * 3 + seed, 7 + seed)),
            color,
        });
    };
    add(WATER_Y, 1, C.waterSection);
    add(BED_Y, 1, C.waterSectionDeep);
    // Near-vertical cliffs first: the camera looks down at 35°, so anything sloping inwards more
    // steeply than that hides under the rim. The taper comes underneath, where it reads as "floating".
    add(BED_Y, 1, C.soil);
    add(-3.8, 1, C.soilDark, 0.35, 1);
    add(-3.8, 0.99, C.rock, 0.35, 1);
    add(-7, 0.975, C.rock, 0.8, 2);
    add(-7, 0.96, C.rockDark, 0.8, 2);
    add(-10.5, 0.82, C.rockDark, 1, 3);
    add(-14, 0.5, C.rockDeep, 0.8, 4);
    add(-16.5, 0.18, C.rockDeep, 0.4, 5);
    const sides = loft(rings, pts);
    const last = rings[rings.length - 1];
    const bottom = cap(last.pts, -16.5, C.rockDeep, true);
    const geo = mergeGeometries([sides, bottom]);
    sides.dispose();
    bottom.dispose();
    return geo;
}

function waterGeometry(o: Outline): BufferGeometry {
    const pts = shore(o, 240);
    const shape = new Shape(pts.map((p) => new Vector2(p.x, -p.z)));
    // Flat on XZ in world units, so the shader can read the shoreline from position.xz.
    return new ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

/* ---------------------------------------------------------------- water */

/**
 * Lit water (so it takes the baked shadows) with three cheap touches in its shader: a gentle swell,
 * colour that deepens away from the shore, and a soft foam line along both banks. The shore is
 * the two landmasses' rounded rectangles as signed distances, so no texture is needed.
 */
function makeWater(): MeshLambertMaterial {
    const m = new MeshLambertMaterial({ color: "#ffffff" });
    const box = (o: Outline) => ({
        c: new Vector2(o.cx, o.cz),
        b: new Vector2(o.hw - o.r, o.hd - o.r),
        r: o.r,
    });
    const bris = box(BRISBANE);
    const tai = box(TAIPEI);
    const uniforms = {
        uTime: waterTime,
        uShallow: { value: new Color("#8fd0e8") },
        uDeep: { value: new Color("#4f9ccb") },
        uBrisC: { value: bris.c },
        uBrisB: { value: bris.b },
        uBrisR: { value: bris.r },
        uTaiC: { value: tai.c },
        uTaiB: { value: tai.b },
        uTaiR: { value: tai.r },
    };
    m.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = shader.vertexShader
            .replace(
                "#include <common>",
                `#include <common>
                uniform float uTime;
                varying vec2 vWaterXZ;
                varying float vSwell;`,
            )
            .replace(
                "#include <begin_vertex>",
                `#include <begin_vertex>
                // Two crossing sine swells. Small: a diorama's water, not an ocean.
                float swell = sin(position.x * 0.45 + uTime * 0.9) * 0.5 + cos(position.z * 0.8 + uTime * 0.7) * 0.5;
                transformed.y += swell * 0.06;
                vWaterXZ = position.xz;
                vSwell = swell;`,
            );
        shader.fragmentShader = shader.fragmentShader
            .replace(
                "#include <common>",
                `#include <common>
                uniform float uTime;
                uniform vec3 uShallow;
                uniform vec3 uDeep;
                uniform vec2 uBrisC; uniform vec2 uBrisB; uniform float uBrisR;
                uniform vec2 uTaiC; uniform vec2 uTaiB; uniform float uTaiR;
                varying vec2 vWaterXZ;
                varying float vSwell;
                float sdRoundBox(vec2 p, vec2 b, float r) {
                    vec2 q = abs(p) - b;
                    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
                }`,
            )
            .replace(
                "#include <color_fragment>",
                `#include <color_fragment>
                // Metres from the nearest shore (the outlines' wobble pushes the real bank up to ~1 m further out).
                float shoreD = min(sdRoundBox(vWaterXZ - uBrisC, uBrisB, uBrisR), sdRoundBox(vWaterXZ - uTaiC, uTaiB, uTaiR));
                vec3 waterCol = mix(uShallow, uDeep, smoothstep(1.0, 10.0, shoreD)) * (0.97 + 0.05 * vSwell);
                float foamEdge = 1.5 + 0.35 * sin(vWaterXZ.x * 0.8 + vWaterXZ.y * 0.3 + uTime * 1.2);
                float foam = 1.0 - smoothstep(0.2, foamEdge, shoreD);
                // A soft moving sparkle on open water, so it reads as water at a glance (Phase 4).
                float glint = sin(vWaterXZ.x * 1.7 + uTime * 1.5) * sin(vWaterXZ.y * 1.3 - uTime * 1.1) * sin((vWaterXZ.x + vWaterXZ.y) * 0.6 + uTime * 0.7);
                waterCol += vec3(0.07, 0.08, 0.08) * smoothstep(0.55, 0.95, glint) * smoothstep(2.0, 5.0, shoreD);
                diffuseColor.rgb = mix(waterCol, vec3(0.95, 0.98, 1.0), foam * 0.8);`,
            );
    };
    m.customProgramCacheKey = () => "world-water";
    return m;
}
