"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

/**
 * M0 spike (WORLD.md §11). It has to prove three things and nothing more:
 *   1. a <Canvas> renders under the vendored React canary with the React Compiler on,
 *   2. useFrame drives animation (mutating a ref outside render, which the compiler allows),
 *   3. R3F pointer events reach a mesh — the click count below goes up.
 * Replaced by the real scene in M1.
 */
export default function Scene() {
    const [clicks, setClicks] = useState(0);

    return (
        <div className="relative h-[70vh] min-h-[420px] w-full bg-gray-50">
            <Canvas dpr={[1, 1.5]} camera={{ position: [3, 3, 3], fov: 45 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[4, 6, 3]} intensity={1.4} />
                <SpinningCube onHit={() => setClicks((c) => c + 1)} />
            </Canvas>
            <p
                className="absolute bottom-4 left-4 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-gray-700 shadow-sm"
                aria-live="polite"
                data-testid="world-clicks"
            >
                Clicks: {clicks}
            </p>
        </div>
    );
}

function SpinningCube({ onHit }: { onHit: () => void }) {
    const mesh = useRef<Mesh>(null);
    const [hovered, setHovered] = useState(false);
    // Read once: the scene only exists in the browser (`ssr: false`), so `window` is safe here.
    // Reduced motion is non-negotiable even in a spike (WORLD.md §10).
    const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    useFrame((_, delta) => {
        if (still || !mesh.current) return;
        mesh.current.rotation.x += delta * 0.6;
        mesh.current.rotation.y += delta * 0.9;
    });

    return (
        <mesh
            ref={mesh}
            onClick={onHit}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
        >
            <boxGeometry args={[1.6, 1.6, 1.6]} />
            <meshStandardMaterial color={hovered ? "#2563eb" : "#111111"} />
        </mesh>
    );
}
