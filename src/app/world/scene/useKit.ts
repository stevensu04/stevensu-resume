"use client";

import { useMemo } from "react";
import { useLoader } from "@react-three/fiber";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { Box3, Matrix4, Mesh, MeshBasicMaterial, type BufferGeometry, type Material, type Texture } from "three";
import { withExplore } from "./explore";

/** One drawable piece of a kit model, in the model's own space. */
export type KitPart = { geometry: BufferGeometry; material: MeshBasicMaterial; matrix: Matrix4 };
/** A kit model: its parts and its bounding box, both in kit units (1 unit = one 8 m road tile). */
export type KitModel = { parts: KitPart[]; box: Box3 };

const KIT_URL = "/world/kit.glb";

/**
 * Loads public/world/kit.glb (built by `npm run world:kit`) and indexes it by model name.
 *
 * Every material becomes a `MeshBasicMaterial` that keeps the Kenney colormap: the shading is
 * painted into that texture, so the kit needs no real-time light (WORLD.md §6). Materials are
 * shared, four in all, so instancing can batch everything that uses the same colormap.
 */
export function useKit(): Map<string, KitModel> {
    const gltf = useLoader(GLTFLoader, KIT_URL, (loader) => {
        loader.setMeshoptDecoder(MeshoptDecoder);
    });

    return useMemo(() => {
        const basic = new Map<Material, MeshBasicMaterial>();
        const toBasic = (m: Material) => {
            let b = basic.get(m);
            if (!b) {
                const src = m as Material & { map?: Texture | null };
                b = withExplore(new MeshBasicMaterial({ map: src.map ?? null }));
                basic.set(m, b);
            }
            return b;
        };

        const models = new Map<string, KitModel>();
        gltf.scene.updateMatrixWorld(true);
        for (const node of gltf.scene.children) {
            const inverse = new Matrix4().copy(node.matrixWorld).invert();
            const parts: KitPart[] = [];
            const box = new Box3();
            node.traverse((o) => {
                if (!(o instanceof Mesh)) return;
                const matrix = new Matrix4().multiplyMatrices(inverse, o.matrixWorld);
                const material = Array.isArray(o.material) ? o.material[0] : o.material;
                parts.push({ geometry: o.geometry, material: toBasic(material), matrix });
                o.geometry.computeBoundingBox();
                box.union(o.geometry.boundingBox!.clone().applyMatrix4(matrix));
            });
            models.set(node.name, { parts, box });
        }
        return models;
    }, [gltf]);
}

export { KIT_URL };
