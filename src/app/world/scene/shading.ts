import { BoxGeometry, BufferAttribute, Color, type BufferGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Colour baked into vertices, so a whole hand-made model can be one geometry and one draw call.
 *
 * Until /world 2.0 these also baked a fixed sun into each face (WORLD.md §6: unlit, no real-time
 * light). Since WORLD2.md D2 the scene is lit (Lighting.tsx), so vertices carry **colour only** and
 * the light does the shading. Pair them with a lit material: `new MeshLambertMaterial({ vertexColors: true })`.
 *
 * **Lamps.** A lit doorway or window must still read as lit (WORLD.md §4: a live project is "lit,
 * door open"), not as yellow paint in the shade. Anything painted in a lamp colour is marked
 * self-lit: its vertices carry `uv.y = GLOW_UV`, and worldShader.ts keeps it at full colour whatever
 * the light. The marker rides in `uv`, which every program declares and vertex-coloured models
 * don't otherwise read, so it costs no attribute and no draw call.
 */
const LAMPS = new Set(["#f2d98a", "#f2c14e"]);
/** worldShader.ts treats `uv.y` below -50 as self-lit. */
export const GLOW_UV = -100;

function markGlow(geo: BufferGeometry) {
    const n = geo.attributes.position.count;
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) uv[i * 2 + 1] = GLOW_UV;
    geo.setAttribute("uv", new BufferAttribute(uv, 2));
}

/** A box with a white vertex-colour attribute, so `vertexColors` materials can tint it. */
export function shadedBox(w: number, h: number, d: number): BoxGeometry {
    const geo = new BoxGeometry(w, h, d);
    geo.setAttribute("color", new BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
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
 * Many boxes as one geometry, colour baked into the vertices. A whole set of hand-made props then
 * costs one draw call with `vertexColors` (§9 budget: < 80 draw calls).
 */
export function mergeBoxes(specs: BoxSpec[]): BufferGeometry {
    const parts = specs.map(({ at, size, color, rotY = 0 }) => {
        const geo = shadedBox(...size);
        const tint = new Color(color);
        const c = geo.attributes.color;
        for (let i = 0; i < c.count; i++) c.setXYZ(i, tint.r, tint.g, tint.b);
        if (LAMPS.has(color.toLowerCase())) markGlow(geo);
        if (rotY) geo.rotateY(rotY);
        geo.translate(...at);
        return geo;
    });
    const merged = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    return merged;
}

/**
 * Bakes a colour into any geometry's vertices (a raked bow, a sloped windscreen). Returns a
 * non-indexed geometry, ready for `mergeParts`.
 */
export function paint(geometry: BufferGeometry, color: string): BufferGeometry {
    const geo = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const tint = new Color(color);
    const n = geo.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) colors.set([tint.r, tint.g, tint.b], i * 3);
    geo.setAttribute("color", new BufferAttribute(colors, 3));
    if (LAMPS.has(color.toLowerCase())) markGlow(geo);
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
