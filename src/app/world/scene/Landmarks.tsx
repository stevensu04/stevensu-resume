"use client";

import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import {
    BoxGeometry,
    BufferAttribute,
    CanvasTexture,
    CircleGeometry,
    Color,
    ConeGeometry,
    DoubleSide,
    ExtrudeGeometry,
    IcosahedronGeometry,
    MeshBasicMaterial,
    PlaneGeometry,
    SRGBColorSpace,
    Shape,
    TextureLoader,
    Vector2,
    type BufferGeometry,
    type Group,
    type Texture,
} from "three";
import { mergeParts, paint } from "./shading";
import { withWorldShader } from "./worldShader";
import { PALETTE } from "./Props";

/**
 * The things that say whose building it is (WORLD.md §3, §4), added at Steven's request:
 *
 * - **StarLens:** solar panels on the roof, north-facing as they would be in Brisbane. The project
 *   was a green-power trading desk; the door below still stays shut.
 * - **E.SUN:** the bank's mark, a round sign on the front. Steven supplied it (§4 rule 4, amended).
 * - **UQ:** the university crest over the entrance (supplied by Steven, an alumnus), jacarandas in
 *   flower either side, and two flags out front as they fly on campus: the Australian flag in the
 *   place of honour (the viewer's left) and the Aboriginal flag beside it, free to reproduce since
 *   2022. Both flags keep their full colours in an unexplored zone.
 * - **The prototype park (§4: models on plinths):** BrisPulse, a traffic-and-Olympics concept, gets
 *   a traffic signal and a winners' podium beside its blueprint table; ParkEase's plinth is a model
 *   car park with free-bay sensors; JourneyMate's is a model bus stop under a map pin.
 * - **The tennis fence:** dark green chain-link where the racquet leans (the easter egg), so it
 *   reads as a court, not a building site.
 * - **Skyveil:** Olie the owl on the garage roof, turning her head now and then.
 * - **The Gallery:** a white gallery with a glass front, sawtooth skylights, banners and a sculpture,
 *   in place of the Kenney office block it was.
 *
 * Static parts merge into one mesh under the shared world shader; the emblems are textured planes;
 * only Olie's head, the flags and the jacarandas move, and all of them stop under reduced motion.
 */

const STARLENS = { x: -22, z: -18, roof: 9.62 };
const UQ = { x: 2, front: -12.08, crestY: 11 };
const ESUN = { x: -31, front: -13.64, y: 5.3 };
/** The Australian flag on the viewer's left, as protocol puts it; the Aboriginal flag beside it. */
export const FLAGPOLES = { australian: { x: 7.4, z: -10.7 }, aboriginal: { x: 10.4, z: -10.7 } };
export const JACARANDAS = [
    { x: -11.5, z: -17, s: 1 },
    { x: 13.6, z: -19.5, s: 0.9 },
];
export const SIGNAL = { x: -33.2, z: 23 };
export const PODIUM = { x: -31, z: 26.9 };
const PLINTH_TOP = 1.1;
const PARKEASE = { x: -25, z: 24.5 };
const JOURNEYMATE = { x: -20, z: 24.5 };
export const TENNIS_FENCE = { x: 15.6, minZ: -17, maxZ: -7, returnTo: 19, h: 2.6 };
const SKYVEIL_ROOF = { x: 0.6, y: 6.05, z: 7 };
export const GALLERY = { x: 0, z: 23.5, w: 12, d: 7.6, h: 6.2 };
export const SCULPTURE = { x: -4.6, z: 29.1 };

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) =>
    paint(new BoxGeometry(w, h, d).translate(x, y, z), color);

/** A shape's outline (x, y), extruded `depth` along +z from z0. */
function extrude(points: [number, number][], depth: number, color: string): BufferGeometry {
    return paint(new ExtrudeGeometry(new Shape(points.map(([x, y]) => new Vector2(x, y))), { depth, bevelEnabled: false }), color);
}

