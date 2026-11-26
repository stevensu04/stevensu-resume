"use client";

import { useMemo } from "react";
import { BoxGeometry, CanvasTexture, CircleGeometry, ConeGeometry, CylinderGeometry, MeshLambertMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace, type BufferGeometry, type Texture } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 10 and 11 · Two part-time jobs in Brisbane (WORLD.md §3), added on 26 Nov 2026 at Steven's request,
 * in place of three plain Kenney buildings on the night street. They aren't on his CV, which is why
 * they have a stop here. Each is modelled on an exterior photograph Steven supplied, as the shopfront
 * of the restaurant, and carries its name in plain lettering only: no logos, no photographs (§4 rule 4).
 *
 * - **Seoul Garden** (Korean BBQ buffet): a timber-framed front with white breeze-block walls at the
 *   ends, a glazed run along the bench, a pink neon sign, a row of clay jars along the top, hanging
 *   plants, a red popcorn cart and a red "ALL YOU CAN EAT" in the window.
 * - **D.W. Steakhouse:** a black-framed glass front under a timber fascia with gold lit lettering,
 *   orange vinyl panels on the glass, and an open lit door.
 *
 * Both are shipped jobs, so whole buildings with the door open and lit (§4). Nothing inside is modelled.
 *
 * Draw calls: one merged static mesh each, and the textured planes (signs, breeze-block, panels).
 */

export const SEOUL_GARDEN = { x0: -3, x1: 8, z0: 38.5, z1: 45 };
export const DW_STEAKHOUSE = { x0: 9.6, x1: 17.4, z0: 38.5, z1: 45 };

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/* ---------------------------------------------------------------- textures */

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

const SANS = 'ui-sans-serif, system-ui, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

/** Text with even tracking, centred on cx. */
function tracked(g: CanvasRenderingContext2D, text: string, cx: number, cy: number, spacing: number) {
    const widths = [...text].map((ch) => g.measureText(ch).width);
    let x = cx - (widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1)) / 2;
    g.textAlign = "left";
    g.textBaseline = "middle";
    [...text].forEach((ch, i) => {
        g.fillText(ch, x, cy);
        x += widths[i] + spacing;
    });
}

/** Breeze block: a grid of round holes in off-white, two by two per tile. */
function blockTexture(): CanvasTexture {
    const t = canvasTexture(128, 128, (g) => {
        g.fillStyle = "#efebe3";
        g.fillRect(0, 0, 128, 128);
        for (const cx of [32, 96])
            for (const cy of [32, 96]) {
                g.strokeStyle = "#cbc5b8";
                g.lineWidth = 7;
                g.beginPath();
                g.arc(cx, cy, 24, 0, Math.PI * 2);
                g.stroke();
                g.fillStyle = "#9d988c";
                g.beginPath();
                g.arc(cx, cy, 12, 0, Math.PI * 2);
                g.fill();
            }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    return t;
}

function seoulSign(): CanvasTexture {
    return canvasTexture(1024, 256, (g) => {
        g.fillStyle = "#3b2a22";
        g.fillRect(0, 0, 1024, 256);
        g.fillStyle = "#ff5fb0";
        g.font = `800 112px ${SANS}`;
        tracked(g, "SEOUL GARDEN", 512, 96, 8);
        g.font = `700 52px ${SANS}`;
        tracked(g, "KOREAN BBQ BUFFET", 512, 196, 10);
    });
}

function allYouCanEat(): CanvasTexture {
    return canvasTexture(256, 192, (g) => {
        g.fillStyle = "#e0372e";
        g.font = `900 78px ${SANS}`;
        g.textAlign = "left";
        g.textBaseline = "middle";
        g.fillText("ALL YOU", 6, 56);
        g.fillText("CAN EAT", 6, 136);
    });
}

function dwSign(): CanvasTexture {
    return canvasTexture(1024, 112, (g) => {
        g.shadowColor = "rgba(255, 214, 120, 0.9)";
        g.shadowBlur = 14;
        g.fillStyle = "#f8dc92";
        g.font = `700 80px ${SERIF}`;
        tracked(g, "D.W. STEAKHOUSE", 512, 58, 12);
    });
}

function panel(text: string): CanvasTexture {
    return canvasTexture(512, 192, (g) => {
        g.fillStyle = "#e8772e";
        g.fillRect(0, 0, 512, 192);
        g.fillStyle = "#ffffff";
        g.font = `700 64px ${SANS}`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(text, 256, 96);
    });
}

/** A textured plane under the world shader, so it greys with its zone until explored. */
function Plane({ texture, w, h, at, transparent = false, repeat }: { texture: Texture; w: number; h: number; at: [number, number, number]; transparent?: boolean; repeat?: [number, number] }) {
    const geometry = useMemo(() => {
        const g = new PlaneGeometry(w, h);
        if (repeat) {
            const uv = g.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * repeat[0], uv.getY(i) * repeat[1]);
        }
        return g;
    }, [w, h, repeat]);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ map: texture, transparent, alphaTest: transparent ? 0.3 : 0 })), [texture, transparent]);
    return <mesh geometry={geometry} material={material} position={at} raycast={() => null} />;
}

