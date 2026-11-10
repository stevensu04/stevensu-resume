import type { Material } from "three";
import { ZONES } from "../zones";

/**
 * One shader patch, shared by every kit instance and hand-made prop, that does three cheap things
 * without a single extra draw call:
 *
 * 1. **Light-up on visit** (WORLD.md §5). Inside an unexplored content zone, colour is pulled
 *    towards grey; `uZoneLit` eases each zone back to full colour once it's explored.
 * 2. **Occlusion fade** (§6: "when a building hides Steven, fade it"). Anything nearer the camera
 *    than Steven and within a small circle round him on screen is stippled away, so he's never lost
 *    behind a building. Per-fragment, so it works across instancing, where per-object fades can't.
 * 3. **Sway** for materials patched with `{ sway: true }` (the trees): a slow sideways lean that grows
 *    with height. All motion stops when `uTime` stops (reduced motion).
 */
const CONTENT_ZONES = ZONES.filter((z) => z.number !== null);
export const EXPLORE_ZONE_IDS = CONTENT_ZONES.map((z) => z.id);
const N = CONTENT_ZONES.length;

/** Shared uniform objects: one write updates every program that uses them. */
export const worldUniforms = {
    uZoneRects: { value: CONTENT_ZONES.map((z) => [z.x - z.w / 2, z.z - z.d / 2, z.x + z.w / 2, z.z + z.d / 2]).flat() },
    uZoneLit: { value: new Array<number>(N).fill(0) },
    /** Steven on screen: x, y in drawing-buffer pixels (gl_FragCoord space), z his view depth. */
    uPlayer: { value: [0, 0, 0] },
    /** Radius of the cut-out in drawing-buffer pixels; 0 turns it off. */
    uCutRadius: { value: 0 },
    uTime: { value: 0 },
};

const VERT_HEAD = /* glsl */ `
varying vec2 vWorldXZ;
varying float vViewDepth;
uniform float uTime;
`;
const VERT_SWAY = /* glsl */ `
    #ifdef WORLD_SWAY
        // Height in the model's own (quantised, roughly -1..1) space, so 0 at the foot, 1 at the top.
        float swayH = clamp(position.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 swayAt = vec3(0.0);
        #ifdef USE_INSTANCING
            swayAt = instanceMatrix[3].xyz;
        #endif
        float sway = sin(uTime * 1.2 + swayAt.x * 0.37 + swayAt.z * 0.23) * 0.06 * swayH * swayH;
        transformed.x += sway;
        transformed.z += sway * 0.6;
    #endif
`;
const VERT_BODY = /* glsl */ `
    vec4 worldPos = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
        worldPos = instanceMatrix * worldPos;
    #endif
    vWorldXZ = (modelMatrix * worldPos).xz;
    vViewDepth = -mvPosition.z;
`;
const FRAG_HEAD = /* glsl */ `
varying vec2 vWorldXZ;
varying float vViewDepth;
uniform vec4 uZoneRects[${N}];
uniform float uZoneLit[${N}];
uniform vec3 uPlayer;
uniform float uCutRadius;
`;
const FRAG_CUT = /* glsl */ `
    if (uCutRadius > 0.0 && vViewDepth < uPlayer.z - 0.8) {
        float r = length(gl_FragCoord.xy - uPlayer.xy) / uCutRadius;
        if (r < 1.0) {
            // An ordered 2x2 dither: denser towards the middle, so the hole has a soft edge.
            float cell = mod(floor(gl_FragCoord.x), 2.0) + 2.0 * mod(floor(gl_FragCoord.y), 2.0);
            float keep = smoothstep(0.55, 1.0, r) * 4.0;
            if (cell >= keep) discard;
        }
    }
`;
const FRAG_BODY = /* glsl */ `
    float exploreDim = 0.0;
    for (int i = 0; i < ${N}; i++) {
        vec4 r = uZoneRects[i];
        if (vWorldXZ.x > r.x && vWorldXZ.x < r.z && vWorldXZ.y > r.y && vWorldXZ.y < r.w) {
            exploreDim = max(exploreDim, 1.0 - uZoneLit[i]);
        }
    }
    float exploreGrey = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
    // "Slightly": greyed and a touch lighter, never so flat that the shape is lost.
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(exploreGrey) * 0.9 + 0.08, exploreDim * 0.7);
`;

/** Patch a basic material in place. Call once per material; returns it for chaining. */
export function withWorldShader<T extends Material>(material: T, { sway = false }: { sway?: boolean } = {}): T {
    if (sway) material.defines = { ...material.defines, WORLD_SWAY: "" };
    material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, worldUniforms);
        shader.vertexShader = (VERT_HEAD + shader.vertexShader)
            .replace("#include <begin_vertex>", `#include <begin_vertex>${VERT_SWAY}`)
            .replace("#include <project_vertex>", `#include <project_vertex>${VERT_BODY}`);
        shader.fragmentShader = (FRAG_HEAD + shader.fragmentShader)
            .replace("#include <clipping_planes_fragment>", `#include <clipping_planes_fragment>${FRAG_CUT}`)
            .replace("#include <opaque_fragment>", `#include <opaque_fragment>${FRAG_BODY}`);
    };
    material.customProgramCacheKey = () => (sway ? "world-sway" : "world");
    return material;
}
