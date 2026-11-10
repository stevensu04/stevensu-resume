#!/usr/bin/env node
/**
 * Builds public/world/steven.glb: Steven's DECO7381 avatar, one mesh and three clips in one file
 * (WORLD.md §9, "Avatar size note"). Reused with Team 41's permission.
 *
 * Input: the optimised GLBs from the DECO7381 prototype. Each embeds the full 28k-triangle mesh and
 * a 2048 px WebP, about 1.1 MB apiece, so loading rigged + idle + walk + run fetched the same mesh
 * four times. This keeps the mesh once and moves the three clips onto it:
 *
 *   steven-rigged.glb   mesh, skin, texture   (its own clip is dropped)
 *   steven-idle.glb     → clip "Idle"
 *   steven-walk.glb     → clip "Walk"
 *   steven-run.glb      → clip "Run"
 *
 * Then it brings the avatar down to the world's style (§6): the mesh is simplified (he is ~40 px
 * tall on screen) and the texture shrinks to 256 px JPEG. The texture step uses macOS `sips`.
 *
 * Usage: node scripts/build-world-avatar.mjs [dir-with-optimised-glbs]
 *   default: ../../DECO7381/team-41-formosa-bauhaus/src/prototype/public/models/steven/optimised
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, mergeDocuments, prune, simplify, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";

const SOURCE = resolve(
    process.argv[2] ?? join(process.cwd(), "../../DECO7381/team-41-formosa-bauhaus/src/prototype/public/models/steven/optimised"),
);
const OUT = join(process.cwd(), "public", "world", "steven.glb");
const CLIPS = { Idle: "steven-idle.glb", Walk: "steven-walk.glb", Run: "steven-run.glb" };
/** Keep this share of the triangles. 28k → ~7k: plenty for a figure 40–80 px tall. */
const SIMPLIFY_RATIO = 0.2;
const TEXTURE_PX = 256;

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const doc = await io.read(join(SOURCE, "steven-rigged.glb"));
const root = doc.getRoot();
for (const anim of root.listAnimations()) anim.dispose();
const nodesByName = new Map(root.listNodes().map((n) => [n.getName(), n]));

// Move each clip onto the rigged skeleton, matching bones by name, then let prune drop the rest.
for (const [name, file] of Object.entries(CLIPS)) {
    const source = await io.read(join(SOURCE, file));
    const map = mergeDocuments(doc, source);
    const anim = map.get(source.getRoot().listAnimations()[0]);
    anim.setName(name);
    for (const channel of anim.listChannels()) {
        const bone = nodesByName.get(channel.getTargetNode()?.getName());
        if (!bone) throw new Error(`${file}: no bone named ${channel.getTargetNode()?.getName()} in the rig`);
        channel.setTargetNode(bone);
    }
    for (const scene of source.getRoot().listScenes()) map.get(scene).dispose();
}
for (const anim of root.listAnimations()) if (!Object.hasOwn(CLIPS, anim.getName())) anim.dispose();

// One buffer, as a GLB requires.
const [buffer, ...extra] = root.listBuffers();
for (const accessor of root.listAccessors()) accessor.setBuffer(buffer);
for (const b of extra) b.dispose();

await doc.transform(dedup(), prune(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: SIMPLIFY_RATIO, error: 0.01 }));

// Texture: 2048 px WebP → 256 px JPEG. Unlit and tiny on screen, so detail is invisible anyway.
const work = mkdtempSync(join(tmpdir(), "world-avatar-"));
try {
    for (const texture of root.listTextures()) {
        const src = join(work, "in.webp");
        const dst = join(work, "out.jpg");
        writeFileSync(src, texture.getImage());
        execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", String(TEXTURE_PX), src, "--out", dst], { stdio: "ignore" });
        texture.setImage(new Uint8Array(readFileSync(dst))).setMimeType("image/jpeg").setURI("steven.jpg");
    }
} finally {
    rmSync(work, { recursive: true, force: true });
}
for (const ext of root.listExtensionsUsed()) {
    if (["EXT_texture_webp", "KHR_materials_ior", "KHR_materials_specular"].includes(ext.extensionName)) ext.dispose();
}

await doc.transform(prune());
doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
await io.write(OUT, doc);

const tris = root.listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? 0) / 3, 0);
const clips = root.listAnimations().map((a) => a.getName()).join(", ");
console.log(`steven.glb: ${tris} triangles, clips ${clips}, ${(statSync(OUT).size / 1024).toFixed(1)} KiB -> ${OUT}`);