/** Colour a geometry flat, without the baked sun: flags and screens read better unshaded. */
function flat(geometry: BufferGeometry, color: string): BufferGeometry {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    const c = new Color(color);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < geo.attributes.position.count; i++) colors.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
}

function solarPanels(): BufferGeometry[] {
    const parts: BufferGeometry[] = [];
    // Two rows of three, tilted to face north (−z): Brisbane is in the southern hemisphere. Raised
    // on frames so they clear the parapet and read from the street.
    const tilt = -0.25;
    const y = STARLENS.roof + 1.1;
    for (const row of [-1.7, 1.7])
        for (const col of [-2.15, 0, 2.15]) {
            const x = STARLENS.x + col;
            const z = STARLENS.z + row;
            const onPanel = (w: number, d: number, dx: number, dz: number, lift: number, color: string) =>
                paint(new BoxGeometry(w, 0.08, d).translate(dx, lift, dz).rotateX(tilt).translate(x, y, z), color);
            parts.push(onPanel(2, 1.5, 0, 0, 0, "#2b52a8"));
            // Cell lines, so they read as solar panels rather than blue slabs.
            parts.push(onPanel(2.02, 0.05, 0, 0, 0.02, "#a9c1ea"));
            for (const dx of [-0.5, 0.5]) parts.push(onPanel(0.05, 1.52, dx, 0, 0.02, "#a9c1ea"));
            for (const dx of [-0.85, 0.85]) {
                parts.push(box(0.1, 1.25, 0.1, x + dx, STARLENS.roof + 0.62, z + 0.6, PALETTE.slate));
                parts.push(box(0.1, 0.85, 0.1, x + dx, STARLENS.roof + 0.42, z - 0.6, PALETTE.slate));
            }
        }
    return parts;
}

/** BrisPulse: a full-size traffic signal by the table, and a podium for 2032. */
function brisPulse(): BufferGeometry[] {
    const { x, z } = SIGNAL;
    const lamp = (dy: number, color: string) => flat(new CircleGeometry(0.11, 14).translate(x, 2.9 + dy, z + 0.21), color);
    const p = PODIUM;
    return [
        box(0.14, 3.4, 0.14, x, 1.7, z, PALETTE.slate),
        box(0.4, 1.05, 0.36, x, 2.9, z, "#2b2f38"),
        lamp(0.32, "#e5484d"),
        lamp(0, "#3a3f4a"),
        lamp(-0.32, "#3a3f4a"),
        box(0.18, 0.26, 0.14, x, 1.15, z + 0.12, "#e2b33c"), // the pedestrian button
        // Gold in the middle, silver to its right, bronze to its left, as podiums stand.
        box(0.8, 0.6, 0.8, p.x, 0.3, p.z, PALETTE.white),
        box(0.8, 0.42, 0.8, p.x - 0.8, 0.21, p.z, PALETTE.white),
        box(0.8, 0.3, 0.8, p.x + 0.8, 0.15, p.z, PALETTE.white),
        box(0.82, 0.04, 0.82, p.x, 0.62, p.z, "#d4af37"),
        box(0.82, 0.04, 0.82, p.x - 0.8, 0.44, p.z, "#c0c4cc"),
        box(0.82, 0.04, 0.82, p.x + 0.8, 0.32, p.z, "#c58a4e"),
    ];
}

/** A toy car on a plinth: body, cabin, dark glass. Faces +z. */
function toyCar(x: number, y: number, z: number, color: string): BufferGeometry[] {
    return [box(0.34, 0.14, 0.62, x, y + 0.1, z, color), box(0.3, 0.12, 0.34, x, y + 0.23, z - 0.02, color), box(0.31, 0.07, 0.3, x, y + 0.23, z - 0.02, "#2a3446")];
}

