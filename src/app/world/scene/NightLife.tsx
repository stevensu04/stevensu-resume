"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
    AdditiveBlending,
    BufferGeometry,
    CanvasTexture,
    Float32BufferAttribute,
    InstancedMesh,
    Matrix4,
    MeshBasicMaterial,
    PlaneGeometry,
    Points,
    PointsMaterial,
    Quaternion,
    SRGBColorSpace,
    Sprite,
    SpriteMaterial,
    Vector3,
} from "three";
import { PLACEMENTS } from "../placements";
import { LOOK } from "./look";
import { placementTransform } from "./KitInstances";
import { useKit } from "./useKit";

/**
 * What night adds beyond the dimmer light (26 Nov 2026): a moon and stars in the sky, and the street
 * lamps lit, each with a halo at the lamp and a warm pool of light on the ground under it.
 *
 * None of it is a real light. Moonlight is the scene's directional light (Lighting.tsx, from the same
 * direction as the day's sun, so the baked shadows fit); a point light per lamp would cost a lit
 * pass each. The lamps are additive sprites and one instanced disc each, which cost two draw calls
 * for all eleven. Everything fades with the same ~1.2 s ease as the lights (at once under reduced motion).
 */

/** Eases 0 (day) to 1 (night) like Lighting.tsx does, one step per frame. */
function stepBlend(current: number, night: boolean, still: boolean, dt: number): number {
    const goal = night ? 1 : 0;
    return still ? goal : current + Math.sign(goal - current) * Math.min(Math.abs(goal - current), dt / 1.2);
}

function radialTexture(size: number, draw: (g: CanvasRenderingContext2D, size: number) => void): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d");
    if (g) draw(g, size);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
}

const glow = (g: CanvasRenderingContext2D, s: number, stops: [number, string][]) => {
    const gradient = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    for (const [at, colour] of stops) gradient.addColorStop(at, colour);
    g.fillStyle = gradient;
    g.fillRect(0, 0, s, s);
};

/* ---------------------------------------------------------------- the moon and stars */

/** Out past the island but inside the camera's far plane (1500 m). */
const SKY_DISTANCE = 1000;
const MOON_AT = new Vector3(...LOOK.sunDirection).normalize().multiplyScalar(SKY_DISTANCE);
const MOON_SIZE = 300;
const STARS = 160;

/**
 * The moon hangs where the day's sun does, so the moonlight comes from it. A sprite, which always
 * faces the camera. Stars are fixed pixels on the upper dome. Both are the sky of Explore, where
 * the camera looks level; Global view's sky is Scene's own backdrop (it looks down on the island).
 */
