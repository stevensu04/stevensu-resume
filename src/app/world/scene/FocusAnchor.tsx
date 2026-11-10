"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { WorldObject } from "../objects";

const point = new Vector3();

/**
 * Keeps the keyboard focus ring over the focused object (§10: "a visible focus ring"), following it
 * while the camera eases there. Same technique as CardAnchor: CSS variables, no React renders.
 */
export default function FocusAnchor({ object, ring }: { object: WorldObject | null; ring: RefObject<HTMLDivElement | null> }) {
    useFrame(({ camera, size }) => {
        const el = ring.current;
        if (!object || !el) return;
        point.set(object.x, Math.min(object.h, 6) / 2, object.z).project(camera);
        el.style.setProperty("--ring-x", `${(point.x * 0.5 + 0.5) * size.width}px`);
        el.style.setProperty("--ring-y", `${(-point.y * 0.5 + 0.5) * size.height}px`);
    });
    return null;
}
