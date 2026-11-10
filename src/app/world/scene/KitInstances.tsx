"use client";

import { useEffect, useMemo } from "react";
import { Color, InstancedMesh, Matrix4, Quaternion, Vector3, type MeshBasicMaterial } from "three";
import { KIT_SCALE, type Placement } from "../placements";
import { withWorldShader } from "./worldShader";
import type { KitModel } from "./useKit";

export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number };

const Y = new Vector3(0, 1, 0);

/** Where a placement's model ends up: the matrix for its parts, and its footprint in metres. */
export function placementTransform(p: Placement, model: KitModel): { matrix: Matrix4; footprint: Rect } {
    const s = p.scale ?? KIT_SCALE;
    const turns = p.rot ?? 0;
    const { min, max } = model.box;
    const cx = (min.x + max.x) / 2;
    const cz = (min.z + max.z) / 2;
    // Centre the footprint on (x, z) and stand the model on y, whatever its own origin.
    const matrix = new Matrix4()
        .compose(new Vector3(p.x, p.y ?? 0, p.z), new Quaternion().setFromAxisAngle(Y, (turns * Math.PI) / 2), new Vector3(s, s, s))
        .multiply(new Matrix4().makeTranslation(-cx, -min.y, -cz));
    const w = (max.x - min.x) * s;
    const d = (max.z - min.z) * s;
    const [fw, fd] = turns % 2 === 0 ? [w, d] : [d, w];
    return { matrix, footprint: { minX: p.x - fw / 2, maxX: p.x + fw / 2, minZ: p.z - fd / 2, maxZ: p.z + fd / 2 } };
}

/**
 * Draws a list of placements as one InstancedMesh per model part, so 60-odd placements cost a
 * couple of dozen draw calls (§9 budget: < 80). Scenery never takes part in picking: zones have
 * their own invisible hit areas.
 */
export default function KitInstances({
    kit,
    placements,
    tint,
}: {
    kit: Map<string, KitModel>;
    placements: Placement[];
    /** Recolour the whole set (the skyline fades towards the sky). */
    tint?: { color: string; opacity: number };
}) {
    const meshes = useMemo(() => {
        const groups = new Map<string, { geometry: KitModel["parts"][number]["geometry"]; material: MeshBasicMaterial; matrices: Matrix4[] }>();
        // Trees get their own copy of the kit material with sway switched on (§6 idle motion).
        const swaying = new Map<MeshBasicMaterial, MeshBasicMaterial>();
        const swayed = (m: MeshBasicMaterial) => {
            if (!swaying.has(m)) swaying.set(m, withWorldShader(m.clone(), { sway: true }));
            return swaying.get(m)!;
        };
        for (const p of placements) {
            const model = kit.get(p.model);
            if (!model) throw new Error(`kit.glb has no model "${p.model}": rebuild it with npm run world:kit`);
            const { matrix } = placementTransform(p, model);
            model.parts.forEach((part, i) => {
                const key = `${p.model}#${i}`;
                let g = groups.get(key);
                const material = p.model.startsWith("tree") ? swayed(part.material) : part.material;
                if (!g) groups.set(key, (g = { geometry: part.geometry, material, matrices: [] }));
                g.matrices.push(new Matrix4().multiplyMatrices(matrix, part.matrix));
            });
        }
        const tinted = new Map<MeshBasicMaterial, MeshBasicMaterial>();
        return [...groups.values()].map(({ geometry, material, matrices }) => {
            let m = material;
            if (tint) {
                if (!tinted.has(material)) {
                    const t = material.clone();
                    t.color = new Color(tint.color);
                    t.transparent = tint.opacity < 1;
                    t.opacity = tint.opacity;
                    tinted.set(material, t);
                }
                m = tinted.get(material)!;
            }
            const mesh = new InstancedMesh(geometry, m, matrices.length);
            matrices.forEach((mx, i) => mesh.setMatrixAt(i, mx));
            mesh.instanceMatrix.needsUpdate = true;
            mesh.computeBoundingSphere();
            mesh.raycast = () => {};
            return mesh;
        });
    }, [kit, placements, tint]);

    useEffect(() => () => meshes.forEach((m) => m.dispose()), [meshes]);

    return (
        <>
            {meshes.map((m) => (
                <primitive key={m.uuid} object={m} />
            ))}
        </>
    );
}
