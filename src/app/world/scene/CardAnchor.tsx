"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import type { Zone } from "../zones";

const point = new Vector3();

/**
 * Pins a DOM card above a zone (§9: cards are real DOM, positioned from `vector.project(camera)`
 * in `useFrame`, never drei's `<Html transform>`). Writes two CSS variables straight onto the
 * element, so following the camera costs no React renders.
 */
export default function CardAnchor({ zone, card }: { zone: Zone | null; card: RefObject<HTMLDivElement | null> }) {
    useFrame(({ camera, size }) => {
        const el = card.current;
        if (!zone || !el) return;
        point.set(zone.x, zone.h + 1, zone.z).project(camera);
        const x = (point.x * 0.5 + 0.5) * size.width;
        const y = (-point.y * 0.5 + 0.5) * size.height;
        // Keep the whole card on screen even when its zone is near an edge.
        const half = el.offsetWidth / 2;
        const cx = Math.min(Math.max(x, half + 12), size.width - half - 12);
        const cy = Math.min(Math.max(y, el.offsetHeight + 24), size.height - 12);
        el.style.setProperty("--card-x", `${cx}px`);
        el.style.setProperty("--card-y", `${cy}px`);
    });
    return null;
}
