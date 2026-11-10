"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { WorldObject } from "../objects";

const point = new Vector3();

/**
 * Pins a DOM card above its object (§9: cards are real DOM, positioned from `vector.project(camera)`
 * in `useFrame`, never drei's `<Html transform>`). Writes two CSS variables straight onto the
 * element, so following the camera costs no React renders.
 */
export default function CardAnchor({ object, card }: { object: WorldObject | null; card: RefObject<HTMLDivElement | null> }) {
    useFrame(({ camera, size }) => {
        const el = card.current;
        if (!object || !el) return;
        point.set(object.x, object.h + 1, object.z).project(camera);
        const x = (point.x * 0.5 + 0.5) * size.width;
        const y = (-point.y * 0.5 + 0.5) * size.height;
        // Keep the whole card on screen even when its object is near an edge.
        const half = el.offsetWidth / 2;
        const cx = Math.min(Math.max(x, half + 12), size.width - half - 12);
        // The top 64 px hold the hint or tour bar and the links: a tall card must not cover them.
        const cy = Math.min(Math.max(y, el.offsetHeight + 64), size.height - 12);
        el.style.setProperty("--card-x", `${cx}px`);
        el.style.setProperty("--card-y", `${cy}px`);
    });
    return null;
}
