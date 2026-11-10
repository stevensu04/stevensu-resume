"use client";

import { Component, Suspense, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3, type Group, type Mesh } from "three";
import { ACCENT, shadedBox } from "./shading";
import type { Rect } from "./KitInstances";
import { canStand } from "./walk";
import { worldUniforms } from "./worldShader";
import { RACQUET } from "../placements";
import Avatar from "./Avatar";
import { RUN_SPEED, WALK_SPEED, type Motion, type MovementInput } from "./input";

/** He is 1.72 m tall; speeds live in input.ts. */
/** A tap further away than this, he runs: crossing the 80 m block at a walk takes too long. */
const RUN_DISTANCE = 14;
const HEIGHT = 1.72;
const ISO_PITCH = Math.atan(1 / Math.SQRT2); // 35.264°, true isometric
const CAMERA_DISTANCE = 120;

const BLOCK_CENTRE = new Vector3(0, 0, -6);
const toward = new Vector3();
const playerPoint = new Vector3();
const offset = new Vector3();

/**
 * The kinematic controller and the camera rig in one place, because the camera follows Steven.
 * Positions live in refs and are mutated in `useFrame`, outside render, which is what both R3F
 * and the React Compiler expect. Nothing here sets React state per frame.
 *
 * Two drivers (§2): tap-to-move sets `target`; the keyboard and d-pad set `input`, which wins
 * while held and cancels any tap target.
 */
