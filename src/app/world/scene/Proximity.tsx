"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import type { Vector3 } from "three";
import type { WorldObject } from "../objects";
import type { View } from "./CameraRig";

/**
 * What Explore offers to open (WORLD2.md §5, Phase 3): the object Steven is next to and facing. In
 * first person it must be within ~4 m and inside a ~55° cone of the view; in third person, near and
 * roughly ahead. Standing inside an object's footprint always counts. Calls `onTarget` only when the
 * answer changes, so nothing re-renders per frame.
 */
const REACH = 4;

export default function Proximity({
    player,
    viewAzimuthRef,
    view,
    objects,
    onTarget,
}: {
    player: RefObject<Vector3>;
    viewAzimuthRef: RefObject<number>;
    view: View;
    objects: WorldObject[];
    onTarget: (id: string | null) => void;
}) {
    const current = useRef<string | null>(null);
    useFrame(() => {
        const p = player.current;
        const az = viewAzimuthRef.current;
        const fx = -Math.sin(az);
        const fz = -Math.cos(az);
        const cone = view === "first" ? 0.55 : 0.1;
        let best: string | null = null;
        let bestScore = Infinity;
        for (const o of objects) {
            const dx = o.x - p.x;
            const dz = o.z - p.z;
            const edge = Math.hypot(Math.max(Math.abs(dx) - o.w / 2, 0), Math.max(Math.abs(dz) - o.d / 2, 0));
            if (edge > REACH) continue;
            const facing = (dx * fx + dz * fz) / (Math.hypot(dx, dz) || 1);
            if (edge > 0.01 && facing < cone) continue;
            const score = edge - facing * 1.5;
            if (score < bestScore) {
                best = o.id;
                bestScore = score;
            }
        }
        if (best !== current.current) {
            current.current = best;
            onTarget(best);
        }
    });
    return null;
}