/* ---------------------------------------------------------------- Seoul Garden */

const SG_H = 4;
const SG = { glassX: 4.8, glassW: 4.4, doorX: 0.2, pierX: 2.0 };

function seoulGardenParts(): BufferGeometry[] {
    const { x0, x1, z0, z1 } = SEOUL_GARDEN;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const timber = "#cfa974";
    const out: BufferGeometry[] = [
        box(w, SG_H, d, cx, SG_H / 2, cz, "#e4dccf"),
        // The timber beam along the front, and the roof edge over it.
        box(w + 0.4, 0.9, 0.5, cx, 3.55, z1 + 0.15, timber),
        box(w + 0.6, 0.2, d + 0.5, cx, SG_H + 0.1, cz + 0.2, "#d9b98a"),
    ];

    // The entrance bay: a lit, open glass front in black posts.
    out.push(box(2.2, 2.7, 0.1, SG.doorX, 1.45, z1 + 0.05, "#f2d98a"));
    for (const px of [-1, 1.4]) out.push(box(0.1, 2.9, 0.16, px, 1.45, z1 + 0.05, "#1c1c1c"));
    out.push(box(2.5, 0.1, 0.16, SG.doorX, 2.85, z1 + 0.05, "#1c1c1c"));

    // The poster pier: a frame with a grill plate on it, as a food poster would show (drawn, not photographed).
    out.push(box(0.95, 1.3, 0.1, SG.pierX, 1.7, z1 + 0.07, "#1c1c1c"));
    out.push(paint(new CircleGeometry(0.42, 22).translate(SG.pierX, 1.7, z1 + 0.14), "#2e2e30"));
    for (const [dx, dy] of [[-0.12, 0.1], [0.12, 0.06], [0, -0.14]]) out.push(box(0.22, 0.12, 0.03, SG.pierX + dx, 1.7 + dy, z1 + 0.17, "#d9534f"));
    for (const [dx, dy] of [[-0.27, -0.1], [0.28, -0.12], [0.2, 0.25]]) out.push(box(0.08, 0.08, 0.03, SG.pierX + dx, 1.7 + dy, z1 + 0.17, "#6bbf59"));

    // The glazed run: dark glass in timber mullions on a timber sill, with a long bench along it.
    out.push(box(SG.glassW - 0.1, 2.7, 0.1, SG.glassX, 1.75, z1 + 0.05, "#2b3340"));
    for (const mx of [2.6, 3.7, 4.8, 5.9, 7.0]) out.push(box(0.1, 2.7, 0.14, mx, 1.75, z1 + 0.07, timber));
    out.push(box(SG.glassW, 0.4, 0.14, SG.glassX, 0.2, z1 + 0.07, timber));
    out.push(box(4.2, 0.08, 0.45, SG.glassX, 0.5, z1 + 0.6, "#d9b98a"));
    for (const lx of [2.9, 4.8, 6.7]) out.push(box(0.1, 0.46, 0.4, lx, 0.23, z1 + 0.6, "#b8955e"));

    // Hanging plants along the beam.
    for (const hx of [1.0, 3.4, 5.6, 7.3]) out.push(box(0.4, 0.3, 0.3, hx, 3.0, z1 + 0.28, "#4f9a58"));

    // A row of clay jars along the top.
    for (let x = -2.4; x < 7.6; x += 0.95) {
        out.push(paint(new CylinderGeometry(0.17, 0.13, 0.34, 10).translate(x, SG_H + 0.37, z1 - 0.4), "#9b7255"));
        out.push(paint(new ConeGeometry(0.12, 0.12, 10).translate(x, SG_H + 0.6, z1 - 0.4), "#7d5a42"));
    }

    // The red popcorn cart by the door.
    const cartX = -0.3;
    const cartZ = z1 + 0.9;
    out.push(box(0.9, 0.7, 0.6, cartX, 0.75, cartZ, "#d6342c"));
    out.push(box(0.8, 0.5, 0.55, cartX, 1.35, cartZ, "#e8e4da"));
    out.push(box(0.95, 0.08, 0.7, cartX, 1.64, cartZ, "#d6342c"));
    for (const dx of [-0.52, 0.52]) out.push(paint(new CylinderGeometry(0.34, 0.34, 0.06, 14).rotateZ(Math.PI / 2).translate(cartX + dx, 0.34, cartZ), "#2a2a2a"));
    return out;
}

