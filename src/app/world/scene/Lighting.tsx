"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Mesh, MeshLambertMaterial, NeutralToneMapping, Vector3, type DirectionalLight, type Fog, type HemisphereLight, type Material, type Object3D } from "three";
import { LOOK } from "./look";

/**
 * The world's light (WORLD2.md §3, §7; decision D2, which replaces WORLD.md §6's unlit look).
 * Tuned in the Phase 1 look spike, 26 Nov 2026 (WORLD2.md §12):
 *
 * - **Key:** a warm sun from the west-south-west, 42° up (a Brisbane late-summer afternoon). From the
 *   default camera that is the classic upper-left light: left faces lit, right faces in shade, and
 *   shadows falling to the right, where they can be seen. It's the only light that casts.
 * - **Fill:** a weak shadowless light from the east, so the faces turned away from the sun don't go muddy.
 * - **Sky:** a hemisphere light, cool sky over warm ground, so shadows read slightly blue.
 *
 * **Shadows are static.** The block doesn't move, so the shadow map is drawn when the block mounts
 * or changes (`useStaticShadows`), never per frame (`shadowMap.autoUpdate` is off; see Scene.tsx).
 * What moves (the ferry, the queue, Olie's head, the turbine, Steven, the buses) is marked
 * `userData.dynamic`, or sits outside the block, and receives shadows without casting them.
 */
const SHADOW_EXTENT = 88;
const SUN_AT = new Vector3(...LOOK.sunDirection).normalize().multiplyScalar(150);
const FILL_AT = new Vector3(...LOOK.fillDirection).normalize().multiplyScalar(150);

const DAY = { sky: new Color(LOOK.sky), ground: new Color(LOOK.ground), sun: new Color(LOOK.sun), fill: new Color(LOOK.fill), fog: new Color(LOOK.fog) };
const NIGHT = { sky: new Color(LOOK.night.sky), ground: new Color(LOOK.night.ground), sun: new Color(LOOK.night.sun), fill: new Color(LOOK.night.fill), fog: new Color(LOOK.night.fog) };

/** `night` (WORLD2.md Phase 4): the lights ease between the day and night sets over ~1.2 s (at once under reduced motion). */
export default function Lighting({ night = false, still = false }: { night?: boolean; still?: boolean }) {
    const get = useThree((s) => s.get);
    const hemi = useRef<HemisphereLight>(null);
    const sun = useRef<DirectionalLight>(null);
    const fill = useRef<DirectionalLight>(null);
    const blend = useRef(night ? 1 : 0);
    useFrame((state, dt) => {
        const goal = night ? 1 : 0;
        const b = (blend.current = still ? goal : blend.current + Math.sign(goal - blend.current) * Math.min(Math.abs(goal - blend.current), dt / 1.2));
        const mixNum = (d: number, n: number) => d + (n - d) * b;
        if (hemi.current) {
            hemi.current.color.lerpColors(DAY.sky, NIGHT.sky, b);
            hemi.current.groundColor.lerpColors(DAY.ground, NIGHT.ground, b);
            hemi.current.intensity = mixNum(LOOK.hemiIntensity, LOOK.night.hemiIntensity);
        }
        if (sun.current) {
            sun.current.color.lerpColors(DAY.sun, NIGHT.sun, b);
            sun.current.intensity = mixNum(LOOK.sunIntensity, LOOK.night.sunIntensity);
        }
        if (fill.current) {
            fill.current.color.lerpColors(DAY.fill, NIGHT.fill, b);
            fill.current.intensity = mixNum(LOOK.fillIntensity, LOOK.night.fillIntensity);
        }
        const fog = state.scene.fog as Fog | null;
        if (fog) fog.color.lerpColors(DAY.fog, NIGHT.fog, b);
    });
    // A 2048 map is ~9 cm a texel over the island; phones get 1024 (the shadows are soft anyway).
    const [mapSize] = useState(() => (window.matchMedia("(pointer: coarse)").matches ? 1024 : 2048));

    // R3F sets ACES once at creation and only touches tone mapping again if `flat` changes. Neutral
    // keeps the pastel palette close to what was picked.
    useEffect(() => {
        const { gl } = get();
        const previous = gl.toneMapping;
        gl.toneMapping = NeutralToneMapping;
        // The ferry is clipped at the island's edge (Props.tsx), which needs per-material clipping.
        gl.localClippingEnabled = true;
        return () => void (gl.toneMapping = previous);
    }, [get]);

    return (
        <>
            <hemisphereLight ref={hemi} args={[LOOK.sky, LOOK.ground, LOOK.hemiIntensity]} />
            <directionalLight ref={fill} position={FILL_AT} color={LOOK.fill} intensity={LOOK.fillIntensity} />
            <directionalLight
                ref={sun}
                position={SUN_AT}
                color={LOOK.sun}
                intensity={LOOK.sunIntensity}
                castShadow
                shadow-mapSize={[mapSize, mapSize]}
                shadow-camera-left={-SHADOW_EXTENT}
                shadow-camera-right={SHADOW_EXTENT}
                shadow-camera-top={SHADOW_EXTENT}
                shadow-camera-bottom={-SHADOW_EXTENT}
                shadow-camera-near={10}
                shadow-camera-far={330}
                // Less normal bias left acne stripes on thin uprights (the noticeboard's legs at eye level).
                shadow-bias={-0.0006}
                shadow-normalBias={0.09}
                shadow-radius={3}
            />
        </>
    );
}

/**
 * Marks a static subtree for the baked shadow map and asks for one redraw. Every lit mesh receives
 * (a material shared by a receiver and a non-receiver would recompile every frame); every lit,
 * visible mesh casts unless it or an ancestor is `userData.dynamic`. Rerun it, through `key`,
 * whenever what's mounted changes (the skyline hides when the camera faces it).
 */
export function useStaticShadows(root: RefObject<Object3D | null>, key: unknown) {
    const get = useThree((s) => s.get);
    useEffect(() => {
        const group = root.current;
        if (!group) return;
        group.traverse((o) => {
            if (!(o instanceof Mesh)) return;
            const lit = isLit(o.material);
            o.receiveShadow = lit;
            o.castShadow = lit && o.visible && !isDynamic(o, group);
        });
        get().gl.shadowMap.needsUpdate = true;
    }, [get, root, key]);
}

function isLit(m: Material | Material[]): boolean {
    return Array.isArray(m) ? m.some((x) => x instanceof MeshLambertMaterial) : m instanceof MeshLambertMaterial;
}

function isDynamic(o: Object3D, root: Object3D): boolean {
    for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return true;
    return false;
}