/** ParkEase: a model car park, three bays taken and one free, with a sensor light over each. */
function parkEase(): BufferGeometry[] {
    const { x, z } = PARKEASE;
    const y = PLINTH_TOP;
    const parts = [box(1.86, 0.04, 1.86, x, y + 0.02, z, "#5a5f6b")];
    const bays = [-0.66, -0.22, 0.22, 0.66];
    for (const dx of [-0.88, ...bays.map((b) => b + 0.22)]) parts.push(box(0.03, 0.01, 0.8, x + dx, y + 0.045, z - 0.3, "#ffffff"));
    const cars = ["#d64545", "#e2b33c", PALETTE.accent, null];
    bays.forEach((dx, i) => {
        const car = cars[i];
        if (car) parts.push(...toyCar(x + dx, y + 0.04, z - 0.3, car));
        // The sensor: red over a taken bay, green over the free one.
        parts.push(box(0.04, 0.5, 0.04, x + dx, y + 0.29, z - 0.78, PALETTE.slate));
        parts.push(box(0.12, 0.08, 0.08, x + dx, y + 0.56, z - 0.78, car ? "#e5484d" : "#3fbf6a"));
    });
    // A blue "P" sign at the entrance, the letter in white boxes.
    const sx = x + 0.6;
    const sz = z + 0.55;
    parts.push(box(0.05, 0.7, 0.05, sx, y + 0.35, sz, PALETTE.slate));
    parts.push(box(0.42, 0.42, 0.04, sx, y + 0.9, sz, "#1f5fbf"));
    parts.push(box(0.06, 0.28, 0.02, sx - 0.07, y + 0.9, sz + 0.03, "#ffffff"));
    parts.push(box(0.14, 0.05, 0.02, sx, y + 1.02, sz + 0.03, "#ffffff"));
    parts.push(box(0.14, 0.05, 0.02, sx, y + 0.9, sz + 0.03, "#ffffff"));
    parts.push(box(0.05, 0.12, 0.02, sx + 0.07, y + 0.96, sz + 0.03, "#ffffff"));
    return parts;
}

/** JourneyMate: a model street with a bus at the stop and a little shelter. The map pin floats above. */
function journeyMate(): BufferGeometry[] {
    const { x, z } = JOURNEYMATE;
    const y = PLINTH_TOP;
    return [
        box(1.86, 0.03, 0.8, x, y + 0.015, z + 0.3, "#4b5161"),
        box(1.86, 0.01, 0.04, x, y + 0.035, z + 0.3, "#e2b33c"),
        box(1.86, 0.05, 0.4, x, y + 0.025, z - 0.3, "#cfcac0"),
        // The bus, nose to +x.
        box(1.1, 0.34, 0.32, x - 0.15, y + 0.22, z + 0.48, PALETTE.white),
        box(1.0, 0.12, 0.33, x - 0.15, y + 0.28, z + 0.48, "#2a3446"),
        box(0.04, 0.2, 0.28, x + 0.41, y + 0.24, z + 0.48, "#2a3446"),
        box(1.1, 0.04, 0.33, x - 0.15, y + 0.11, z + 0.48, "#0f8fa0"),
        // The stop: a shelter and its sign.
        box(0.6, 0.04, 0.3, x + 0.1, y + 0.5, z - 0.32, PALETTE.slate),
        box(0.6, 0.42, 0.02, x + 0.1, y + 0.29, z - 0.46, "#9fc4e8"),
        box(0.03, 0.62, 0.03, x + 0.6, y + 0.36, z - 0.2, PALETTE.slate),
        box(0.18, 0.14, 0.02, x + 0.6, y + 0.62, z - 0.19, "#3fbf6a"),
    ];
}

function flagpoles(): BufferGeometry[] {
    return Object.values(FLAGPOLES).flatMap(({ x, z }) => [
        box(0.7, 0.3, 0.7, x, 0.15, z, PALETTE.concrete),
        paint(new BoxGeometry(0.12, 7.6, 0.12).translate(x, 3.8 + 0.3, z), "#d6d8dc"),
        box(0.22, 0.22, 0.22, x, 7.98, z, "#d4af37"),
    ]);
}