export function NightSky({ night, still }: { night: boolean; still: boolean }) {
    const blend = useRef(night ? 1 : 0);
    const moon = useRef<Sprite>(null);
    const stars = useRef<Points>(null);
    const moonMaterial = useRef<SpriteMaterial>(null);
    const starMaterial = useRef<PointsMaterial>(null);
    const assets = useMemo(() => {
        const texture = radialTexture(256, (g, s) => {
            glow(g, s, [
                [0, "rgba(255,248,214,0.55)"],
                [0.3, "rgba(214,226,255,0.22)"],
                [1, "rgba(214,226,255,0)"],
            ]);
            // The disc, a little grey seas on it.
            g.fillStyle = "#fbf4d6";
            g.beginPath();
            g.arc(s / 2, s / 2, s * 0.17, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = "rgba(190,180,140,0.35)";
            for (const [x, y, r] of [[-0.05, -0.04, 0.045], [0.06, 0.03, 0.035], [-0.02, 0.07, 0.025]]) {
                g.beginPath();
                g.arc(s / 2 + x * s, s / 2 + y * s, r * s, 0, Math.PI * 2);
                g.fill();
            }
        });
        // Seeded, so the stars are the same every visit: spread over the upper dome, none below the horizon.
        const positions: number[] = [];
        let seed = 7;
        const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        for (let i = 0; i < STARS; i++) {
            const az = rand() * Math.PI * 2;
            const el = Math.asin(0.08 + rand() * 0.92);
            positions.push(Math.cos(az) * Math.cos(el) * SKY_DISTANCE * 0.9, Math.sin(el) * SKY_DISTANCE * 0.9, Math.sin(az) * Math.cos(el) * SKY_DISTANCE * 0.9);
        }
        const geometry = new BufferGeometry().setAttribute("position", new Float32BufferAttribute(positions, 3));
        return { texture, geometry };
    }, []);
    useEffect(
        () => () => {
            assets.texture.dispose();
            assets.geometry.dispose();
        },
        [assets],
    );
    useFrame((_, dt) => {
        const b = (blend.current = stepBlend(blend.current, night, still, Math.min(dt, 0.1)));
        if (moonMaterial.current) moonMaterial.current.opacity = b;
        if (starMaterial.current) starMaterial.current.opacity = b * 0.85;
        if (moon.current) moon.current.visible = b > 0.01;
        if (stars.current) stars.current.visible = b > 0.01;
    });
    return (
        <>
            <sprite ref={moon} position={MOON_AT} scale={[MOON_SIZE, MOON_SIZE, 1]} raycast={() => null}>
                <spriteMaterial ref={moonMaterial} map={assets.texture} transparent depthWrite={false} fog={false} toneMapped={false} opacity={0} />
            </sprite>
            <points ref={stars} geometry={assets.geometry} frustumCulled={false} raycast={() => null}>
                <pointsMaterial ref={starMaterial} color="#ffffff" size={2.4} sizeAttenuation={false} transparent depthWrite={false} fog={false} toneMapped={false} opacity={0} />
            </points>
        </>
    );
}

/* ---------------------------------------------------------------- the street lamps */

/**
 * Where each Kenney lamp's light is, in the model's own space (kit units; 8 m a unit): over the end of
 * its arm, a little below the top. Read from kit.glb's vertices (the arm's tip, 0.9 of the way up).
 */
const HEAD: Record<string, [number, number, number]> = {
    "light-square": [0, 0.57, -0.193],
    "light-curved": [0, 0.64, -0.199],
};
const POOL_DIAMETER = 10;
const POOL_Y = 0.1;
const POOL_PLANE = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const ZERO = new Quaternion();

/** The lamps, lit. Mounts inside the Suspense with the stage: it needs the kit's own sizes. */
export function StreetLights({ night, still }: { night: boolean; still: boolean }) {
    const kit = useKit();
    const blend = useRef(night ? 1 : 0);
    const halos = useRef<Points>(null);
    const pools = useRef<InstancedMesh>(null);
    const haloMaterial = useRef<PointsMaterial>(null);
    const poolMaterial = useRef<MeshBasicMaterial>(null);
    const lamps = useMemo(() => {
        const heads: Vector3[] = [];
        for (const p of PLACEMENTS) {
            const head = HEAD[p.model];
            const model = kit.get(p.model);
            if (head && model) heads.push(new Vector3(...head).applyMatrix4(placementTransform(p, model).matrix));
        }
        return heads;
    }, [kit]);
    const assets = useMemo(() => {
        const haloTexture = radialTexture(128, (g, s) =>
            glow(g, s, [
                [0, "rgba(255,255,244,1)"],
                [0.12, "rgba(255,236,176,0.85)"],
                [0.4, "rgba(255,200,110,0.28)"],
                [1, "rgba(255,190,90,0)"],
            ]),
        );
        const poolTexture = radialTexture(128, (g, s) =>
            glow(g, s, [
                [0, "rgba(255,214,140,0.9)"],
                [0.45, "rgba(255,190,100,0.38)"],
                [1, "rgba(255,180,90,0)"],
            ]),
        );
        const geometry = new BufferGeometry().setFromPoints(lamps);
        return { haloTexture, poolTexture, geometry };
    }, [lamps]);
    useEffect(() => {
        const mesh = pools.current;
        if (!mesh) return;
        const m = new Matrix4();
        lamps.forEach((l, i) => mesh.setMatrixAt(i, m.compose(new Vector3(l.x, POOL_Y, l.z), ZERO, new Vector3(POOL_DIAMETER, 1, POOL_DIAMETER))));
        mesh.instanceMatrix.needsUpdate = true;
    }, [lamps, assets]);
    useEffect(
        () => () => {
            assets.haloTexture.dispose();
            assets.poolTexture.dispose();
            assets.geometry.dispose();
        },
        [assets],
    );
    useFrame((_, dt) => {
        const b = (blend.current = stepBlend(blend.current, night, still, Math.min(dt, 0.1)));
        if (haloMaterial.current) haloMaterial.current.opacity = b;
        if (poolMaterial.current) poolMaterial.current.opacity = b * 0.7;
        if (halos.current) halos.current.visible = b > 0.01;
        if (pools.current) pools.current.visible = b > 0.01;
    });
    return (
        <>
            <points ref={halos} geometry={assets.geometry} frustumCulled={false} raycast={() => null}>
                <pointsMaterial ref={haloMaterial} map={assets.haloTexture} size={3.4} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} opacity={0} />
            </points>
            <instancedMesh ref={pools} args={[POOL_PLANE, undefined, lamps.length]} frustumCulled={false} raycast={() => null}>
                <meshBasicMaterial ref={poolMaterial} map={assets.poolTexture} transparent depthWrite={false} blending={AdditiveBlending} toneMapped={false} opacity={0} polygonOffset polygonOffsetFactor={-2} />
            </instancedMesh>
        </>
    );
}
