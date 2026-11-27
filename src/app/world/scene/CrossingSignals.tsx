"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { BoxGeometry, CanvasTexture, CylinderGeometry, MeshBasicMaterial, MeshLambertMaterial, SRGBColorSpace, type BufferGeometry } from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";

/**
 * Pedestrian crossing signals (27 Nov 2026, Steven's request): an Australian push-button pole at
 * each end of the two zebra crossings (placements.ts: the street at x = 4, the night street at
 * x = −4). Anyone who has lived here knows the button: press it, it answers with a beep, the green
 * man comes on with the rapid "tick-tick-tick", then the red man flashes and it's back to red.
 *
 * Click a pole (Global view or Explore) and that crossing runs the cycle. The sound is synthesised
 * with Web Audio, only ever after a press, so nothing plays unasked and there are no files to load.
 * Under reduced motion the flashing red holds steady; the sound still plays, because it was asked for.
 *
 * Draw calls: one merged mesh for the poles, one textured plane per pole for the sign and button,
 * and one per signal head (each crossing's two heads share a material, so they change together).
 */

/** Kenney's crossing tile: footpaths 3.2–4 m either side of the road's centre line, 0.16 m tall. */
const CROSSINGS = [
    { x: 4, z: -4 },
    { x: -4, z: 52 },
];
const FOOTPATH = 3.55;
const KERB = 0.16;
/** West of the stripes, so the button faces east, towards the crossing and the default camera. */
const POLE_DX = -1.5;
const POLE_H = 3.0;
const HEAD = { w: 0.36, h: 0.62, d: 0.22, y: 2.55 };

/** Seconds after a press: a short wait, the green man, then the flashing red man. */
const T = { green: 2, flash: 8, done: 12 };

const C = {
    pole: "#9aa1ad",
    housing: "#1d1f24",
    button: "#2a2c31",
};

type Phase = "red" | "green" | "dark";

/* ---------------------------------------------------------------- the sound */

let audio: AudioContext | null = null;

/** A short chirp: a square wave swept from f0 to f1, gone in `len` seconds. */
function chirp(ctx: AudioContext, at: number, f0: number, f1: number, len: number, level: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(f0, at);
    osc.frequency.exponentialRampToValueAtTime(f1, at + len);
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + len + 0.02);
}

/** The whole cycle's sound, scheduled at once from the press. */
function playCycle() {
    if (typeof window === "undefined") return;
    audio ??= new AudioContext();
    const ctx = audio;
    if (ctx.state === "suspended") void ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    // The press: a quick two-note beep.
    chirp(ctx, t0, 1400, 1300, 0.07, 0.08);
    chirp(ctx, t0 + 0.09, 1400, 1300, 0.07, 0.08);
    // Green man: the rapid tick, about eight a second.
    for (let t = T.green; t < T.flash; t += 0.125) chirp(ctx, t0 + t, 2600, 700, 0.03, 0.06);
    // Flashing red: back to the slow locator tock.
    for (let t = T.flash; t < T.done; t += 0.6) chirp(ctx, t0 + t, 900, 850, 0.04, 0.05);
}

/* ---------------------------------------------------------------- the textures */

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

/** A pictogram figure, standing (red) or walking (green), centred on (cx, cy), `s` tall. */
function figure(g: CanvasRenderingContext2D, cx: number, cy: number, s: number, walking: boolean, color: string) {
    g.fillStyle = color;
    g.strokeStyle = color;
    g.lineCap = "round";
    g.lineWidth = s * 0.13;
    const top = cy - s / 2;
    g.beginPath();
    g.arc(cx, top + s * 0.09, s * 0.09, 0, Math.PI * 2);
    g.fill();
    const hip = top + s * 0.58;
    g.beginPath();
    g.moveTo(cx, top + s * 0.22);
    g.lineTo(cx, hip);
    if (walking) {
        // Mid-stride: one leg forward, one back; arms swinging.
        g.moveTo(cx, hip);
        g.lineTo(cx + s * 0.2, top + s);
        g.moveTo(cx, hip);
        g.lineTo(cx - s * 0.18, top + s);
        g.moveTo(cx, top + s * 0.27);
        g.lineTo(cx + s * 0.2, top + s * 0.48);
        g.moveTo(cx, top + s * 0.27);
        g.lineTo(cx - s * 0.18, top + s * 0.46);
    } else {
        // Standing square: legs together, arms down.
        g.moveTo(cx - s * 0.06, hip);
        g.lineTo(cx - s * 0.08, top + s);
        g.moveTo(cx + s * 0.06, hip);
        g.lineTo(cx + s * 0.08, top + s);
        g.moveTo(cx - s * 0.07, top + s * 0.26);
        g.lineTo(cx - s * 0.12, top + s * 0.56);
        g.moveTo(cx + s * 0.07, top + s * 0.26);
        g.lineTo(cx + s * 0.12, top + s * 0.56);
    }
    g.stroke();
}

