"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CatmullRomCurve3, CircleGeometry, Color, CylinderGeometry, Matrix4, MeshBasicMaterial, MeshLambertMaterial, Quaternion, SphereGeometry, Vector3, type InstancedMesh } from "three";
import { PATHS, PATH_Y } from "./Ground";
import { withWorldShader } from "./worldShader";

/**
 * A few people on the footpaths (WORLD2.md Phase 4: "small details that make the world feel alive").
 * Scenery only: they have no card, don't count, and walk their path to its end and back, keeping to
 * one side so two can pass. Each has a soft contact shadow (they move, so they can't be in the baked
 * shadow map). Under reduced motion they stand where they are.
 *
 * Draw calls: bodies, heads and shadows, three instanced meshes in all.
 */
const COUNT = 10;
const SHIRTS = ["#e07a5f", "#3d5a80", "#81b29a", "#f2cc8f", "#9c6ade", "#ef476f", "#118ab2", "#f4a261", "#6c757d", "#2a9d8f"];
const SKIN = ["#f1c7a5", "#d9a37e", "#a86b4c", "#7a4b33", "#e8b896"];

type Walker = { curve: CatmullRomCurve3; length: number; speed: number; t: number; side: number };

const m = new Matrix4();
const q = new Quaternion();
const up = new Vector3(0, 1, 0);
const at = new Vector3();
const ahead = new Vector3();
const one = new Vector3(1, 1, 1);

function makeWalkers(): Walker[] {
    const curves = PATHS.map((p, i) => new CatmullRomCurve3(p.points.map(([x, z]) => new Vector3(x, PATH_Y + i * 0.002, z)), false, "centripetal"));
    return Array.from({ length: COUNT }, (_, i) => {
        const curve = curves[i % curves.length];
        const length = curve.getLength();
        // Spread out: different paths, starting points, paces and sides.
        return { curve, length, speed: 0.95 + ((i * 37) % 10) * 0.04, t: ((i * 0.618) % 1) * 2 * length, side: i % 2 ? 0.4 : -0.4 };
    });
}

export default function Pedestrians({ still }: { still: boolean }) {
    const assets = useMemo(
        () => ({
            body: new CylinderGeometry(0.2, 0.24, 1.2, 8).translate(0, 0.62, 0),
            head: new SphereGeometry(0.16, 10, 8).translate(0, 1.42, 0),
            shadow: new CircleGeometry(0.38, 16).rotateX(-Math.PI / 2).translate(0, PATH_Y + 0.02, 0),
            lit: withWorldShader(new MeshLambertMaterial()),
            shade: new MeshBasicMaterial({ color: "#1f2937", transparent: true, opacity: 0.2, depthWrite: false }),
        }),
        [],
    );
    const bodies = useRef<InstancedMesh>(null);
    const heads = useRef<InstancedMesh>(null);
    const shadows = useRef<InstancedMesh>(null);
    const walkers = useRef<Walker[] | null>(null);
    const clock = useRef(0);

    // Shirts and skin, once the meshes exist.
    useEffect(() => {
        const c = new Color();
        for (let i = 0; i < COUNT; i++) {
            bodies.current?.setColorAt(i, c.set(SHIRTS[i % SHIRTS.length]));
            heads.current?.setColorAt(i, c.set(SKIN[i % SKIN.length]));
        }
        if (bodies.current?.instanceColor) bodies.current.instanceColor.needsUpdate = true;
        if (heads.current?.instanceColor) heads.current.instanceColor.needsUpdate = true;
    }, []);

    useFrame((_, delta) => {
        const b = bodies.current;
        const h = heads.current;
        const s = shadows.current;
        if (!b || !h || !s) return;
        walkers.current ??= makeWalkers();
        const dt = still ? 0 : Math.min(delta, 0.1);
        clock.current += dt;
        walkers.current.forEach((w, i) => {
            w.t = (w.t + w.speed * dt) % (2 * w.length);
            // There and back: 0…L out, L…2L home.
            const out = w.t < w.length;
            const u = (out ? w.t : 2 * w.length - w.t) / w.length;
            w.curve.getPointAt(Math.min(Math.max(u, 0), 1), at);
            w.curve.getPointAt(Math.min(Math.max(u + (out ? 0.01 : -0.01), 0), 1), ahead);
            const dx = ahead.x - at.x;
            const dz = ahead.z - at.z;
            const len = Math.hypot(dx, dz) || 1;
            // Keep to one side of the path, so two walkers going opposite ways pass.
            at.x += (-dz / len) * w.side;
            at.z += (dx / len) * w.side;
            q.setFromAxisAngle(up, Math.atan2(dx, dz));
            const bob = still ? 0 : Math.abs(Math.sin(clock.current * 7 + i)) * 0.04;
            m.compose(at.setY(at.y + bob), q, one);
            b.setMatrixAt(i, m);
            h.setMatrixAt(i, m);
            m.compose(at.setY(0), q, one);
            s.setMatrixAt(i, m);
        });
        b.instanceMatrix.needsUpdate = true;
        h.instanceMatrix.needsUpdate = true;
        s.instanceMatrix.needsUpdate = true;
    });

    // They roam the whole block, so they're never culled; nothing here is tappable.
    return (
        <group userData={{ dynamic: true }}>
            <instancedMesh ref={bodies} args={[assets.body, assets.lit, COUNT]} frustumCulled={false} raycast={() => null} />
            <instancedMesh ref={heads} args={[assets.head, assets.lit, COUNT]} frustumCulled={false} raycast={() => null} />
            <instancedMesh ref={shadows} args={[assets.shadow, assets.shade, COUNT]} frustumCulled={false} raycast={() => null} />
        </group>
    );
}
