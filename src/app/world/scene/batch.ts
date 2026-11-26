import { useEffect, type RefObject } from "react";
import {
    BufferAttribute,
    BufferGeometry,
    FrontSide,
    InstancedMesh,
    Matrix3,
    Matrix4,
    Mesh,
    MeshLambertMaterial,
    Vector3,
    type Material,
    type Object3D,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { withWorldShader } from "./worldShader";

/**
 * Static batching (WORLD2.md §12: the whole-island view was over the draw-call budget, and Phase 2
 * makes it the default view). Once the block has mounted, every static, opaque mesh that uses the
 * shared world shader is baked, in world space, into one geometry per material, and the originals
 * are hidden:
 *
 * - the kit's instanced models → one mesh per kit colormap;
 * - every hand-made, vertex-coloured model (each building, the roads, the paths…) → one mesh.
 *
 * Nothing about the look changes. The world shader works per fragment from world position (zone
 * light-up, occlusion fade) and the lamp flag rides in `uv`, so a baked copy shades exactly like
 * the originals. Left alone: anything `userData.dynamic`, transparent, double-sided or clipped, the
 * swaying trees (their sway phase comes from the instance), the water, and the instanced vegetation
 * (already one draw call per kind).
 *
 * It runs in an effect, before `useStaticShadows`, so the baked meshes are what cast the shadows.
 */
export function useStaticBatch(root: RefObject<Object3D | null>, key: unknown) {
    useEffect(() => {
        const group = root.current;
        if (!group) return;
        group.updateMatrixWorld(true);

        type Bucket = { material: Material; colours: boolean; parts: BufferGeometry[]; sources: Mesh[]; draws: number };
        const buckets = new Map<string, Bucket>();
        const flatCache = new Map<BufferGeometry, BufferGeometry>();
        const flat = (g: BufferGeometry) => {
            let f = flatCache.get(g);
            if (!f) flatCache.set(g, (f = g.index ? g.toNonIndexed() : g));
            return f;
        };

        group.traverse((o) => {
            if (!(o instanceof Mesh) || o.userData.batched || !visibleUpTo(o, group) || isDynamic(o, group)) return;
            const m = o.material;
            if (Array.isArray(m) || !(m instanceof MeshLambertMaterial)) return;
            if (m.transparent || m.side !== FrontSide || m.clippingPlanes?.length) return;
            if (m.customProgramCacheKey() !== "world") return; // only the shared, non-swaying world patch
            const instanced = o instanceof InstancedMesh;
            if (instanced && o.instanceColor) return; // vegetation stays instanced
            // Untextured vertex-coloured models share one bucket; textured ones batch per material.
            const plain = m.vertexColors && !m.map && m.color.getHex() === 0xffffff;
            const id = plain ? "vertex-colour" : m.uuid;
            let b = buckets.get(id);
            if (!b) buckets.set(id, (b = { material: m, colours: m.vertexColors, parts: [], sources: [], draws: 0 }));
            const geo = flat(o.geometry);
            if (instanced) {
                const im = new Matrix4();
                for (let i = 0; i < o.count; i++) {
                    o.getMatrixAt(i, im);
                    b.parts.push(bake(geo, new Matrix4().multiplyMatrices(o.matrixWorld, im), b.colours));
                }
            } else b.parts.push(bake(geo, o.matrixWorld, b.colours));
            b.sources.push(o);
            b.draws += 1;
        });

        const added: Mesh[] = [];
        const hidden: Mesh[] = [];
        for (const [id, b] of buckets) {
            // One draw call already: nothing to gain.
            if (b.draws < 2) {
                b.parts.forEach((p) => p.dispose());
                continue;
            }
            const geometry = mergeGeometries(b.parts);
            b.parts.forEach((p) => p.dispose());
            if (!geometry) continue;
            const material = id === "vertex-colour" ? withWorldShader(new MeshLambertMaterial({ vertexColors: true })) : b.material;
            const mesh = new Mesh(geometry, material);
            mesh.userData.batched = true;
            mesh.raycast = () => {};
            group.add(mesh);
            added.push(mesh);
            for (const s of b.sources) {
                s.visible = false;
                hidden.push(s);
            }
        }
        flatCache.forEach((f, g) => f !== g && f.dispose());

        return () => {
            for (const m of added) {
                group.remove(m);
                m.geometry.dispose();
            }
            for (const s of hidden) s.visible = true;
        };
    }, [root, key]);
}

/** A float, non-indexed copy of a geometry in world space: position, normal, uv (and colour). */
export function bake(src: BufferGeometry, matrix: Matrix4, colours: boolean): BufferGeometry {
    const p = src.attributes.position;
    const nm = src.attributes.normal;
    const uv = src.attributes.uv;
    const col = src.attributes.color;
    const n = p.count;
    const pos = new Float32Array(n * 3);
    const nor = new Float32Array(n * 3);
    const uvs = new Float32Array(n * 2);
    const cols = colours ? new Float32Array(n * 3).fill(1) : null;
    const normalMatrix = new Matrix3().getNormalMatrix(matrix);
    const v = new Vector3();
    for (let i = 0; i < n; i++) {
        // fromBufferAttribute reads quantised (normalised integer) kit attributes as floats.
        v.fromBufferAttribute(p, i).applyMatrix4(matrix);
        pos.set([v.x, v.y, v.z], i * 3);
        if (nm) {
            v.fromBufferAttribute(nm, i).applyMatrix3(normalMatrix).normalize();
            nor.set([v.x, v.y, v.z], i * 3);
        }
        if (uv) uvs.set([uv.getX(i), uv.getY(i)], i * 2);
        if (cols && col) cols.set([col.getX(i), col.getY(i), col.getZ(i)], i * 3);
    }
    const out = new BufferGeometry();
    out.setAttribute("position", new BufferAttribute(pos, 3));
    out.setAttribute("normal", new BufferAttribute(nor, 3));
    out.setAttribute("uv", new BufferAttribute(uvs, 2));
    if (cols) out.setAttribute("color", new BufferAttribute(cols, 3));
    if (!nm) out.computeVertexNormals();
    return out;
}

function visibleUpTo(o: Object3D, root: Object3D): boolean {
    for (let p: Object3D | null = o; p && p !== root.parent; p = p.parent) if (!p.visible) return false;
    return true;
}

function isDynamic(o: Object3D, root: Object3D): boolean {
    for (let p: Object3D | null = o; p && p !== root; p = p.parent) if (p.userData.dynamic) return true;
    return false;
}
