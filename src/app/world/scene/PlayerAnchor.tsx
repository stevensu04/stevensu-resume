"use client";

import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";

const point = new Vector3();

/** Keeps a DOM element just above Steven's head (the easter egg's bubble). CSS variables, no renders. */
export default function PlayerAnchor({ position, el }: { position: RefObject<Vector3>; el: RefObject<HTMLDivElement | null> }) {
    useFrame(({ camera, size }) => {
        const node = el.current;
        if (!node) return;
        point.set(position.current.x, 2.9, position.current.z).project(camera);
        node.style.setProperty("--emote-x", `${(point.x * 0.5 + 0.5) * size.width}px`);
        node.style.setProperty("--emote-y", `${(-point.y * 0.5 + 0.5) * size.height}px`);
    });
    return null;
}