export default function Player({
    position,
    target,
    input,
    pace,
    solidsRef,
    step,
    still,
    lookAt,
    overview = false,
    onRacquet,
}: {
    position: RefObject<Vector3>;
    target: RefObject<Vector3>;
    input: RefObject<MovementInput>;
    /** Speed multiplier: 1 normally, more during the guided tour. */
    pace: RefObject<number>;
    /** Footprints to walk round (filled by Stage once the kit has loaded). */
    solidsRef: RefObject<Rect[]>;
    /** Camera azimuth in 90° steps (§6: free orbit destroys the isometric look). */
    step: number;
    /** prefers-reduced-motion: no walk cycle, no camera easing (§10). */
    still: boolean;
    /** When set, the camera eases here instead of following Steven (keyboard focus, §10). */
    lookAt?: RefObject<Vector3 | null>;
    /** The whole block in frame: used to render the poster (`?poster` in development). */
    overview?: boolean;
    /** The easter egg went off (true) or finished (false). */
    onRacquet?: (active: boolean) => void;
}) {
    const body = useRef<Group>(null);
    const marker = useRef<Mesh>(null);
    const focus = useRef<Vector3>(null);
    const azimuth = useRef<number>(null);
    const running = useRef(false);
    const motion = useRef<Motion>({ state: "Idle", pace: 1 });
    // The easter egg: seconds into the hop, or -1 when not reacting; re-arms once he walks away.
    const hop = useRef(-1);
    const hopArmed = useRef(true);

    useFrame((state, delta) => {
        const p = position.current;
        const t = target.current;
        const keys = input.current;
        const dt = Math.min(delta, 0.1); // a backgrounded tab must not teleport him on return

        // Camera azimuth first: keyboard directions are relative to the view.
        const goal = Math.PI / 4 + (step * Math.PI) / 2;
        azimuth.current ??= goal;
        const k = still ? 1 : 1 - Math.exp(-6 * dt);
        azimuth.current += shortestAngle(azimuth.current, goal) * k;
        const az = azimuth.current;

        // Keyboard / d-pad: "up" walks away from the camera, whatever the azimuth.
        const fwd = Number(keys.forward) - Number(keys.backward);
        const side = Number(keys.right) - Number(keys.left);
        let speed = 0;
        let dist = 0;
        if (fwd || side) {
            toward.set(-Math.sin(az) * fwd + Math.cos(az) * side, 0, -Math.cos(az) * fwd - Math.sin(az) * side).normalize();
            speed = keys.run ? RUN_SPEED : WALK_SPEED;
            dist = speed * dt;
            t.copy(p); // a held key replaces any tap target
        } else {
            toward.subVectors(t, p).setY(0);
            dist = toward.length();
            if (dist > 0.01) {
                // Decide once per tap whether this trip is a walk or a run.
                if (motion.current.state === "Idle") running.current = dist > RUN_DISTANCE;
                speed = (running.current ? RUN_SPEED : WALK_SPEED) * pace.current;
                toward.normalize();
            }
        }

        let moved = false;
        if (speed > 0) {
            const len = still ? dist : Math.min(dist, speed * dt);
            const nx = p.x + toward.x * len;
            const nz = p.z + toward.z * len;
            // Straight line; slide along whatever is in the way; give up when stuck.
            if (canStand(nx, nz, solidsRef.current)) {
                p.set(nx, 0, nz);
                moved = true;
            } else if (canStand(nx, p.z, solidsRef.current) && Math.abs(toward.x) > 0.05) {
                p.setX(nx);
                moved = true;
            } else if (canStand(p.x, nz, solidsRef.current) && Math.abs(toward.z) > 0.05) {
                p.setZ(nz);
                moved = true;
            } else {
                t.copy(p);
            }
            if (body.current) body.current.rotation.y = Math.atan2(toward.x, toward.z);
            if (fwd || side) t.copy(p);
        }
        motion.current.state = moved ? (speed > WALK_SPEED * pace.current ? "Run" : "Walk") : "Idle";
        motion.current.pace = pace.current;

        // The racquet (§3). Walking within 2.5 m sets it off once: a 🎾 over his head for 2.5 s (Scene
        // draws it), and while he's standing, he turns to the racquet and hops twice. Under reduced
        // motion: the bubble and the turn, no hop. Re-arms once he's 5 m away.
        const rx = RACQUET.x - p.x;
        const rz = RACQUET.z - p.z;
        const d2 = rx * rx + rz * rz;
        if (d2 < 2.5 * 2.5 && hopArmed.current) {
            hopArmed.current = false;
            hop.current = 0;
            onRacquet?.(true);
        } else if (d2 > 5 * 5) hopArmed.current = true;
        let lift = 0;
        if (hop.current >= 0) {
            hop.current += dt;
            if (!moved) {
                if (body.current) body.current.rotation.y = Math.atan2(rx, rz);
                // Two hops in the first 0.9 s: big enough to read at phone zoom (~10 px).
                if (!still && hop.current < 0.9) lift = Math.abs(Math.sin((hop.current / 0.45) * Math.PI)) * 0.55;
            }
            if (hop.current > 2.5) {
                hop.current = -1;
                onRacquet?.(false);
            }
        }

        if (body.current) body.current.position.set(p.x, lift, p.z);
        if (marker.current) {
            marker.current.visible = !fwd && !side && p.distanceTo(t) > 0.3;
            marker.current.position.set(t.x, 0.03, t.z);
        }

        // Camera: orthographic, pitch locked, following Steven.
        focus.current ??= p.clone();
        focus.current.lerp(overview ? BLOCK_CENTRE : (lookAt?.current ?? p), k);
        const cam = state.camera;
        offset.set(Math.cos(ISO_PITCH) * Math.sin(az), Math.sin(ISO_PITCH), Math.cos(ISO_PITCH) * Math.cos(az));
        cam.position.copy(focus.current).addScaledVector(offset, CAMERA_DISTANCE);
        cam.lookAt(focus.current);

        // Occlusion fade: tell the shared shader where Steven is on screen and how deep, so whatever
        // stands between him and the camera is stippled away round him (worldShader.ts).
        const dpr = state.gl.getPixelRatio();
        playerPoint.set(p.x, 1, p.z).project(cam);
        worldUniforms.uPlayer.value[0] = (playerPoint.x * 0.5 + 0.5) * state.size.width * dpr;
        worldUniforms.uPlayer.value[1] = (playerPoint.y * 0.5 + 0.5) * state.size.height * dpr;
        worldUniforms.uPlayer.value[2] = -playerPoint.set(p.x, 1, p.z).applyMatrix4(cam.matrixWorldInverse).z;
        worldUniforms.uCutRadius.value = overview ? 0 : 2.4 * cam.zoom * dpr;

        // About 34 m across on a desktop, so Steven stands ~55 px tall (§6 asks for 60–80). A phone in
        // portrait would shrink him to a speck at that width, so pixels per metre never drop below
        // 16: the camera follows him anyway.
        const zoom = overview
            ? Math.min(state.size.width / 118, state.size.height / 84)
            : Math.min(Math.max(Math.min(state.size.width / 34, state.size.height / 22), 16), 34);
        if (Math.abs(cam.zoom - zoom) > 0.01) {
            cam.zoom = zoom;
            cam.updateProjectionMatrix();
        }
    });

    return (
        <>
            <group ref={body}>
                {/* A soft contact shadow: a light figure on a light pavement needs one to read. */}
                <mesh position-y={0.04} rotation-x={-Math.PI / 2} raycast={() => null}>
                    <circleGeometry args={[0.55, 20]} />
                    <meshBasicMaterial color="#1f2937" transparent opacity={0.22} depthWrite={false} />
                </mesh>
                {/* The capsule stands in while steven.glb loads, and for good if it fails. */}
                <AvatarBoundary fallback={<Capsule />}>
                    <Suspense fallback={<Capsule />}>
                        <Avatar motion={motion} still={still} />
                    </Suspense>
                </AvatarBoundary>
            </group>
            <mesh ref={marker} rotation-x={-Math.PI / 2} raycast={() => null}>
                <ringGeometry args={[0.35, 0.55, 24]} />
                <meshBasicMaterial color={ACCENT} transparent opacity={0.7} />
            </mesh>
        </>
    );
}

function Capsule() {
    const geo = useMemo(() => shadedBox(0.6, HEIGHT, 0.6), []);
    return (
        <mesh geometry={geo} position={[0, HEIGHT / 2, 0]} raycast={() => null}>
            <meshBasicMaterial vertexColors color={ACCENT} />
        </mesh>
    );
}

/** A failed avatar must not take the world down with it (Team 41's `AvatarBoundary`). */
class AvatarBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

function shortestAngle(from: number, to: number): number {
    return ((((to - from) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}
