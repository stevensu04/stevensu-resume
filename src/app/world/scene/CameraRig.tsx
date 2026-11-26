"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Fog, PerspectiveCamera, Spherical, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { framing, labelPoint, type Location } from "./locations";
import { canStandAt, type Nav } from "./nav";

/**
 * The one camera (WORLD2.md §5, decision D3). It never remounts; every change of view is a flight.
 *
 * - **Global view** (Phase 2): a narrow-FOV perspective (24°, so the island reads as a model) on
 *   three's own `OrbitControls`. Drag turns the island, right-drag (two fingers) moves it, the wheel or
 *   a pinch zooms (through `dolly`, so the page can scroll at the limits). Pitch is held between ~24°
 *   and ~64° from straight down, and the aim point can't leave the island.
 * - **Explore** (Phase 3, decision D1): **first person** at Steven's eye, 1.6 m up, 70° FOV; or, on V,
 *   a close **third person** chase camera behind him that pulls in rather than pass through a wall.
 *   Both share one yaw and pitch, driven by the mouse, touch or arrow keys (`look`, `setTurn`).
 *
 * A flight eases aim point, distance, pitch, azimuth and FOV together over ~1.1 s (a cut under reduced
 * motion), so Global view swoops down into Steven's eyes and back out. A light fog fades in at eye
 * level only (the far edge of a small island is close, and fog hides it kindly); it costs no recompile,
 * because the fog always exists and only its distances move.
 */
export type Mode = "global" | "explore";
export type View = "first" | "third";
export type CameraRequest = { n: number; kind: "home" | "focus" | "global" | "explore" | "turn"; location?: Location | null; quarter?: 1 | -1 };
/** What Scene asks of the rig between frames. */
export type RigApi = {
    /** Zoom by a factor; false at a limit (or in first person), so the wheel scrolls the page. */
    dolly: (factor: number) => boolean;
    /** Look around in Explore: radians of yaw (right is positive) and pitch (up is positive). */
    look: (yaw: number, pitch: number) => void;
    /** Keyboard turning in Explore: −1, 0 or 1 (held arrow keys). */
    setTurn: (rate: number) => void;
};

export const FOV = 24;
const FOV_FIRST = 70;
const FOV_THIRD = 58;
const EYE = 1.6;
const DEFAULT_AZIMUTH = Math.PI / 4; // from the south-east, like every view since v1
const ISO_POLAR = Math.PI / 2 - Math.atan(1 / Math.SQRT2); // 54.7° from straight down
const POLAR_MIN = 0.42;
const POLAR_MAX = 1.12;
const PITCH_LIMIT = 1.0; // ±57° at eye level
const FLIGHT_SECONDS = 1.1;
const CHASE_DISTANCE = 5.5;
const TURN_SPEED = 1.9; // rad/s for held arrow keys
const HOME_AIM = new Vector3(0, -1, 6);
/** The aim point stays over the island. */
const AIM_BOUNDS = { minX: -56, maxX: 56, minZ: -56, maxZ: 68, maxY: 12 };
/** Global view has no fog; at eye level it starts 70 m out. */
const FOG_COLOUR = "#e4ebf0";

type Pose = { target: Vector3; r: number; polar: number; az: number; fov: number };

const scratch = { offset: new Vector3(), sph: new Spherical(), v: new Vector3(), right: new Vector3(), up: new Vector3(), dir: new Vector3() };

