"use client";

import { Component, Suspense, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Vector3, type Group, type Mesh } from "three";
import { ACCENT, shadedBox } from "./shading";
import { canStandAt, findPath, type Nav } from "./nav";
import { worldUniforms } from "./worldShader";
import { RACQUET } from "../placements";
import Avatar from "./Avatar";
import { RUN_DISTANCE, RUN_SPEED, WALK_SPEED, type Motion, type MovementInput } from "./input";

/** He is 1.72 m tall; speeds live in input.ts. */
const HEIGHT = 1.72;
const playerPoint = new Vector3();
const toward = new Vector3();

/**
 * The kinematic controller (the camera is CameraRig.tsx's since WORLD2.md Phase 2). Positions live in
 * refs and are mutated in `useFrame`, outside render, which is what both R3F and the React Compiler
 * expect. Nothing here sets React state per frame.
 *
 * Two drivers (§2): tap-to-move sets `target`; the keyboard and d-pad set `input`, which wins
 * while held and cancels any tap target.
 */
export default function Player({
    position,
    target,
    input,
    pace,
    navRef,
    viewAzimuth,
    still,
    occlude,
    hidden = false,
    onRacquet,
}: {
    position: RefObject<Vector3>;
    target: RefObject<Vector3>;
    input: RefObject<MovementInput>;
    /** Speed multiplier: 1 normally, more during the guided tour. */
    pace: RefObject<number>;
    /** Where he can walk (filled by Stage once the kit has loaded; null until then). */
    navRef: RefObject<Nav | null>;
    /** The camera's azimuth (CameraRig writes it each frame): keyboard walking is relative to the view. */
    viewAzimuth: RefObject<number>;
    /** prefers-reduced-motion: no walk cycle (§10). */
    still: boolean;
    /** Cut a window round Steven through whatever hides him: on in Explore, where the camera is close. */
    occlude: boolean;
    /** First person: the camera is in his head, so his body isn't drawn (he still walks and collides). */
    hidden?: boolean;
    /** The easter egg went off (true) or finished (false). */
    onRacquet?: (active: boolean) => void;
}) {
    const body = useRef<Group>(null);
    const marker = useRef<Mesh>(null);
    const running = useRef(false);
    const motion = useRef<Motion>({ state: "Idle", pace: 1 });
    // The route being walked (nav.ts) and the target it was planned for.
    const path = useRef<[number, number][]>([]);
    const planned = useRef(new Vector3(Number.NaN, 0, Number.NaN));
    // The easter egg: seconds into the hop, or -1 when not reacting; re-arms once he walks away.
    const hop = useRef(-1);
    const hopArmed = useRef(true);

    useFrame((state, delta) => {
        const p = position.current;
        const t = target.current;
        const keys = input.current;
        const dt = Math.min(delta, 0.1); // a backgrounded tab must not teleport him on return

        // Keyboard directions are relative to the view.
        const az = viewAzimuth.current;

        const nav = navRef.current;
        const standable = (x: number, z: number) => (nav ? canStandAt(nav, x, z) : true);

        // Keyboard / d-pad: "up" walks away from the camera, whatever the azimuth.
        // Keys give whole steps; the touch joystick (WORLD2.md Phase 3) gives an analog stick.
        const stick = Math.hypot(keys.stickX, keys.stickY);
        const fwd = Math.max(-1, Math.min(1, Number(keys.forward) - Number(keys.backward) + keys.stickY));
        const side = Math.max(-1, Math.min(1, Number(keys.right) - Number(keys.left) + keys.stickX));
        let speed = 0;
        let dist = 0;
        if (fwd || side) {
            toward.set(-Math.sin(az) * fwd + Math.cos(az) * side, 0, -Math.cos(az) * fwd - Math.sin(az) * side).normalize();
            // Shift, or the joystick pushed to its edge, runs; a gentle push walks slower.
            speed = keys.run || stick > 0.92 ? RUN_SPEED : WALK_SPEED * (stick > 0 ? Math.max(stick, 0.45) : 1);
            dist = speed * dt;
            t.copy(p); // a held key replaces any tap target
            planned.current.copy(p);
            path.current = [];
        } else {
            // Tap-to-move: a new target means a new route round whatever is in the way (nav.ts).
            // `!(… <= …)`, not `>`: the first frame compares against NaN, which must count as new.
            if (!(planned.current.distanceToSquared(t) <= 0.0025)) {
                planned.current.copy(t);
                path.current = nav ? findPath(nav, p.x, p.z, t.x, t.z) : [[t.x, t.z]];
                // Decide once per trip whether it's a walk or a run, from the route's real length.
                let length = 0;
                let [lx, lz] = [p.x, p.z];
                for (const [wx, wz] of path.current) {
                    length += Math.hypot(wx - lx, wz - lz);
                    [lx, lz] = [wx, wz];
                }
                running.current = length > RUN_DISTANCE;
                if (!path.current.length) {
                    t.copy(p);
                    planned.current.copy(p);
                }
            }
            const next = path.current[0];
            if (next) {
                toward.set(next[0] - p.x, 0, next[1] - p.z);
                dist = toward.length();
                speed = (running.current ? RUN_SPEED : WALK_SPEED) * pace.current;
                if (dist > 1e-4) toward.normalize();
            }
        }

        let moved = false;
        if (speed > 0) {
            const len = still ? dist : Math.min(dist, speed * dt);
            const nx = p.x + toward.x * len;
            const nz = p.z + toward.z * len;
            if (standable(nx, nz)) {
                p.set(nx, 0, nz);
                moved = len > 1e-4;
            } else if (standable(nx, p.z) && Math.abs(toward.x) > 0.05) {
                // Slide along a wall (the keyboard; a route never needs this).
                p.setX(nx);
                moved = true;
            } else if (standable(p.x, nz) && Math.abs(toward.z) > 0.05) {
                p.setZ(nz);
                moved = true;
            } else {
                path.current = [];
                t.copy(p);
                planned.current.copy(p);
            }
            if (moved && body.current) body.current.rotation.y = Math.atan2(toward.x, toward.z);
            if (fwd || side) t.copy(p);
            // Reached this waypoint: on to the next, or stop, landing the target where he stands.
            const next = path.current[0];
            if (next && Math.hypot(next[0] - p.x, next[1] - p.z) < 0.05) {
                path.current.shift();
                if (!path.current.length) {
                    t.copy(p);
                    planned.current.copy(p);
                }
            }
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

        // Occlusion fade: tell the shared shader where Steven is on screen and how deep, so whatever
        // stands between him and the camera is stippled away round him (worldShader.ts). The window
        // is ~2.4 m across at his depth: pixels per metre come from the perspective camera's FOV.
        const cam = state.camera as PerspectiveCamera;
        const dpr = state.gl.getPixelRatio();
        playerPoint.set(p.x, 1, p.z).project(cam);
        worldUniforms.uPlayer.value[0] = (playerPoint.x * 0.5 + 0.5) * state.size.width * dpr;
        worldUniforms.uPlayer.value[1] = (playerPoint.y * 0.5 + 0.5) * state.size.height * dpr;
        const depth = -playerPoint.set(p.x, 1, p.z).applyMatrix4(cam.matrixWorldInverse).z;
        worldUniforms.uPlayer.value[2] = depth;
        const pxPerMetre = (state.size.height * dpr) / (2 * Math.max(depth, 1) * Math.tan(((cam.fov ?? 24) * Math.PI) / 360));
        // The window scales with distance: ~2.4 m across from far off, ~0.8 m for the close chase camera.
        worldUniforms.uCutRadius.value = occlude ? Math.min(2.4, Math.max(0.8, depth * 0.06)) * pxPerMetre : 0;
    });

    return (
        <>
            <group ref={body} visible={!hidden}>
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
