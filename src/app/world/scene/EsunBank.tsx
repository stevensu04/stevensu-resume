"use client";

import { useEffect, useMemo } from "react";
import { BoxGeometry, CanvasTexture, IcosahedronGeometry, MeshLambertMaterial, SRGBColorSpace, type BufferGeometry } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * 1 · E.SUN Bank's branch (WORLD.md §3), in place of the Kenney block it was: Steven's first job was
 * at a bank, and the building should read as one. After the photograph he chose (26 Nov 2026): a
 * dark stone building over a recessed glass front, a deep canopy with downlights, a teal fascia
 * lit from within carrying the round mark and the name ("E.SUN BANK", in Latin letters), three steps up to a porch, a
 * bonsai and a clipped bush in stone planters, and two ATMs under the canopy beside the door, with
 * a lit "ATM" sign over them.
 *
 * The teal fascia, the warm panes and downlights, and the ATM screens are lamp colours (shading.ts),
 * so they stay lit at night. The mark itself is Landmarks.tsx's (`EsunSign`); the lettering here.
 * It keeps the old building's footprint, so the walk grid, the hit area and the zone stay valid.
 *
 * Draw calls: one merged static mesh, and two lettering planes.
 */

/** Footprint of the building proper, metres. The front (z1) faces +z, towards the default camera. */
export const ESUN_BANK = { x0: -34.6, x1: -27.4, z0: -21.6, z1: -14.2 };
const CX = (ESUN_BANK.x0 + ESUN_BANK.x1) / 2;
const W = ESUN_BANK.x1 - ESUN_BANK.x0;
const H = 9;
/** The glass front is recessed this far under the canopy; the porch floor is this high. */
const RECESS = 1.4;
const PORCH = 0.45;
/** The fascia's centre height; the mark and the lettering sit on it. */
export const FASCIA_Y = 5.8;

const C = {
    stone: "#566170",
    stoneDark: "#434c59",
    stoneLight: "#d7d3c8",
    teal: "#19b3aa",
    tealDark: "#0e5f62",
    glass: "#9fd6d2",
    lit: "#f2d98a",
    band: "#8fb7c9",
    roof: "#3d4650",
    atm: "#2c3f43",
    atmDark: "#1b2427",
    screen: "#2fb5e8",
    slot: "#fbfdff",
    leaf: "#2f6a45",
    leafLight: "#3f7a4a",
    trunk: "#6b4a35",
    pot: "#c9c4b8",
};

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);
const blob = (r: number, x: number, y: number, z: number, color: string) => paint(new IcosahedronGeometry(r, 0).translate(x, y, z), color);

