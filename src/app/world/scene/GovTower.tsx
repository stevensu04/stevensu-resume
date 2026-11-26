"use client";

import { useMemo } from "react";
import { BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, DoubleSide, MeshLambertMaterial, RepeatWrapping, SRGBColorSpace, ShapeGeometry, Shape, Vector2 } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 3 · The Finance Forms department's tower (WORLD.md §3): a Brisbane government building, in place
 * of the Kenney skyscraper. Modelled on the photograph Steven chose on 26 Nov 2026: a tall,
 * rounded tower in dark blue glass, a thin white seam running up the middle of the front, two
 * darker plant floors, a pale rim round a roof that is cut on a slant rather than flat (high on the
 * west side and falling to the east, so the default camera sees the slope), and a mast.
 *
 * It's a real building, but the project is confidential (§4), so the door stays shut: the frosted
 * glass and the padlock are in Props.tsx, at the podium's front. There are no crests (§4 rule 4):
 * a city landmark isn't a brand, and nothing here says which department.
 *
 * Draw calls: the podium and roof details in one merged mesh, the glass shaft, and the roof rim.
 */

/** Same plot as the Kenney tower it replaced: the podium's front is the frosted door's plane (z = -11.85). */
export const GOV_TOWER = { x: 27, z: -17.5, podiumW: 10.4, podiumD: 11.3, podiumH: 4.2, topHigh: 36, topLow: 30.4 };
const SHAFT = { w: 9.2, d: 8.8, r: 2.4, z: -17.7 };

/** The slanted roof plane: the glass's height at world x, falling from the west edge to the east. */
function topAt(x: number): number {
    const t = (x - (GOV_TOWER.x - SHAFT.w / 2)) / SHAFT.w;
    return GOV_TOWER.topHigh + (GOV_TOWER.topLow - GOV_TOWER.topHigh) * Math.min(Math.max(t, 0), 1);
}
/** The roof's outward normal: up, tipped towards the low (east) side. */
const SLOPE = (GOV_TOWER.topHigh - GOV_TOWER.topLow) / SHAFT.w;
const ROOF_NORMAL: [number, number, number] = [SLOPE / Math.hypot(SLOPE, 1), 1 / Math.hypot(SLOPE, 1), 0];

const C = {
    podium: "#4b505c",
    podiumLip: "#9aa3b0",
    rim: "#eceff2",
    roof: "#23262e",
    panel: "#1d2d49",
    panelLine: "#4a6a9c",
    seam: "#f1f3f5",
    mast: "#d8dde3",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** The rounded-rectangle outline of the shaft, walked once round, as [x, z, outward normal x, z]. */
function outline(w: number, d: number, r: number, segs: number): [number, number, number, number][] {
    const hx = w / 2 - r;
    const hz = d / 2 - r;
    const pts: [number, number, number, number][] = [];
    // Four corner arcs, each centred on an inner corner, walked counter-clockwise from above.
    const corners: [number, number, number][] = [
        [hx, hz, 0],
        [-hx, hz, Math.PI / 2],
        [-hx, -hz, Math.PI],
        [hx, -hz, (3 * Math.PI) / 2],
    ];
    for (const [cx, cz, a0] of corners) {
        for (let i = 0; i <= segs; i++) {
            const a = a0 + ((i / segs) * Math.PI) / 2;
            const nx = Math.cos(a);
            const nz = Math.sin(a);
            pts.push([cx + r * nx, cz + r * nz, nx, nz]);
        }
    }
    return pts;
}

/** Glass at the sides: a ring of quads between y0 and y1, with u along the perimeter and v up. */
function shaft(y0: number): BufferGeometry {
    const ring = outline(SHAFT.w, SHAFT.d, SHAFT.r, 8);
    const n = ring.length;
    const pos: number[] = [];
    const nor: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    let run = 0;
    for (let i = 0; i <= n; i++) {
        const [x, z, nx, nz] = ring[i % n];
        if (i > 0) {
            const [px, pz] = ring[(i - 1) % n];
            run += Math.hypot(x - px, z - pz);
        }
        const wx = GOV_TOWER.x + x;
        // v runs from the base to the tallest point, not to each column's own top, so the darker
        // plant floors stay level across the slanted roof.
        for (const y of [y0, topAt(wx)]) {
            pos.push(wx, y, SHAFT.z + z);
            nor.push(nx, 0, nz);
            uv.push(run / 1.6, (y - y0) / (GOV_TOWER.topHigh - y0));
        }
    }
    for (let i = 0; i < n; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute("normal", new BufferAttribute(new Float32Array(nor), 3));
    geo.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
    geo.setIndex(idx);
    return paint(geo, "#ffffff");
}

/** A flat rounded-rectangle cap, shrunk by `inset`, lying at height y. */
function cap(inset: number, lift: number, color: string): BufferGeometry {
    const ring = outline(SHAFT.w - inset * 2, SHAFT.d - inset * 2, Math.max(SHAFT.r - inset, 0.4), 8);
    const shape = new Shape(ring.map(([x, z]) => new Vector2(x, z)));
    const geo = new ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(GOV_TOWER.x, 0, SHAFT.z);
    const p = geo.attributes.position;
    const n = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
        // The flat outline is lifted onto the plane through the glass's slanted top.
        p.setY(i, topAt(p.getX(i)) + lift);
        n.set(ROOF_NORMAL, i * 3);
    }
    geo.setAttribute("normal", new BufferAttribute(n, 3));
    return paint(geo, color);
}

/** Dark blue glass with a fine vertical mullion, and two darker plant floors, as the photograph has. */
function glassTexture(): CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 512;
    const g = c.getContext("2d")!;
    g.fillStyle = "#2a4468";
    g.fillRect(0, 0, 64, 512);
    // Floor lines, so it reads as a glazed tower and not a blue slab.
    g.fillStyle = "#223a5a";
    for (let y = 0; y < 512; y += 12) g.fillRect(0, y, 64, 2);
    g.fillStyle = "#3d5f8c";
    g.fillRect(0, 0, 3, 512);
    // The plant floors: a darker band about halfway up and another near the top.
    g.fillStyle = "#121b2b";
    g.fillRect(0, 512 * 0.5 - 20, 64, 22);
    g.fillRect(0, 512 * 0.82 - 12, 64, 14);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.wrapS = RepeatWrapping;
    t.anisotropy = 4;
    return t;
}