/** The signal head's face: a red man over a green man, one of them lit (or neither, mid-flash). */
function headTexture(phase: Phase): CanvasTexture {
    return canvasTexture(128, 224, (g) => {
        g.fillStyle = C.housing;
        g.fillRect(0, 0, 128, 224);
        for (const [cy, lit, walking, on, off] of [
            [58, phase === "red", false, "#ff3b2f", "#4a1c1a"],
            [166, phase === "green", true, "#3dff7a", "#163824"],
        ] as const) {
            g.fillStyle = "#0b0c0e";
            g.fillRect(14, cy - 50, 100, 100);
            figure(g, 64, cy, 80, walking, lit ? on : off);
        }
    });
}

/** The pole's face at hand height: the "WALK WITH CARE" sign over the push button. */
function buttonTexture(): CanvasTexture {
    return canvasTexture(128, 704, (g) => {
        // The sign: white, with the three rules as small figures.
        g.fillStyle = "#f4f4f2";
        g.beginPath();
        g.roundRect(4, 4, 120, 420, 18);
        g.fill();
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.font = '800 26px "Helvetica Neue", Helvetica, Arial, sans-serif';
        g.fillStyle = "#16a34a";
        g.fillText("WALK", 64, 34);
        g.fillStyle = "#1f2937";
        g.fillText("WITH", 64, 62);
        g.fillStyle = "#dc2626";
        g.fillText("CARE", 64, 90);
        for (const [cy, walking, color] of [
            [160, false, "#dc2626"],
            [255, true, "#16a34a"],
            [350, false, "#dc2626"],
        ] as const) {
            g.strokeStyle = "#1f2937";
            g.lineWidth = 3;
            g.strokeRect(34, cy - 38, 60, 76);
            figure(g, 64, cy, 56, walking, color);
        }
        // The button box: black, an arrow on a blue plate, a round steel button below.
        g.fillStyle = C.housing;
        g.beginPath();
        g.roundRect(8, 452, 112, 248, 22);
        g.fill();
        g.fillStyle = "#1f3d7a";
        g.beginPath();
        g.roundRect(20, 466, 88, 110, 12);
        g.fill();
        g.fillStyle = "#f4f4f2";
        g.beginPath();
        g.moveTo(64, 478);
        g.lineTo(98, 530);
        g.lineTo(78, 530);
        g.lineTo(78, 566);
        g.lineTo(50, 566);
        g.lineTo(50, 530);
        g.lineTo(30, 530);
        g.closePath();
        g.fill();
        const steel = g.createRadialGradient(58, 628, 4, 64, 636, 38);
        steel.addColorStop(0, "#f2f4f7");
        steel.addColorStop(1, "#8d939c");
        g.fillStyle = "#3a3d44";
        g.beginPath();
        g.arc(64, 636, 42, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = steel;
        g.beginPath();
        g.arc(64, 636, 34, 0, Math.PI * 2);
        g.fill();
    });
}

/* ---------------------------------------------------------------- the poles */

type Pole = { x: number; z: number; crossing: number; facing: 1 | -1 };

const POLES: Pole[] = CROSSINGS.flatMap((c, crossing) => [
    // North footpath: the head faces south, across the road. South footpath: the head faces north.
    { x: c.x + POLE_DX, z: c.z - FOOTPATH, crossing, facing: 1 as const },
    { x: c.x + POLE_DX, z: c.z + FOOTPATH, crossing, facing: -1 as const },
]);

function poleParts({ x, z, facing }: Pole): BufferGeometry[] {
    const box = (w: number, h: number, d: number, px: number, py: number, pz: number, color: string) => paint(new BoxGeometry(w, h, d).translate(px, py, pz), color);
    return [
        paint(new CylinderGeometry(0.06, 0.07, POLE_H, 8).translate(x, KERB + POLE_H / 2, z), C.pole),
        // The signal head, facing across the road, with a hood over each lamp.
        box(HEAD.w, HEAD.h, HEAD.d, x, HEAD.y, z + facing * 0.12, C.housing),
        box(HEAD.w + 0.04, 0.03, 0.12, x, HEAD.y + 0.3, z + facing * 0.28, C.housing),
        box(HEAD.w + 0.04, 0.03, 0.12, x, HEAD.y, z + facing * 0.28, C.housing),
        // The sign and button's backing on the pole's east side.
        box(0.06, 1.1, 0.2, x + 0.08, KERB + 1.25, z, C.button),
    ];
}

export default function CrossingSignals({ still }: { still: boolean }) {
    const statics = useMemo(() => mergeParts(POLES.flatMap(poleParts)), []);
    const material = useMemo(() => withWorldShader(new MeshLambertMaterial({ vertexColors: true })), []);
    const buttonMat = useMemo(() => withWorldShader(new MeshLambertMaterial({ map: buttonTexture() })), []);
    const faces = useMemo(() => ({ red: headTexture("red"), green: headTexture("green"), dark: headTexture("dark") }), []);
    // Unlit, so a lit lamp stays bright in shade and at night.
    const heads = useMemo(() => CROSSINGS.map(() => withWorldShader(new MeshBasicMaterial({ map: faces.red }))), [faces]);
    const clock = useThree((s) => s.clock);
    const pressedAt = useRef<number[]>(CROSSINGS.map(() => -Infinity));
    const shown = useRef<Phase[]>(CROSSINGS.map(() => "red"));

    useEffect(
        () => () => {
            for (const t of Object.values(faces)) t.dispose();
            buttonMat.map?.dispose();
        },
        [faces, buttonMat],
    );

    useFrame((state) => {
        const now = state.clock.elapsedTime;
        CROSSINGS.forEach((_, i) => {
            const t = now - pressedAt.current[i];
            let phase: Phase = "red";
            if (t >= T.green && t < T.flash) phase = "green";
            else if (t >= T.flash && t < T.done && !still && Math.floor((t - T.flash) * 2) % 2 === 1) phase = "dark";
            if (phase !== shown.current[i]) {
                shown.current[i] = phase;
                heads[i].map = faces[phase];
                heads[i].needsUpdate = true;
            }
        });
    });

    const press = (crossing: number) => (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        // A press that turned into a drag was an orbit, not a click (Global view).
        if (e.delta > 6) return;
        // The same clock useFrame reads, so the lamps and the sound start together.
        const now = clock.elapsedTime;
        if (now - pressedAt.current[crossing] < T.done) return; // already running: one press is enough
        pressedAt.current[crossing] = now;
        playCycle();
    };

    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            {POLES.map((p, i) => (
                <group key={i} position={[p.x, 0, p.z]}>
                    <mesh position={[0.112, KERB + 1.25, 0]} rotation-y={Math.PI / 2} material={buttonMat} raycast={() => null}>
                        <planeGeometry args={[0.2, 1.1]} />
                    </mesh>
                    <mesh position={[0, HEAD.y, p.facing * 0.235]} rotation-y={p.facing === 1 ? 0 : Math.PI} material={heads[p.crossing]} raycast={() => null}>
                        <planeGeometry args={[HEAD.w - 0.04, HEAD.h - 0.04]} />
                    </mesh>
                    {/* An easy target round the pole: the button itself is only a few pixels across. */}
                    <mesh
                        position={[0, 1.6, 0]}
                        visible={false}
                        onClick={press(p.crossing)}
                        onPointerOver={(e) => {
                            e.stopPropagation();
                            document.body.style.cursor = "pointer";
                        }}
                        onPointerOut={() => {
                            document.body.style.cursor = "";
                        }}
                    >
                        <boxGeometry args={[1.1, 3.2, 1.1]} />
                    </mesh>
                </group>
            ))}
        </>
    );
}
