"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { AnimationMixer, Mesh, MeshBasicMaterial, type AnimationAction, type Group, type Texture } from "three";
import { normaliseBoneScale } from "./clipScale";
import type { Motion } from "./input";

const AVATAR_URL = "/world/steven.glb";
const FADE_SECONDS = 0.14;
/**
 * Diorama figures are drawn a little larger than life so they read at a distance. At 1.2 he
 * stands ~2 m against Kenney's ~2.5 m doors: still plausibly a person, no longer a speck.
 */
const FIGURE_SCALE = 1.2;

/**
 * Steven: the DECO7381 avatar, rigged at 1.72 m. Adapted from Team 41's `StevenCharacter.tsx`,
 * with permission (WORLD.md §9). Same clip cross-fade and the same "hidden until posed" rule;
 * what changed:
 *
 * - One file. `npm run world:avatar` packs the mesh and the Idle, Walk and Run clips into
 *   public/world/steven.glb, instead of four GLBs that each carried the mesh.
 * - Flat, not relit (§6: bring the avatar down to the world's style). The 256 px texture goes on
 *   a `MeshBasicMaterial`, like the kit, so no light in the scene is needed for him either.
 * - drei's `useGLTF`/`useAnimations` are replaced by R3F's `useLoader` and a plain
 *   `AnimationMixer`, so drei stays out of the bundle.
 * - The fixed rig body: no sizing for whoever is walking.
 */
export default function Avatar({ motion, still }: { motion: RefObject<Motion>; still: boolean }) {
    const gltf = useLoader(GLTFLoader, AVATAR_URL, (loader) => {
        loader.setMeshoptDecoder(MeshoptDecoder);
    });
    const root = useRef<Group>(null);
    const current = useRef<Motion["state"]>("Idle");

    const model = useMemo(() => {
        // SkeletonUtils.clone: the loader caches the parsed file, and a skinned mesh needs its
        // own skeleton to animate independently of that cached copy.
        const m = clone(gltf.scene);
        m.traverse((o) => {
            if (!(o instanceof Mesh)) return;
            const src = o.material as { map?: Texture | null };
            o.material = new MeshBasicMaterial({ map: src.map ?? null });
            o.raycast = () => {};
            // A skinned mesh's bounds are its bind pose; walking can take it outside them.
            o.frustumCulled = false;
        });
        return m;
    }, [gltf]);

    const { mixer, actions } = useMemo(() => {
        const mx = new AnimationMixer(model);
        const acts: Partial<Record<Motion["state"], AnimationAction>> = {};
        for (const source of gltf.animations) {
            const clip = source.clone();
            // The Idle clip keys Hips.scale at 1.177; without this he grows 18 cm when he stops.
            clip.tracks = normaliseBoneScale(clip.tracks);
            acts[clip.name as Motion["state"]] = mx.clipAction(clip);
        }
        return { mixer: mx, actions: acts };
    }, [gltf, model]);

    useEffect(() => {
        actions.Idle?.reset().play();
        current.current = "Idle";
        return () => {
            mixer.stopAllAction();
        };
    }, [actions, mixer]);

    useFrame((_, dt) => {
        const next = still ? "Idle" : motion.current.state;
        if (next !== current.current) {
            actions[current.current]?.fadeOut(FADE_SECONDS);
            actions[next]?.reset().fadeIn(FADE_SECONDS).play();
            current.current = next;
        }
        actions[current.current]?.setEffectiveTimeScale(current.current === "Idle" ? 1 : motion.current.pace);
        // Reduced motion: he holds the first frame of Idle (§10: "the avatar stays in idle").
        mixer.update(still ? 0 : dt);
        // Hidden until the mixer has posed him, so he never flashes in the bind (A-) pose.
        if (root.current && !root.current.visible && actions.Idle?.isRunning()) root.current.visible = true;
    });

    return (
        <group ref={root} visible={false} scale={FIGURE_SCALE}>
            <primitive object={model} />
        </group>
    );
}
