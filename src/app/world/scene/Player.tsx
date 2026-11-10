"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group, type Mesh } from "three";
import { ACCENT, shadedBox } from "./shading";

/** Steven walks at an easy 2.2 m/s (§3) and is 1.72 m tall. A capsule stands in until M3. */
const SPEED = 2.2;
const HEIGHT = 1.72;
const ISO_PITCH = Math.atan(1 / Math.SQRT2); // 35.264°, true isometric
const CAMERA_DISTANCE = 120;

const toward = new Vector3();
const offset = new Vector3();

/**
 * The kinematic controller and the camera rig in one place, because the camera follows Steven.
 * Positions live in refs and are mutated in `useFrame`, outside render, which is what both R3F
 * and the React Compiler expect. Nothing here sets React state per frame.
 */
export default function Player({
    position,
    target,
    step,
    still,
}: {
    position: RefObject<Vector3>;
    target: RefObject<Vector3>;
    /** Camera azimuth in 90° steps (§6: free orbit destroys the isometric look). */
    step: number;
    /** prefers-reduced-motion: no walking animation, no camera easing (§10). */
    still: boolean;
}) {
    const body = useRef<Group>(null);
    const marker = useRef<Mesh>(null);
    const focus = useRef<Vector3>(null);
    const azimuth = useRef<number>(null);
    const bodyGeo = useMemo(() => shadedBox(0.6, HEIGHT, 0.6), []);
    const noseGeo = useMemo(() => shadedBox(0.3, 0.25, 0.3), []);

    useFrame((state, delta) => {
        const p = position.current;
        const t = target.current;
        const dt = Math.min(delta, 0.1); // a backgrounded tab must not teleport him on return

        // Walk a straight line to the target (§9: enough for an open block).
        toward.subVectors(t, p).setY(0);
        const dist = toward.length();
        if (dist > 0.01) {
            if (still) p.copy(t);
            else p.addScaledVector(toward.normalize(), Math.min(dist, SPEED * dt));
            if (body.current) body.current.rotation.y = Math.atan2(toward.x, toward.z);
        }
        if (body.current) body.current.position.copy(p);
        if (marker.current) {
            marker.current.visible = dist > 0.3;
            marker.current.position.set(t.x, 0.03, t.z);
        }

        // Camera: orthographic, pitch locked, azimuth eased to the current 90° step.
        const goal = Math.PI / 4 + (step * Math.PI) / 2;
        azimuth.current ??= goal;
        focus.current ??= p.clone();
        const k = still ? 1 : 1 - Math.exp(-6 * dt);
        azimuth.current += shortestAngle(azimuth.current, goal) * k;
        focus.current.lerp(p, k);

        const cam = state.camera;
        offset.set(Math.cos(ISO_PITCH) * Math.sin(azimuth.current), Math.sin(ISO_PITCH), Math.cos(ISO_PITCH) * Math.cos(azimuth.current));
        cam.position.copy(focus.current).addScaledVector(offset, CAMERA_DISTANCE);
        cam.lookAt(focus.current);

        // About 48 m across on a desktop. A phone in portrait would shrink Steven to a speck at that
        // width, so pixels per metre never drop below 14: the camera follows him anyway.
        const zoom = Math.min(Math.max(Math.min(state.size.width / 48, state.size.height / 30), 14), 28);
        if (Math.abs(cam.zoom - zoom) > 0.01) {
            cam.zoom = zoom;
            cam.updateProjectionMatrix();
        }
    });

    return (
        <>
            <group ref={body}>
                <mesh geometry={bodyGeo} position={[0, HEIGHT / 2, 0]} raycast={() => null}>
                    <meshBasicMaterial vertexColors color={ACCENT} />
                </mesh>
                {/* A nose, so you can see which way he faces. */}
                <mesh geometry={noseGeo} position={[0, HEIGHT - 0.35, 0.4]} raycast={() => null}>
                    <meshBasicMaterial vertexColors color="#1e3a8a" />
                </mesh>
            </group>
            <mesh ref={marker} rotation-x={-Math.PI / 2} raycast={() => null}>
                <ringGeometry args={[0.35, 0.55, 24]} />
                <meshBasicMaterial color={ACCENT} transparent opacity={0.7} />
            </mesh>
        </>
    );
}

function shortestAngle(from: number, to: number): number {
    return ((((to - from) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}
