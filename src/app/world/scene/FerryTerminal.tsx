"use client";

import { useMemo } from "react";
import { BoxGeometry, CanvasTexture, ExtrudeGeometry, MeshLambertMaterial, SRGBColorSpace, Shape, Vector2, type BufferGeometry } from "three";
import { TERMINAL } from "../placements";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 1 · The ferry landing's terminal (WORLD.md §3): the UQ St Lucia CityCat terminal on the Brisbane
 * River, from the photograph Steven chose on 26 Nov 2026, in place of the plain timber pier it was.
 *
 * What the photograph has, and so does this: a gangway from the bank, a truss of orange steel under
 * a thin dark roof; a floating pontoon with a dark hull; a big dark wing of a roof over the pontoon,
 * tilted up towards the downstream end, with a second plate on top of it; and a tall tapered fin at
 * the far end, dark on one side and white on the other, with orange edges and the station's name in
 * vertical letters ("UQ ST LUCIA"). Steven chose to show the name, as he chose the UQ crest (§4 rule 4).
 *
 * The ferry (Props.tsx) docks along the pontoon's river side, in a lane clear of it, so it no longer
 * sails through anything. Steven can walk out along the gangway and onto the pontoon (walk.ts).
 *
 * Draw calls: one merged static mesh and the fin's lettering (on both faces).
 */