/** The racquet's fence: dark green posts and rails, a tennis court's, with a short return at the far end. */
const FENCE_GREEN = "#24483a";
function tennisFence(): BufferGeometry[] {
    const { x, minZ, maxZ, returnTo, h } = TENNIS_FENCE;
    const parts: BufferGeometry[] = [];
    const runZ = maxZ - minZ;
    for (let z = minZ; z <= maxZ + 0.01; z += runZ / 5) parts.push(box(0.12, h, 0.12, x, h / 2, z, FENCE_GREEN));
    for (const y of [0.1, h / 2, h - 0.05]) parts.push(box(0.08, 0.08, runZ, x, y, (minZ + maxZ) / 2, FENCE_GREEN));
    const runX = returnTo - x;
    for (const dx of [runX / 2, runX]) parts.push(box(0.12, h, 0.12, x + dx, h / 2, minZ, FENCE_GREEN));
    for (const y of [0.1, h / 2, h - 0.05]) parts.push(box(runX, 0.08, 0.08, x + runX / 2, y, minZ, FENCE_GREEN));
    return parts;
}

/** The chain-link itself: one see-through green sheet per run, under the posts. */
function TennisMesh() {
    const { x, minZ, maxZ, returnTo, h } = TENNIS_FENCE;
    const geo = useMemo(
        () =>
            mergeParts([
                flat(new PlaneGeometry(maxZ - minZ, h - 0.15).rotateY(Math.PI / 2).translate(x, h / 2, (minZ + maxZ) / 2), FENCE_GREEN),
                flat(new PlaneGeometry(returnTo - x, h - 0.15).translate((x + returnTo) / 2, h / 2, minZ), FENCE_GREEN),
            ]),
        [x, minZ, maxZ, returnTo, h],
    );
    const mat = useMemo(
        () => withWorldShader(new MeshBasicMaterial({ vertexColors: true, side: DoubleSide, transparent: true, opacity: 0.38, depthWrite: false })),
        [],
    );
    return <mesh geometry={geo} material={mat} raycast={() => null} />;
}

/**
 * Jacarandas in flower, the way they are on campus every October: a short, leaning trunk, a wide
 * lilac crown and a ring of fallen blossom on the ground. The crowns sway like the kit's trees.
 */
const BLOSSOM = ["#8f6fd0", "#a689e0", "#7b5cc0", "#b59ce8"];
function jacarandaCrowns(): BufferGeometry[] {
    return JACARANDAS.flatMap(({ x, z, s }) => {
        const at = (dx: number, dy: number, dz: number) => [x + dx * s, dy * s, z + dz * s] as const;
        const trunk = paint(new BoxGeometry(0.42 * s, 3.2 * s, 0.42 * s).rotateZ(0.12).translate(...at(-0.15, 1.6, 0)), "#6b4a33");
        const limbs = [
            paint(new BoxGeometry(0.22 * s, 2 * s, 0.22 * s).rotateZ(-0.7).translate(...at(0.6, 3.6, 0.1)), "#6b4a33"),
            paint(new BoxGeometry(0.22 * s, 1.8 * s, 0.22 * s).rotateZ(0.65).translate(...at(-0.9, 3.5, -0.2)), "#6b4a33"),
            paint(new BoxGeometry(0.2 * s, 1.6 * s, 0.2 * s).rotateX(0.6).translate(...at(-0.1, 3.5, 0.8)), "#6b4a33"),
        ];
        const blobs: [number, number, number, number][] = [
            [0, 5, 0, 2],
            [1.6, 4.6, 0.4, 1.5],
            [-1.7, 4.5, -0.3, 1.5],
            [0.3, 4.4, 1.5, 1.4],
            [-0.4, 4.6, -1.5, 1.4],
            [0.6, 5.6, -0.4, 1.2],
        ];
        const crown = blobs.map(([dx, dy, dz, r], i) =>
            paint(new IcosahedronGeometry(r * s, 0).scale(1, 0.62, 1).rotateY(i).translate(...at(dx, dy, dz)), BLOSSOM[i % BLOSSOM.length]),
        );
        return [trunk, ...limbs, ...crown];
    });
}
function fallenBlossom(): BufferGeometry[] {
    return JACARANDAS.map(({ x, z, s }) => flat(new CircleGeometry(3 * s, 12).rotateX(-Math.PI / 2).translate(x + 0.2, 0.03, z + 0.3), "#c3b0ea"));
}

