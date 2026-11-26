"use client";

import { useMemo } from "react";
import { BufferAttribute, BufferGeometry, CatmullRomCurve3, Color, MeshLambertMaterial, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { withWorldShader } from "./worldShader";

/**
 * Footpaths across the block (WORLD2.md §3: "curved warm-tan footpaths link the zones"). Until 2.0
 * the block was one paved surface; now it's lawn, so people need somewhere to walk. Two promenades
 * run east–west between the rows, with spurs out to the streets' footpaths through the gaps between
 * zones. They're scenery: Steven can walk anywhere on the lawn, and nothing here touches nav.ts.
 *
 * One merged mesh, one draw call.
 */
export type FootPath = { width: number; points: [number, number][] };

/** Paths sit 3 cm above the grass (1.2 cm shimmered far off at eye level; WORLD2.md Phase 3). */
export const PATH_Y = 0.03;

export const PATHS: FootPath[] = [
    // Between the middle row (shed, museum, shopfront) and the back row (park, gallery, exit).
    { width: 1.8, points: [[-39.8, 16.6], [-31, 16.8], [-22, 17.4], [-13, 16.9], [-4, 16.4], [6, 16.8], [16, 17.3], [26, 16.9], [34, 16.5], [39.8, 16.6]] },
    // Between the back row and the night street, ending at the transit centre's corner.
    { width: 1.6, points: [[-39.8, 32.6], [-31, 32.2], [-20, 31.6], [-8, 32.2], [4, 32.8], [14, 32.2], [21, 31.4], [25.5, 29.6]] },
    // Spurs to the north street, through the gaps either side of the museum.
    { width: 1.3, points: [[-13.2, 16.9], [-13.8, 11], [-13.2, 5], [-13.6, 0.2]] },
    { width: 1.3, points: [[12.6, 17], [13.2, 11], [12.8, 5], [13.2, 0.2]] },
    // Between the promenades, either side of the gallery.
    { width: 1.3, points: [[-11.6, 16.9], [-11, 22], [-11.8, 27], [-11.2, 32.1]] },
    { width: 1.3, points: [[14.4, 17.2], [15, 22], [14.2, 27.5], [14.6, 32.3]] },
    // Down to the night street past D.W. Steakhouse.
    { width: 1.3, points: [[21, 31.5], [21.4, 37], [20.8, 42], [21.2, 47.8]] },
];

/** Distance from (x, z) to the nearest path's edge (negative on a path). */
export function distanceToPaths(x: number, z: number): number {
    let best = Infinity;
    for (const p of PATHS) {
        for (let i = 0; i < p.points.length - 1; i++) {
            const [ax, az] = p.points[i];
            const [bx, bz] = p.points[i + 1];
            const dx = bx - ax;
            const dz = bz - az;
            const k = Math.min(Math.max(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0), 1);
            best = Math.min(best, Math.hypot(x - ax - dx * k, z - az - dz * k) - p.width / 2);
        }
    }
    return best;
}

const TAN = "#e6d3a8";
const EDGE = "#cdb88c";

export default function Ground() {
    const geometry = useMemo(() => {
        const parts = PATHS.map((p, i) => ribbon(p, PATH_Y + i * 0.002));
        const merged = mergeGeometries(parts);
        parts.forEach((g) => g.dispose());
        return merged;
    }, []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    return <mesh geometry={geometry} material={material} raycast={() => null} />;
}

/** A flat strip along a smooth curve: a tan middle and a slightly darker kerb either side. */
function ribbon({ width, points }: FootPath, y: number): BufferGeometry {
    const curve = new CatmullRomCurve3(points.map(([x, z]) => new Vector3(x, y, z)), false, "centripetal");
    const samples = Math.max(8, Math.ceil(curve.getLength() / 0.5));
    const half = width / 2;
    const kerb = 0.14;
    const across = [-half, -half + kerb, half - kerb, half];
    const tint = [EDGE, TAN, TAN, EDGE].map((c) => new Color(c));
    const pos: number[] = [];
    const col: number[] = [];
    for (let s = 0; s <= samples; s++) {
        const t = s / samples;
        const p = curve.getPoint(t);
        const tan = curve.getTangent(t);
        const nx = -tan.z;
        const nz = tan.x;
        const len = Math.hypot(nx, nz) || 1;
        across.forEach((o, k) => {
            pos.push(p.x + (nx / len) * o, y, p.z + (nz / len) * o);
            col.push(tint[k].r, tint[k].g, tint[k].b);
        });
    }
    const index: number[] = [];
    for (let s = 0; s < samples; s++)
        for (let k = 0; k < 3; k++) {
            const a = s * 4 + k;
            const b = a + 1;
            const c = a + 4;
            const d = a + 5;
            // Wound to face up (+y), whichever way the curve runs: checked per quad below.
            index.push(a, c, b, b, c, d);
        }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute("color", new BufferAttribute(new Float32Array(col), 3));
    geo.setAttribute("uv", new BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    geo.setIndex(index);
    const flat = geo.toNonIndexed();
    // Every face must point up; flip any triangle whose normal points down.
    const p = flat.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
        const ax = p.getX(i), az = p.getZ(i);
        const bx = p.getX(i + 1), bz = p.getZ(i + 1);
        const cx = p.getX(i + 2), cz = p.getZ(i + 2);
        const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        if (ny < 0) {
            const tmp = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
            p.setXYZ(i + 1, cx, p.getY(i + 2), cz);
            p.setXYZ(i + 2, tmp[0], tmp[1], tmp[2]);
            const c = flat.attributes.color;
            const tc = [c.getX(i + 1), c.getY(i + 1), c.getZ(i + 1)];
            c.setXYZ(i + 1, c.getX(i + 2), c.getY(i + 2), c.getZ(i + 2));
            c.setXYZ(i + 2, tc[0], tc[1], tc[2]);
        }
    }
    flat.computeVertexNormals();
    geo.dispose();
    return flat;
}