const C = {
    hull: "#454b58",
    deck: "#d9c9a8",
    steel: "#ee8a2c",
    roof: "#2b303b",
    post: "#4b5161",
    dark: "#3b414d",
    light: "#eceff1",
    wood: "#b9825a",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** A profile in (x, y), extruded `depth` across z, centred on z = 0. */
function prism(points: [number, number][], depth: number, color: string): BufferGeometry {
    const geometry = new ExtrudeGeometry(new Shape(points.map(([x, y]) => new Vector2(x, y))), { depth, bevelEnabled: false });
    geometry.translate(0, 0, -depth / 2);
    return paint(geometry, color);
}

const FIN_H = 8.6;

function parts(): BufferGeometry[] {
    const { gangway: g, pontoon: p, pylon, roofX } = TERMINAL;
    const out: BufferGeometry[] = [];

    // The pontoon: a dark hull and a pale timber deck set a little inside it.
    const pw = p.maxX - p.minX;
    const pd = p.maxZ - p.minZ;
    const pcx = (p.minX + p.maxX) / 2;
    const pcz = (p.minZ + p.maxZ) / 2;
    // The hull's top is 0.05 m under the deck's: faces in the same plane flickered between the two colours.
    out.push(box(pw, 0.55, pd, pcx, -0.275, pcz, C.hull));
    out.push(box(pw - 0.3, 0.1, pd - 0.3, pcx, 0, pcz, C.deck));

    // The gangway from the bank: a deck, two steel trusses and a thin dark roof over them.
    const len = g.maxZ - g.minZ;
    const gcz = (g.minZ + g.maxZ) / 2;
    out.push(box(g.w, 0.2, len, g.x, -0.05, gcz, C.deck));
    const bays = 5;
    const bay = len / bays;
    for (const side of [-1, 1]) {
        const tx = g.x + side * (g.w / 2 - 0.05);
        out.push(box(0.1, 0.1, len, tx, 1.45, gcz, C.steel));
        out.push(box(0.1, 0.1, len, tx, 0.3, gcz, C.steel));
        for (let i = 0; i <= bays; i++) out.push(box(0.08, 1.15, 0.08, tx, 0.875, g.minZ + i * bay, C.steel));
        for (let i = 0; i < bays; i++) {
            const dy = 1.15;
            const angle = Math.atan(bay / dy) * (i % 2 ? -1 : 1);
            const diagonal = new BoxGeometry(0.07, Math.hypot(bay, dy), 0.07).rotateX(angle).translate(tx, 0.875, g.minZ + (i + 0.5) * bay);
            out.push(paint(diagonal, C.steel));
        }
    }
    out.push(box(g.w + 0.3, 0.08, len + 0.1, g.x, 1.6, gcz, C.roof));

    // The wing roof over the pontoon, rising towards +x, on four posts, with a second plate above it.
    const tilt = 0.1;
    const rz = pcz;
    const roofY = 3.1;
    out.push(paint(new BoxGeometry(9, 0.16, 3.6).rotateZ(tilt).translate(roofX, roofY, rz), C.roof));
    out.push(paint(new BoxGeometry(5.6, 0.12, 3.2).rotateZ(0.05).translate(roofX + 1.6, roofY + 0.65, rz), C.roof));
    for (const dx of [-1.4, 1.4]) out.push(box(0.1, 0.45, 0.1, roofX + dx + 1.6, roofY + 0.4, rz, C.post));
    for (const px of [-3.3, 3.3]) {
        const top = roofY + px * Math.tan(tilt) - 0.1;
        for (const dz of [-1.2, 1.2]) {
            out.push(box(0.12, top - 0.05, 0.12, roofX + px, 0.05 + (top - 0.05) / 2, rz + dz, C.post));
            out.push(box(0.05, top - 0.05, 0.05, roofX + px + 0.1, 0.05 + (top - 0.05) / 2, rz + dz, C.steel));
        }
    }
    // A bench under it, facing the river.
    out.push(box(2.4, 0.08, 0.5, roofX, 0.5, rz - 0.4, C.wood));
    out.push(box(2.4, 0.4, 0.5, roofX, 0.25, rz - 0.4, C.post));

    // The fin: dark on the left, white on the right, orange edges, a slanted top.
    const { x, z } = pylon;
    const fin = (points: [number, number][], depth: number, color: string) => prism(points, depth, color).translate(x, 0.05, z);
    out.push(fin([[-0.9, 0], [0, 0], [0, FIN_H], [-0.45, FIN_H - 0.6]], 0.8, C.dark));
    out.push(fin([[0, 0], [0.9, 0], [0.45, FIN_H - 0.6], [0, FIN_H]], 0.8, C.light));
    out.push(fin([[-0.95, 0], [-0.78, 0], [-0.38, FIN_H - 0.65], [-0.5, FIN_H - 0.55]], 0.9, C.steel));
    out.push(fin([[0.78, 0], [0.95, 0], [0.55, FIN_H - 0.65], [0.38, FIN_H - 0.55]], 0.9, C.steel));
    return out;
}

/** "UQ ST LUCIA", reading downwards, dark on transparent. */
function lettering(): CanvasTexture {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 1024;
    const g = c.getContext("2d")!;
    g.translate(48, 512);
    g.rotate(Math.PI / 2);
    g.fillStyle = "#3a3f4b";
    g.font = '700 58px ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif';
    g.textAlign = "center";
    g.textBaseline = "middle";
    const text = "UQ ST LUCIA";
    const spacing = 14;
    const widths = [...text].map((ch) => g.measureText(ch).width);
    let at = -(widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)) / 2;
    g.textAlign = "left";
    [...text].forEach((ch, i) => {
        g.fillText(ch, at, 0);
        at += widths[i] + spacing;
    });
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

export default function FerryTerminal() {
    const statics = useMemo(() => mergeParts(parts()), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const letters = useMemo(() => withWorldShader(new MeshLambertMaterial({ map: lettering(), transparent: true, alphaTest: 0.3 })), []);
    const { x, z } = TERMINAL.pylon;
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <mesh position={[x + 0.27, 4.35, z + 0.45]} material={letters} raycast={() => null}>
                <planeGeometry args={[0.34, 3.6]} />
            </mesh>
            {/* The same name on the river side, for when the view is turned round: turned about the fin, it reads the right way. */}
            <mesh position={[x - 0.27, 4.35, z - 0.45]} rotation-y={Math.PI} material={letters} raycast={() => null}>
                <planeGeometry args={[0.34, 3.6]} />
            </mesh>
        </>
    );
}