function gallery(): BufferGeometry[] {
    const { x, z, w, d, h } = GALLERY;
    const front = z + d / 2;
    const parts = [
        box(w, h, d, x, h / 2, z, PALETTE.white),
        // A plinth line along the base, as galleries have.
        box(w + 0.3, 0.35, d + 0.3, x, 0.175, z, "#cfcac0"),
        // The glass front: dark, full height of the ground floor, with mullions.
        box(7.4, 3.6, 0.12, x, 2.15, front + 0.04, "#2a3446"),
        ...[-2.47, 0, 2.47].map((dx) => box(0.12, 3.6, 0.16, x + dx, 2.15, front + 0.06, PALETTE.white)),
        // A thin cantilevered canopy over the door.
        box(8.6, 0.22, 1.8, x, 4.2, front + 0.9, PALETTE.white),
        // Two tall banners either side of the glass.
        box(0.9, 3.4, 0.06, x - 4.9, 3.6, front + 0.05, PALETTE.accent),
        box(0.9, 3.4, 0.06, x + 4.9, 3.6, front + 0.05, "#e2b33c"),
    ];
    // Sawtooth skylights on the roof, glazed faces towards the south (the cooler light here is north,
    // but these face the camera so the roofline reads as a gallery).
    for (const dz of [-2.4, 0, 2.4]) {
        const tooth = extrude(
            [
                [0, 0],
                [1.8, 0],
                [0, 1.2],
            ],
            w - 1.2,
            PALETTE.white,
        );
        // Build in the XY plane, then turn it so the triangle runs along z and the length along x.
        tooth.rotateY(Math.PI / 2).translate(x - (w - 1.2) / 2, h, z + dz + 0.9);
        parts.push(tooth);
        parts.push(box(w - 1.2, 1.0, 0.06, x, h + 0.55, z + dz + 0.92, "#8fb3e8"));
    }
    return parts;
}

function sculpture(): BufferGeometry[] {
    const { x, z } = SCULPTURE;
    return [
        box(1.6, 0.6, 1.6, x, 0.3, z, PALETTE.concrete),
        // A red arch: two legs and a lintel, slightly askew, the way outdoor pieces often are.
        box(0.3, 1.8, 0.3, x - 0.5, 1.5, z, "#d64545"),
        box(0.3, 1.4, 0.3, x + 0.5, 1.3, z, "#d64545"),
        box(1.4, 0.3, 0.3, x, 2.45, z, "#d64545"),
    ];
}

export default function Landmarks({ still }: { still: boolean }) {
    const statics = useMemo(
        () =>
            mergeParts([
                ...solarPanels(),
                ...flagpoles(),
                ...tennisFence(),
                ...fallenBlossom(),
                ...brisPulse(),
                ...parkEase(),
                ...journeyMate(),
                ...gallery(),
                ...sculpture(),
            ]),
        [],
    );
    const material = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    const crowns = useMemo(() => mergeParts(jacarandaCrowns()), []);
    const swaying = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true }), { sway: !still }), [still]);
    return (
        <>
            <mesh geometry={statics} material={material} raycast={() => null} />
            <mesh geometry={crowns} material={swaying} raycast={() => null} />
            <TennisMesh />
            <Emblem url="/world/brand/uq-crest.webp" width={2.6} height={3} position={[UQ.x, UQ.crestY, UQ.front + 1.05]} />
            <EsunSign />
            <Flag still={still} pole={FLAGPOLES.australian} kind="australian" />
            <Flag still={still} pole={FLAGPOLES.aboriginal} kind="aboriginal" />
            <Olie still={still} />
            <MapPin still={still} />
        </>
    );
}

