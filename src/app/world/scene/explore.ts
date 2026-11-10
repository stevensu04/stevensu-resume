import type { Material } from "three";
import { ZONES } from "../zones";

/**
 * Light-up on visit (WORLD.md §5): each content zone starts slightly desaturated and comes to full
 * colour once explored, so one glance shows what's left. One shader patch on the shared materials
 * does it for every kit instance and hand-made prop at once: a fragment inside an unexplored
 * zone's footprint is pulled towards grey.
 */
const CONTENT_ZONES = ZONES.filter((z) => z.number !== null);
export const EXPLORE_ZONE_IDS = CONTENT_ZONES.map((z) => z.id);
const N = CONTENT_ZONES.length;

/** Shared by every patched material. `lit` eases from 0 to 1 per zone (see Scene's ExploreFade). */
export const exploreUniforms = {
    uZoneRects: { value: CONTENT_ZONES.map((z) => [z.x - z.w / 2, z.z - z.d / 2, z.x + z.w / 2, z.z + z.d / 2]).flat() },
    uZoneLit: { value: new Array<number>(N).fill(0) },
};

const VERT_HEAD = /* glsl */ `varying vec2 vExploreXZ;\n`;
const VERT_BODY = /* glsl */ `
    vec4 exploreWorld = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
        exploreWorld = instanceMatrix * exploreWorld;
    #endif
    vExploreXZ = (modelMatrix * exploreWorld).xz;
`;
const FRAG_HEAD = /* glsl */ `
varying vec2 vExploreXZ;
uniform vec4 uZoneRects[${N}];
uniform float uZoneLit[${N}];
`;
const FRAG_BODY = /* glsl */ `
    float exploreDim = 0.0;
    for (int i = 0; i < ${N}; i++) {
        vec4 r = uZoneRects[i];
        if (vExploreXZ.x > r.x && vExploreXZ.x < r.z && vExploreXZ.y > r.y && vExploreXZ.y < r.w) {
            exploreDim = max(exploreDim, 1.0 - uZoneLit[i]);
        }
    }
    float exploreGrey = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
    // "Slightly": greyed and a touch lighter, never so flat that the shape is lost.
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(exploreGrey) * 0.9 + 0.08, exploreDim * 0.7);
`;

/** Patch a basic material in place. Safe to call once per material; returns it for chaining. */
export function withExplore<T extends Material>(material: T): T {
    material.onBeforeCompile = (shader) => {
        // The same uniform objects in every program, so one write updates them all. three accepts a
        // vec4[] as a flat number array.
        shader.uniforms.uZoneRects = exploreUniforms.uZoneRects;
        shader.uniforms.uZoneLit = exploreUniforms.uZoneLit;
        shader.vertexShader = VERT_HEAD + shader.vertexShader.replace("#include <project_vertex>", `#include <project_vertex>${VERT_BODY}`);
        shader.fragmentShader = FRAG_HEAD + shader.fragmentShader.replace("#include <opaque_fragment>", `#include <opaque_fragment>${FRAG_BODY}`);
    };
    material.customProgramCacheKey = () => "explore";
    return material;
}