export function SeoulGarden() {
    const { x1, z1 } = SEOUL_GARDEN;
    const statics = useMemo(() => mergeParts(seoulGardenParts()), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const block = useMemo(() => blockTexture(), []);
    const sign = useMemo(() => seoulSign(), []);
    const eat = useMemo(() => allYouCanEat(), []);
    const wallH = 3.1;
    const walls: { x: number; w: number }[] = [
        { x: -2, w: 2 },
        { x: SG.pierX, w: 1.2 },
        { x: x1 - 0.5, w: 1 },
    ];
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            {walls.map(({ x, w }) => (
                <Plane key={x} texture={block} w={w} h={wallH} at={[x, wallH / 2, z1 + 0.06]} repeat={[w / 0.5, wallH / 0.5]} />
            ))}
            <Plane texture={sign} w={3.4} h={0.85} at={[SG.doorX, 3.55, z1 + 0.45]} />
            <Plane texture={eat} w={1.5} h={1.1} at={[3.9, 1.9, z1 + 0.22]} transparent />
        </>
    );
}

/* ---------------------------------------------------------------- D.W. Steakhouse */

const DW_H = 4.2;

function dwParts(): BufferGeometry[] {
    const { x0, x1, z0, z1 } = DW_STEAKHOUSE;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const black = "#1e2025";
    const out: BufferGeometry[] = [
        box(w, DW_H, d, cx, DW_H / 2, cz, "#e9e2d6"),
        // The timber fascia and the roof edge.
        box(w + 0.2, 1.0, 0.4, cx, 3.7, z1 + 0.1, "#b08a62"),
        box(w + 0.4, 0.2, d + 0.4, cx, DW_H + 0.1, cz + 0.1, "#8a6a4a"),
    ];

    // The door pane (lit, open) and the dark glass, in black frames.
    out.push(box(1.5, 2.6, 0.1, 10.5, 1.5, z1 + 0.05, "#f2d98a"));
    out.push(box(6.0, 2.8, 0.1, 14.3, 1.6, z1 + 0.05, "#23272f"));
    for (const px of [9.7, 11.3, 12.9, 14.5, 16.1, 17.3]) out.push(box(0.1, 3.0, 0.16, px, 1.6, z1 + 0.06, black));
    out.push(box(w, 0.12, 0.16, cx, 3.1, z1 + 0.06, black));
    out.push(box(w, 0.2, 0.16, cx, 0.1, z1 + 0.06, black));
    return out;
}

export function DwSteakhouse() {
    const { z1 } = DW_STEAKHOUSE;
    const statics = useMemo(() => mergeParts(dwParts()), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const sign = useMemo(() => dwSign(), []);
    const steak = useMemo(() => panel("Wagyu Beef Steak"), []);
    const burger = useMemo(() => panel("Wagyu Beef Burger"), []);
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <Plane texture={sign} w={5.6} h={0.62} at={[13.5, 3.7, z1 + 0.35]} transparent />
            <Plane texture={steak} w={1.9} h={0.72} at={[12.4, 1.5, z1 + 0.2]} />
            <Plane texture={burger} w={2.3} h={0.86} at={[15.6, 1.35, z1 + 0.2]} />
        </>
    );
}