export default function CameraRig({
    mode,
    view,
    request,
    player,
    navRef,
    zoomRef,
    lookAt,
    still,
    poster,
    panelOpen,
    viewAzimuthRef,
    apiRef,
    onSkyline,
    locations,
    labels,
}: {
    mode: Mode;
    view: View;
    /** A new `n` starts a flight. */
    request: CameraRequest | null;
    /** Steven: Explore's eye and chase target. */
    player: RefObject<Vector3>;
    /** The walk grid, so the chase camera doesn't back through a wall. */
    navRef: RefObject<Nav | null>;
    /** Third person's zoom: the chase distance is CHASE_DISTANCE / zoom. */
    zoomRef: RefObject<number>;
    /** Keyboard focus on an object (§10): Global view's aim eases there. */
    lookAt: RefObject<Vector3 | null>;
    still: boolean;
    /** `?poster`: the home view, frozen. */
    poster: boolean;
    /** The location panel is open: focus framing makes room for it. */
    panelOpen: boolean;
    /** Written every frame: the azimuth the view faces, so walking is relative to it. */
    viewAzimuthRef: RefObject<number>;
    apiRef: RefObject<RigApi | null>;
    /** The Taipei skyline only exists behind the island (it would block Global view from the north). */
    onSkyline: (visible: boolean) => void;
    locations: Location[];
    /** Location labels (DOM), positioned here every frame. */
    labels: RefObject<Map<string, HTMLElement>>;
}) {
    const camera = useThree((s) => s.camera);
    const gl = useThree((s) => s.gl);
    const get = useThree((s) => s.get);
    const controls = useRef<OrbitControls | null>(null);
    const flight = useRef<{ from: Pose; to: () => Pose; t: number } | null>(null);
    const skyline = useRef(true);
    // The mode the last frame was drawn in: a flight starts from what was on screen, even when the
    // mode prop has already moved on (switching mode sets both in one render).
    const drawnMode = useRef<Mode>("global");
    // Explore's look: the azimuth faced (walking away from the camera is (−sin, −cos)) and the pitch.
    const look = useRef({ yaw: DEFAULT_AZIMUTH, pitch: -0.08, turn: 0, pending: 0 });
    // Latest props for the frame loop and the request handler.
    const live = useRef({ mode, view, still, poster, panelOpen });
    useEffect(() => {
        live.current = { mode, view, still, poster, panelOpen };
    }, [mode, view, still, poster, panelOpen]);

    // The fog is always there (no shader recompiles); only its distances change with the view.
    useEffect(() => {
        const { scene } = get();
        const previous = scene.fog;
        scene.fog = new Fog(FOG_COLOUR, 1e4, 2e4);
        return () => void (scene.fog = previous);
    }, [get]);

    // Orbit controls: created once, enabled only in Global view and never mid-flight.
    useEffect(() => {
        const c = new OrbitControls(camera, gl.domElement);
        c.enableZoom = false; // Scene handles the wheel and pinch, so the page can scroll at the limits
        c.enableDamping = !still;
        c.dampingFactor = 0.08;
        c.rotateSpeed = 0.55;
        c.panSpeed = 0.9;
        c.screenSpacePanning = false; // pan across the ground, not up into the sky
        c.minPolarAngle = POLAR_MIN;
        c.maxPolarAngle = POLAR_MAX;
        c.target.copy(HOME_AIM);
        // Open on the home view, exactly the poster's framing, so the swap from poster to scene is seamless.
        apply(camera as PerspectiveCamera, { target: HOME_AIM.clone(), r: homeDistance(camera as PerspectiveCamera), polar: ISO_POLAR, az: DEFAULT_AZIMUTH, fov: FOV });
        c.update();
        controls.current = c;
        return () => {
            c.dispose();
            controls.current = null;
        };
    }, [camera, gl, still]);

    useEffect(() => {
        apiRef.current = {
            dolly: (factor) => {
                const c = controls.current;
                if (!c || flight.current) return false;
                if (live.current.mode === "explore") {
                    if (live.current.view === "first") return false;
                    const next = Math.min(Math.max(zoomRef.current * factor, 0.6), 1.8);
                    if (Math.abs(next - zoomRef.current) < 1e-4) return false;
                    zoomRef.current = next;
                    return true;
                }
                const cam = camera as PerspectiveCamera;
                const offset = scratch.offset.copy(cam.position).sub(c.target);
                const r = offset.length();
                const next = Math.min(Math.max(r / factor, 32), homeDistance(cam) * 1.3);
                if (Math.abs(next - r) < 0.01) return false;
                cam.position.copy(c.target).addScaledVector(offset.normalize(), next);
                c.update();
                return true;
            },
            look: (yaw, pitch) => {
                const l = look.current;
                l.yaw -= yaw; // turning right lowers the azimuth (see `forward`)
                l.pitch = Math.min(Math.max(l.pitch + pitch, -PITCH_LIMIT), PITCH_LIMIT);
            },
            setTurn: (rate) => void (look.current.turn = rate),
        };
        return () => {
            apiRef.current = null;
        };
    }, [apiRef, camera, zoomRef]);

    /** The camera's pose right now, aimed one metre along its view (any mode). */
    const currentPose = (): Pose => {
        const cam = camera as PerspectiveCamera;
        const aim = drawnMode.current === "global" && controls.current && !flight.current ? controls.current.target : cam.getWorldDirection(scratch.dir).add(cam.position);
        scratch.sph.setFromVector3(scratch.offset.copy(cam.position).sub(aim));
        return { target: aim.clone(), r: scratch.sph.radius, polar: scratch.sph.phi, az: scratch.sph.theta, fov: cam.fov };
    };

    /** First person: the eye, looking along yaw and pitch. Third: behind and a little above him. */
    const explorePose = (): Pose => {
        const { yaw, pitch } = look.current;
        const p = player.current;
        if (live.current.view === "first") {
            const eye = new Vector3(p.x, EYE, p.z);
            const dir = forward(yaw, pitch, scratch.dir);
            return { target: eye.add(dir), r: 1, polar: Math.PI / 2 + pitch, az: yaw, fov: FOV_FIRST };
        }
        const polar = Math.min(Math.max(Math.PI / 2 + pitch - 0.32, 0.5), 2.0);
        let r = CHASE_DISTANCE / zoomRef.current;
        // Pull in rather than back through a wall: walk the line behind him on the walk grid.
        const nav = navRef.current;
        if (nav) {
            const back = Math.sin(polar);
            for (let d = 0.6; d <= r; d += 0.25) {
                if (!canStandAt(nav, p.x + Math.sin(yaw) * d * back, p.z + Math.cos(yaw) * d * back)) {
                    r = Math.max(d - 0.4, 1.4);
                    break;
                }
            }
        }
        return { target: new Vector3(p.x, 1.45, p.z), r, polar, az: yaw, fov: FOV_THIRD };
    };

    const homePose = (az = DEFAULT_AZIMUTH): Pose => ({ target: HOME_AIM.clone(), r: homeDistance(camera as PerspectiveCamera), polar: ISO_POLAR, az, fov: FOV });

    const focusPose = (l: Location, from: Pose): Pose => {
        const f = framing(l);
        const polar = from.fov > 40 ? ISO_POLAR : Math.min(Math.max(from.polar, 0.78), 1.0);
        const pose = { target: new Vector3(f.x, f.y, f.z), r: f.distance, polar, az: from.az, fov: FOV };
        // Make room for the panel: aim to one side (desktop, panel on the right) or below (phone sheet).
        if (live.current.panelOpen) {
            const cam = camera as PerspectiveCamera;
            const halfH = pose.r * Math.tan(((FOV / 2) * Math.PI) / 180);
            const halfW = halfH * cam.aspect;
            basis(pose);
            if (cam.aspect > 1.1) pose.target.addScaledVector(scratch.right, halfW * 0.32);
            else pose.target.addScaledVector(scratch.up, -halfH * 0.38);
        }
        return pose;
    };

    // A request starts a flight from wherever the camera is now.
    useEffect(() => {
        if (!request) return;
        const from = currentPose();
        let to: () => Pose;
        if (request.kind === "home") to = () => homePose();
        else if (request.kind === "turn") {
            if (live.current.mode === "explore") {
                // A quarter turn in Explore eases the look round rather than flying.
                look.current.pending += -(request.quarter ?? 1) * (Math.PI / 2);
                return;
            }
            const goal = { ...from, target: from.target.clone(), az: from.az + (request.quarter ?? 1) * (Math.PI / 2) };
            to = () => goal;
        } else if (request.kind === "explore") {
            // Step into his eyes facing the way the overview looked, level.
            look.current.yaw = from.az;
            look.current.pitch = -0.08;
            to = explorePose;
        } else if (request.kind === "focus" && request.location) {
            const goal = focusPose(request.location, from);
            to = () => goal;
        } else {
            // "global": back to the overview (keeping the azimuth), or to the selected location.
            const goal = request.location ? focusPose(request.location, from) : homePose(from.az);
            to = () => goal;
        }
        flight.current = { from, to, t: 0 };
        if (controls.current) controls.current.enabled = false;
        // currentPose and the pose builders read refs only; the request is what starts a flight.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request]);

    useFrame((state, delta) => {
        const cam = state.camera as PerspectiveCamera;
        const c = controls.current;
        const { mode: m, still: s, poster: p } = live.current;
        const dt = Math.min(delta, 0.1);

        // Explore's held-key turning and eased quarter turns.
        const l = look.current;
        l.yaw -= l.turn * TURN_SPEED * dt;
        if (l.pending) {
            const step = s ? l.pending : l.pending * Math.min(1, dt * 7);
            l.yaw += step;
            l.pending = Math.abs(l.pending - step) < 1e-3 ? 0 : l.pending - step;
        }

        if (p) {
            apply(cam, homePose());
            if (c) c.enabled = false;
        } else if (flight.current) {
            const f = flight.current;
            f.t += dt;
            const k = s ? 1 : ease(Math.min(f.t / FLIGHT_SECONDS, 1));
            const pose = mix(f.from, f.to(), k);
            apply(cam, pose);
            if (k >= 1) {
                flight.current = null;
                if (m === "global" && c) {
                    c.target.copy(pose.target);
                    c.enabled = true;
                    c.update();
                }
            }
        } else if (m === "global" && c) {
            c.enabled = true;
            // Keyboard focus (Tab): ease the aim towards the focused object.
            if (lookAt.current) {
                const before = scratch.v.copy(c.target);
                c.target.lerp(lookAt.current, s ? 1 : 1 - Math.exp(-4 * dt));
                cam.position.add(before.sub(c.target).negate());
            }
            c.update();
            // Keep the aim over the island.
            const t = c.target;
            const cx = Math.min(Math.max(t.x, AIM_BOUNDS.minX), AIM_BOUNDS.maxX);
            const cz = Math.min(Math.max(t.z, AIM_BOUNDS.minZ), AIM_BOUNDS.maxZ);
            const cy = Math.min(Math.max(t.y, -2), AIM_BOUNDS.maxY);
            if (cx !== t.x || cy !== t.y || cz !== t.z) {
                cam.position.x += cx - t.x;
                cam.position.y += cy - t.y;
                cam.position.z += cz - t.z;
                t.set(cx, cy, cz);
            }
        } else if (m === "explore") {
            if (c) c.enabled = false;
            const goal = explorePose();
            // First person answers at once; the chase camera eases a little, so it doesn't jitter.
            apply(cam, live.current.view === "first" || s ? goal : mix(currentPose(), goal, 1 - Math.exp(-14 * dt)));
        }

        // Eye level: tighter near plane (walls are close) and fog; Global view: neither.
        const eyeLevel = Math.min(Math.max((cam.fov - FOV) / (FOV_THIRD - FOV), 0), 1);
        const near = eyeLevel > 0.5 ? 0.15 : 1.5;
        if (cam.near !== near) {
            cam.near = near;
            cam.updateProjectionMatrix();
        }
        const fog = state.scene.fog as Fog | null;
        if (fog) {
            fog.near = eyeLevel > 0.01 ? 70 + (1e4 - 70) * (1 - eyeLevel) ** 3 : 1e4;
            fog.far = eyeLevel > 0.01 ? 260 + (2e4 - 260) * (1 - eyeLevel) ** 3 : 2e4;
        }

        drawnMode.current = flight.current ? "explore" : m; // mid-flight the aim is the view's, not the orbit's

        // Shared outputs: the azimuth the view faces (walking), the skyline, the labels.
        const dir = cam.getWorldDirection(scratch.dir);
        viewAzimuthRef.current = m === "explore" && !flight.current ? l.yaw : Math.atan2(-dir.x, -dir.z);
        // In Explore the skyline stays: it's across the water ahead, and toggling it re-bakes shadows.
        const behind = m === "explore" ? true : skyline.current ? -dir.z > -0.25 : -dir.z > -0.1;
        if (behind !== skyline.current) {
            skyline.current = behind;
            onSkyline(behind);
        }
        // Labels: projected, then decluttered. Nearer ones (lower on screen) keep their place; a label
        // that would overlap one already placed is lifted above it.
        const items: { el: HTMLElement; x: number; y: number; hidden: boolean }[] = [];
        for (const loc of locations) {
            const el = labels.current.get(loc.id);
            if (!el) continue;
            const v = scratch.v.set(...labelPoint(loc)).project(cam);
            items.push({ el, x: (v.x * 0.5 + 0.5) * state.size.width, y: (-v.y * 0.5 + 0.5) * state.size.height, hidden: v.z > 1 });
        }
        items.sort((a, b) => b.y - a.y);
        const placed: [number, number, number][] = [];
        for (const it of items) {
            const half = ((it.el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 80) / 2;
            let y = it.y;
            for (let tries = 0; tries < 6; tries++) {
                const hit = placed.find(([px, py, ph]) => Math.abs(px - it.x) < ph + half + 4 && Math.abs(py - y) < 25);
                if (!hit) break;
                y = hit[1] - 27;
            }
            if (!it.hidden) placed.push([it.x, y, half]);
            it.el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            it.el.style.visibility = it.hidden ? "hidden" : "";
        }
    });

    return null;
}

/** The way a yaw and pitch look: walking "forward" goes (−sin yaw, −cos yaw), as the keyboard expects. */
function forward(yaw: number, pitch: number, out: Vector3): Vector3 {
    return out.set(-Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
}

/** How far back the camera stands to see the whole island on this screen. */
function homeDistance(cam: PerspectiveCamera): number {
    const tanV = Math.tan(((FOV / 2) * Math.PI) / 180);
    const tanH = tanV * cam.aspect;
    return Math.max(72 / tanV, 100 / tanH);
}

function apply(cam: PerspectiveCamera, pose: Pose) {
    cam.position.setFromSphericalCoords(pose.r, pose.polar, pose.az).add(pose.target);
    cam.lookAt(pose.target);
    if (Math.abs(cam.fov - pose.fov) > 0.01) {
        cam.fov = pose.fov;
        cam.updateProjectionMatrix();
    }
}

/** The camera's screen-right and screen-up vectors for a pose, into scratch.right / scratch.up. */
function basis(pose: Pose) {
    const fwd = scratch.v.setFromSphericalCoords(1, pose.polar, pose.az).negate();
    scratch.right.crossVectors(fwd, new Vector3(0, 1, 0)).normalize();
    scratch.up.crossVectors(scratch.right, fwd).normalize();
}

function mix(a: Pose, b: Pose, k: number): Pose {
    const dAz = ((((b.az - a.az) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return {
        target: a.target.clone().lerp(b.target, k),
        r: a.r + (b.r - a.r) * k,
        polar: a.polar + (b.polar - a.polar) * k,
        az: a.az + dAz * k,
        fov: a.fov + (b.fov - a.fov) * k,
    };
}

function ease(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
