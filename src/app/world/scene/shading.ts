import { BoxGeometry, BufferAttribute, Color, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * A box whose faces carry fixed light values in vertex colours: the "baked" look WORLD.md §6 asks
 * for, without a single real-time light. The sun sits high in the north-west, so the top is
 * brightest, west and north are mid, east and south are darkest. Pair it with
 * `<meshBasicMaterial vertexColors color={…} />`: the material colour tints, the vertices shade.
 */
const FACE_LIGHT = [0.78, 0.86, 1, 0.55, 0.7, 0.9]; // +x, -x, +y, -y, +z, -z

export function shadedBox(w: number, h: number, d: number): BoxGeometry {
    const geo = new BoxGeometry(w, h, d);
    // BoxGeometry emits 4 vertices per face, faces in the order +x, -x, +y, -y, +z, -z.
    const colors = new Float32Array(geo.attributes.position.count * 3);
    for (let face = 0; face < 6; face++) {
        for (let v = 0; v < 4; v++) colors.set([FACE_LIGHT[face], FACE_LIGHT[face], FACE_LIGHT[face]], (face * 4 + v) * 3);
    }
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
}

/** Site accent (Tailwind blue-600), used for Steven and for hover. */
export const ACCENT = new Color("#2563eb");

export type BoxSpec = {
    /** Centre, metres. */
    at: [number, number, number];
    size: [number, number, number];
    color: string;
    rotY?: number;
};

/**
 * Many shaded boxes as one geometry, colour baked into the vertices alongside the light. A whole
 * set of hand-made props then costs one draw call with `<meshBasicMaterial vertexColors />`
 * (§9 budget: < 80 draw calls).
 */
export function mergeBoxes(specs: BoxSpec[]): BufferGeometry {
    const parts = specs.map(({ at, size, color, rotY = 0 }) => {
        const geo = shadedBox(...size);
        const tint = new Color(color);
        const c = geo.attributes.color;
        for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * tint.r, c.getY(i) * tint.g, c.getZ(i) * tint.b);
        if (rotY) geo.rotateY(rotY);
        geo.translate(...at);
        return geo;
    });
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return merged;
}

/**
 * Bakes colour and the same fixed sun as `shadedBox` into any geometry's vertices, reading the
 * light from each vertex normal, so shaped parts (a raked bow, a sloped windscreen) shade like the
 * boxes around them. Returns a non-indexed geometry, ready for `mergeParts`.
 */
export function paint(geometry: BufferGeometry, color: string): BufferGeometry {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const n = geo.attributes.normal;
    const tint = new Color(color);
    const colors = new Float32Array(n.count * 3);
    for (let i = 0; i < n.count; i++) {
        const x = n.getX(i);
        const y = n.getY(i);
        const z = n.getZ(i);
        // FACE_LIGHT, blended by how much the normal points along each axis.
        const light =
            x * x * (x > 0 ? FACE_LIGHT[0] : FACE_LIGHT[1]) +
            y * y * (y > 0 ? FACE_LIGHT[2] : FACE_LIGHT[3]) +
            z * z * (z > 0 ? FACE_LIGHT[4] : FACE_LIGHT[5]);
        colors.set([light * tint.r, light * tint.g, light * tint.b], i * 3);
    }
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    return geo;
}

/** Merges painted parts into one geometry: one draw call for a whole model. */
export function mergeParts(parts: BufferGeometry[]): BufferGeometry {
    const flat = parts.map((p) => (p.index ? p.toNonIndexed() : p));
    for (const p of flat) if (!p.attributes.uv) p.setAttribute("uv", new BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2));
    const merged = mergeGeometries(flat);
    flat.forEach((p) => p.dispose());
    return merged;
}
