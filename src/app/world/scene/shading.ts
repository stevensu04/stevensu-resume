import { BoxGeometry, BufferAttribute, Color } from "three";

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