/** JourneyMate's map pin: a red drop with a white dot, bobbing over the model bus stop. */
function MapPin({ still }: { still: boolean }) {
    const pinRef = useRef<Group>(null);
    const timeRef = useRef(0);
    const geo = useMemo(
        () =>
            mergeParts([
                paint(new IcosahedronGeometry(0.26, 1).translate(0, 0.3, 0), "#e5484d"),
                paint(new ConeGeometry(0.2, 0.42, 12).rotateX(Math.PI).translate(0, 0.02, 0), "#e5484d"),
                flat(new CircleGeometry(0.1, 16).translate(0, 0.32, 0.262), "#ffffff"),
                flat(new CircleGeometry(0.1, 16).rotateY(Math.PI).translate(0, 0.32, -0.262), "#ffffff"),
            ]),
        [],
    );
    const mat = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    useFrame((_, dt) => {
        if (!pinRef.current || still) return;
        timeRef.current += dt;
        pinRef.current.position.y = PLINTH_TOP + 1.55 + Math.sin(timeRef.current * 2) * 0.1;
        pinRef.current.rotation.y += dt * 0.8;
    });
    return (
        <group ref={pinRef} position={[JOURNEYMATE.x, PLINTH_TOP + 1.55, JOURNEYMATE.z]}>
            <mesh geometry={geo} material={mat} raycast={() => null} />
        </group>
    );
}

/** Marks a loaded image as colour data (sRGB) and sharpens it at a glancing angle. */
function asColour<T extends Texture>(texture: T): T {
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
}

/** A transparent image on a facade, under the world shader so it greys with its zone until explored. */
function Emblem({ url, width, height, position }: { url: string; width: number; height: number; position: [number, number, number] }) {
    const texture = useLoader(TextureLoader, url);
    const mat = useMemo(() => {
        return withWorldShader(new MeshBasicMaterial({ map: asColour(texture), transparent: true, alphaTest: 0.05 }));
    }, [texture]);
    return (
        <mesh position={position} material={mat} raycast={() => null}>
            <planeGeometry args={[width, height]} />
        </mesh>
    );
}

/** E.SUN's round mark on a white disc, like a bank's sign over the door. */
function EsunSign() {
    const texture = useLoader(TextureLoader, "/world/brand/esun.webp");
    const mat = useMemo(() => {
        return withWorldShader(new MeshBasicMaterial({ map: asColour(texture) }));
    }, [texture]);
    const plate = useMemo(() => mergeParts([paint(new CircleGeometry(1.42, 36).translate(ESUN.x, ESUN.y, ESUN.front + 0.05), "#ffffff")]), []);
    const plateMat = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    return (
        <>
            <mesh geometry={plate} material={plateMat} raycast={() => null} />
            <mesh position={[ESUN.x, ESUN.y, ESUN.front + 0.08]} material={mat} raycast={() => null}>
                <circleGeometry args={[1.3, 36]} />
            </mesh>
        </>
    );
}

/** Draws a seven-pointed (or five-pointed) star, outer radius r, the way the Australian flag has them. */
function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number, inner: number) {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 ? r * inner : r;
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        g.lineTo(cx + rad * Math.cos(a), cy + rad * Math.sin(a));
    }
    g.closePath();
    g.fill();
}