function podiumParts(): BufferGeometry[] {
    const { x, z, podiumW, podiumD, podiumH } = GOV_TOWER;
    const seamTop = topAt(x) - 0.4;
    const mastX = x - 1.8;
    // Solar panels on the slope, as thin pale lines across the dark roof: the middle ones run the
    // roof's full depth, the ones near the corners are shorter so they stay inside the rounded outline.
    const tilt = -Math.atan(SLOPE);
    const panelLines = [-3.3, -2.2, -1.1, 0, 1.1, 2.2, 3.3].map((dx) =>
        paint(new BoxGeometry(0.07, 0.04, Math.abs(dx) > 2.5 ? 3.4 : 6.6).rotateZ(tilt).translate(x + dx, topAt(x + dx) + 0.16, SHAFT.z), C.panelLine),
    );
    const out = [
        box(podiumW, podiumH, podiumD, x, podiumH / 2, z, C.podium),
        box(podiumW + 0.3, 0.3, podiumD + 0.3, x, podiumH + 0.15, z, C.podiumLip),
        // The white seam up the middle of the front.
        box(0.2, seamTop - podiumH - 0.4, 0.12, x, (seamTop + podiumH) / 2 - 0.1, SHAFT.z + SHAFT.d / 2 + 0.05, C.seam),
        ...panelLines,
        // The mast, on the high side of the roof.
        paint(new CylinderGeometry(0.06, 0.1, 5.5, 8).translate(mastX, topAt(mastX) + 2.75, SHAFT.z), C.mast),
    ];
    return out;
}

export default function GovTower() {
    const statics = useMemo(() => mergeParts(podiumParts()), []);
    const glass = useMemo(() => shaft(GOV_TOWER.podiumH + 0.3), []);
    const rim = useMemo(() => mergeParts([cap(0, 0.02, C.rim), cap(0.55, 0.1, C.panel)]), []);
    const staticMat = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    // The roof's caps are one-sided shapes whose winding depends on the outline, so show both sides.
    const rimMat = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true, side: DoubleSide })), []);
    const glassMat = useMemo(() => withWorldShader(new MeshLambertMaterial({ map: glassTexture(), vertexColors: true, side: DoubleSide })), []);
    return (
        <>
            <mesh geometry={statics} material={staticMat} raycast={() => null} />
            <mesh geometry={glass} material={glassMat} raycast={() => null} />
            <mesh geometry={rim} material={rimMat} raycast={() => null} />
        </>
    );
}