function parts(): BufferGeometry[] {
    const { x0, x1, z0, z1 } = ESUN_BANK;
    const out: BufferGeometry[] = [];
    const frontCore = z1 - RECESS; // the ground floor's wall, behind the glass
    const upperFront = z1 - 0.3;

    // The body: a recessed ground floor under a stone upper block that overhangs it as the canopy.
    out.push(box(W, 4.45, frontCore - z0, CX, 2.225, (z0 + frontCore) / 2, C.stoneDark));
    out.push(box(W, H - 4.45, upperFront - z0, CX, (H + 4.45) / 2, (z0 + upperFront) / 2, C.stone));
    // The roof edge, and two plant units on it.
    out.push(box(W + 0.2, 0.25, upperFront - z0 + 0.2, CX, H + 0.12, (z0 + upperFront) / 2, C.roof));
    out.push(box(1.6, 0.7, 1.2, CX - 1.8, H + 0.6, z0 + 2, C.stoneLight), box(1.2, 0.5, 1.0, CX + 1.6, H + 0.5, z0 + 2.6, C.stoneLight));

    // The fascia: teal, lit, with a pale trim above and below. The mark and name are planes on it.
    out.push(box(W + 0.1, 2.2, 0.3, CX, FASCIA_Y, z1 - 0.15, C.teal));
    out.push(box(W + 0.2, 0.1, 0.4, CX, FASCIA_Y + 1.15, z1 - 0.15, C.stoneLight), box(W + 0.2, 0.1, 0.4, CX, FASCIA_Y - 1.15, z1 - 0.15, C.stoneLight));
    // The upper floor's ribbon window across the front, and along both sides.
    out.push(box(W - 1, 1.1, 0.05, CX, 7.9, upperFront + 0.02, C.band));
    for (let x = x0 + 1.1; x < x1 - 0.8; x += 1.2) out.push(box(0.08, 1.1, 0.07, x, 7.9, upperFront + 0.03, C.stoneDark));
    for (const x of [x0 - 0.02, x1 + 0.02]) out.push(box(0.05, 1.1, upperFront - z0 - 1.6, x, 7.9, (z0 + upperFront) / 2, C.band));
    for (const x of [x0 - 0.02, x1 + 0.02]) out.push(box(0.05, 1.1, upperFront - z0 - 1.6, x, 6.2, (z0 + upperFront) / 2, C.band));

    // The porch and its three steps up from the pavement.
    out.push(box(W, PORCH, RECESS - 0.3, CX, PORCH / 2, z1 - 0.3 - (RECESS - 0.3) / 2, C.stoneLight));
    out.push(box(4, 0.3, 0.4, CX, 0.15, z1 - 0.1, C.stoneLight), box(4, 0.15, 0.4, CX, 0.075, z1 + 0.3, C.stoneLight));

    // The glass front, seven bays, under a dark teal frame. The middle three are lit warm: the door, and the lobby.
    const gz = frontCore + 0.04;
    const bays = 7;
    const bw = (W - 0.4) / bays;
    for (let i = 0; i < bays; i++) {
        const x = x0 + 0.2 + bw * (i + 0.5);
        out.push(box(bw - 0.1, 3.6, 0.06, x, PORCH + 0.1 + 1.8, gz, i >= 2 && i <= 4 ? C.lit : C.glass));
    }
    for (let i = 0; i <= bays; i++) out.push(box(0.1, 3.8, 0.12, x0 + 0.2 + bw * i, PORCH + 1.95, gz + 0.02, C.tealDark));
    out.push(box(W - 0.2, 0.12, 0.12, CX, 4.18, gz + 0.02, C.tealDark), box(W - 0.2, 0.1, 0.12, CX, PORCH + 0.07, gz + 0.02, C.tealDark));
    // The door's pull handles.
    for (const x of [CX - 0.18, CX + 0.18]) out.push(box(0.03, 0.6, 0.04, x, 1.5, gz + 0.08, C.stoneLight));
    // Downlights under the canopy, in two rows.
    for (let i = 0; i < 5; i++) for (const z of [z1 - 0.55, z1 - 1.05]) out.push(box(0.26, 0.03, 0.26, x0 + 0.7 + i * 1.45, 4.43, z, C.lit));

    // Two ATMs on the porch, to the right of the door, facing the street; a lit sign over them.
    for (const x of [CX + 2.35, CX + 3.15]) {
        const z = frontCore + 0.55;
        out.push(box(0.7, 1.7, 0.5, x, PORCH + 0.85, z, C.atm));
        out.push(box(0.74, 0.12, 0.56, x, PORCH + 1.76, z, C.tealDark));
        out.push(box(0.44, 0.32, 0.03, x, PORCH + 1.3, z + 0.265, C.screen));
        out.push(box(0.38, 0.05, 0.22, x, PORCH + 0.98, z + 0.3, C.atmDark));
        out.push(box(0.16, 0.03, 0.03, x - 0.2, PORCH + 1.08, z + 0.265, C.slot));
        out.push(box(0.34, 0.07, 0.03, x, PORCH + 0.68, z + 0.265, C.atmDark), box(0.3, 0.02, 0.035, x, PORCH + 0.68, z + 0.27, C.slot));
    }
    out.push(box(1.7, 0.4, 0.1, CX + 2.75, 3.15, frontCore + 0.1, C.teal));

    // The planters: a bonsai on the left, a clipped bush on the right.
    out.push(box(1.3, 0.6, 0.9, CX - 2.9, 0.3, z1 + 0.2, C.pot), box(1.3, 0.6, 0.9, CX + 2.9, 0.3, z1 + 0.2, C.pot));
    out.push(box(0.14, 1.0, 0.14, CX - 2.9, 1.1, z1 + 0.2, C.trunk), box(0.1, 0.5, 0.1, CX - 2.65, 1.0, z1 + 0.2, C.trunk));
    out.push(blob(0.62, CX - 2.95, 1.95, z1 + 0.2, C.leaf), blob(0.42, CX - 2.45, 1.6, z1 + 0.25, C.leafLight), blob(0.38, CX - 3.35, 1.55, z1 + 0.15, C.leafLight));
    out.push(blob(0.65, CX + 2.9, 1.0, z1 + 0.2, C.leaf), blob(0.4, CX + 3.3, 0.85, z1 + 0.25, C.leafLight));
    return out;
}

/** White lettering on a transparent canvas; the plane it is on lights it (an unlit material, so it glows). */
function lettering(text: string, width: number, height: number, weight: number): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");
    if (g) {
        g.fillStyle = "#ffffff";
        // As large as fits across 92% of the plane, so the name fills the fascia whatever the font.
        let size = height * 0.78;
        do g.font = `${weight} ${size}px ${FONT}`;
        while (g.measureText(text).width > width * 0.92 && (size -= 4) > 12);
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(text, width / 2, height / 2 + height * 0.04);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

const FONT = '"Helvetica Neue", Arial, "Segoe UI", sans-serif';

export default function EsunBank() {
    const geometry = useMemo(() => mergeParts(parts()), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const name = useMemo(() => lettering("E.SUN BANK", 640, 160, 700), []);
    const atm = useMemo(() => lettering("ATM", 256, 64, 700), []);
    useEffect(
        () => () => {
            name.dispose();
            atm.dispose();
            geometry.dispose();
        },
        [name, atm, geometry],
    );
    const { z1 } = ESUN_BANK;
    return (
        <>
            <mesh geometry={geometry} material={material} raycast={() => null} />
            <mesh position={[CX + 1.0, FASCIA_Y, z1 + 0.02]} raycast={() => null}>
                <planeGeometry args={[3.7, 3.7 * (160 / 640)]} />
                <meshBasicMaterial map={name} transparent toneMapped={false} />
            </mesh>
            <mesh position={[CX + 2.75, 3.15, z1 - RECESS + 0.16]} raycast={() => null}>
                <planeGeometry args={[1.2, 0.3]} />
                <meshBasicMaterial map={atm} transparent toneMapped={false} />
            </mesh>
        </>
    );
}