/** The Australian national flag on a 2:1 canvas: Union Jack, Commonwealth Star, Southern Cross. */
function australianFlagTexture(): CanvasTexture {
    const W = 512;
    const H = 256;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = "#012169";
    g.fillRect(0, 0, W, H);
    // The Union Jack in the canton.
    const cw = W / 2;
    const ch = H / 2;
    g.save();
    g.beginPath();
    g.rect(0, 0, cw, ch);
    g.clip();
    g.lineCap = "butt";
    g.strokeStyle = "#ffffff";
    g.lineWidth = ch / 5;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(cw, ch);
    g.moveTo(cw, 0);
    g.lineTo(0, ch);
    g.stroke();
    // St Patrick's red saltire, counterchanged: offset clockwise from the white.
    g.strokeStyle = "#c8102e";
    g.lineWidth = ch / 15;
    const o = ch / 30;
    g.beginPath();
    g.moveTo(0, o);
    g.lineTo(cw / 2, ch / 2 + o);
    g.moveTo(cw, ch - o);
    g.lineTo(cw / 2, ch / 2 - o);
    g.moveTo(cw - o * 2, 0);
    g.lineTo(cw / 2 - o, ch / 2);
    g.moveTo(o * 2, ch);
    g.lineTo(cw / 2 + o, ch / 2);
    g.stroke();
    g.fillStyle = "#ffffff";
    g.fillRect(cw / 2 - ch / 6, 0, ch / 3, ch);
    g.fillRect(0, ch / 2 - ch / 6, cw, ch / 3);
    g.fillStyle = "#c8102e";
    g.fillRect(cw / 2 - ch / 10, 0, ch / 5, ch);
    g.fillRect(0, ch / 2 - ch / 10, cw, ch / 5);
    g.restore();
    // The Commonwealth Star under the canton, and the Southern Cross on the fly.
    g.fillStyle = "#ffffff";
    star(g, cw / 2, H * 0.75, H * 0.15, 7, 0.44);
    const big = H / 14;
    star(g, W * 0.75, H * (1 / 6), big, 7, 0.44); // Gamma
    star(g, W * 0.75, H * (5 / 6), big, 7, 0.44); // Alpha
    star(g, W * 0.625, H * 0.43, big, 7, 0.44); // Beta
    star(g, W * 0.855, H * 0.375, big, 7, 0.44); // Delta
    star(g, W * 0.795, H * 0.56, H / 24, 5, 0.4); // Epsilon
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
}

/**
 * A flag on its pole, flying towards +x and drawn on both faces. The Aboriginal flag is black over
 * red with the yellow circle centred, half the flag's height across. Not under the world shader:
 * flags fly in their own colours from the start, never greyed out with an unexplored zone.
 */
function Flag({ still, pole, kind }: { still: boolean; pole: { x: number; z: number }; kind: "australian" | "aboriginal" }) {
    const flagRef = useRef<Group>(null);
    const timeRef = useRef(kind === "australian" ? 1.3 : 0);
    const W = 2.4;
    const H = 1.2;
    const aboriginal = useMemo(
        () =>
            mergeParts([
                flat(new PlaneGeometry(W, H / 2).translate(W / 2, H / 4, 0), "#000000"),
                flat(new PlaneGeometry(W, H / 2).translate(W / 2, -H / 4, 0), "#c8102e"),
                flat(new CircleGeometry(H / 4, 28).translate(W / 2, 0, 0.012), "#ffc72c"),
                flat(new CircleGeometry(H / 4, 28).rotateY(Math.PI).translate(W / 2, 0, -0.012), "#ffc72c"),
            ]),
        [],
    );
    const plane = useMemo(() => new PlaneGeometry(W, H).translate(W / 2, 0, 0), []);
    const mat = useMemo(
        () =>
            kind === "australian"
                ? new MeshBasicMaterial({ map: australianFlagTexture(), side: DoubleSide })
                : new MeshBasicMaterial({ vertexColors: true, side: DoubleSide }),
        [kind],
    );
    useFrame((_, dt) => {
        if (!flagRef.current || still) return;
        timeRef.current += dt;
        // A slow stir, not a flap: the flag swings a few degrees about its pole.
        flagRef.current.rotation.y = Math.sin(timeRef.current * 0.9) * 0.12;
    });
    return (
        <group ref={flagRef} position={[pole.x + 0.06, 7.2, pole.z]}>
            <mesh geometry={kind === "australian" ? plane : aboriginal} material={mat} raycast={() => null} />
        </group>
    );
}

/** Olie, Skyveil's owl: brown and cream, big eyes, ear tufts. Turns her head every few seconds. */
const OWL = { body: "#7a5230", wing: "#5f3f24", belly: "#ead9b6", face: "#e9d6ae", eye: "#f5c518", pupil: "#141414", beak: "#e08a1e" };

function Olie({ still }: { still: boolean }) {
    const headRef = useRef<Group>(null);
    const timeRef = useRef(0);
    const body = useMemo(
        () =>
            mergeParts([
                // An owl has no neck to speak of: a stout body, a little wider at the base.
                box(0.66, 0.42, 0.52, 0, 0.27, 0, OWL.body),
                box(0.6, 0.3, 0.48, 0, 0.6, 0, OWL.body),
                // Cream belly with brown chevrons.
                box(0.42, 0.6, 0.05, 0, 0.42, 0.27, OWL.belly),
                ...[0.28, 0.44, 0.6].flatMap((y) => [
                    box(0.12, 0.04, 0.02, -0.08, y, 0.3, OWL.body),
                    box(0.12, 0.04, 0.02, 0.08, y, 0.3, OWL.body),
                ]),
                // Wings folded at the sides, a short tail behind, feet gripping the ridge.
                box(0.1, 0.56, 0.42, -0.36, 0.4, -0.02, OWL.wing),
                box(0.1, 0.56, 0.42, 0.36, 0.4, -0.02, OWL.wing),
                box(0.36, 0.22, 0.1, 0, 0.1, -0.3, OWL.wing),
                box(0.14, 0.06, 0.18, -0.13, 0.03, 0.14, OWL.beak),
                box(0.14, 0.06, 0.18, 0.13, 0.03, 0.14, OWL.beak),
            ]),
        [],
    );
    const face = useMemo(
        () =>
            mergeParts([
                box(0.68, 0.5, 0.54, 0, 0.25, 0, OWL.body),
                // The facial disc: two pale rounds side by side, the shape that says "owl".
                flat(new CircleGeometry(0.2, 22).translate(-0.13, 0.26, 0.275), OWL.face),
                flat(new CircleGeometry(0.2, 22).translate(0.13, 0.26, 0.276), OWL.face),
                // Ear tufts, angled out.
                paint(new BoxGeometry(0.11, 0.24, 0.1).rotateZ(0.4).translate(-0.27, 0.56, 0.05), OWL.wing),
                paint(new BoxGeometry(0.11, 0.24, 0.1).rotateZ(-0.4).translate(0.27, 0.56, 0.05), OWL.wing),
                // Big yellow eyes, black pupils, a glint; a hooked beak between.
                flat(new CircleGeometry(0.125, 22).translate(-0.13, 0.28, 0.28), OWL.eye),
                flat(new CircleGeometry(0.125, 22).translate(0.13, 0.28, 0.28), OWL.eye),
                flat(new CircleGeometry(0.065, 16).translate(-0.13, 0.28, 0.284), OWL.pupil),
                flat(new CircleGeometry(0.065, 16).translate(0.13, 0.28, 0.284), OWL.pupil),
                flat(new CircleGeometry(0.022, 10).translate(-0.11, 0.3, 0.288), "#ffffff"),
                flat(new CircleGeometry(0.022, 10).translate(0.15, 0.3, 0.288), "#ffffff"),
                extrude(
                    [
                        [-0.06, 0.2],
                        [0.06, 0.2],
                        [0, 0.06],
                    ],
                    0.08,
                    OWL.beak,
                ).translate(0, 0, 0.26),
            ]),
        [],
    );
    const mat = useMemo(() => withWorldShader(new MeshBasicMaterial({ vertexColors: true })), []);
    useFrame((_, dt) => {
        if (!headRef.current || still) return;
        timeRef.current += dt;
        // Look one way, hold, look back, hold: a turn every few seconds, the way owls do it.
        const phase = timeRef.current % 8;
        const target = phase < 3 ? 0 : phase < 5 ? 0.9 : phase < 6.5 ? -0.6 : 0;
        headRef.current.rotation.y += (target - headRef.current.rotation.y) * Math.min(1, dt * 5);
    });
    return (
        <group position={[SKYVEIL_ROOF.x, SKYVEIL_ROOF.y, SKYVEIL_ROOF.z]} scale={1.5}>
            <mesh geometry={body} material={mat} raycast={() => null} />
            <group ref={headRef} position={[0, 0.74, 0]}>
                <mesh geometry={face} material={mat} raycast={() => null} />
            </group>
        </group>
    );
}
