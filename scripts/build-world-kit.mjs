#!/usr/bin/env node
/**
 * Builds public/world/kit.glb, the one GLB the /world scene loads (WORLD.md §6, §9).
 *
 * Input: the four Kenney zips from kenney.nl. kenney.nl refuses non-browser downloads, so fetch
 * them by hand. They are CC0 and stay out of the repo; only the processed GLB is committed.
 *
 *   kenney_city-kit-commercial_2.1.zip  kenney_city-kit-suburban_20.zip
 *   kenney_city-kit-roads.zip           kenney_watercraft-pack.zip
 *
 * Usage: node scripts/build-world-kit.mjs [dir-with-zips]   (default: ~/Downloads)
 *
 * Every selected model becomes one named node at the root of a single scene, so the runtime can
 * look models up by name. Then: dedup, prune, weld, reorder + quantize, and meshopt compression
 * (§9: meshopt over Draco). The four colormaps stay separate PNGs; together they are ~43 kB.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { dedup, mergeDocuments, prune, quantize, reorder, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";

const ZIPS = {
    commercial: "kenney_city-kit-commercial_2.1.zip",
    suburban: "kenney_city-kit-suburban_20.zip",
    roads: "kenney_city-kit-roads.zip",
    watercraft: "kenney_watercraft-pack.zip",
};

/** What the block uses. Names must match `src/app/world/placements.ts`. */
const MODELS = {
    commercial: [
        "building-a", "building-c", "building-e", "building-j", "building-skyscraper-c",
        "low-detail-building-a", "low-detail-building-c", "low-detail-building-e", "low-detail-building-g",
        "low-detail-building-i", "low-detail-building-k", "low-detail-building-m", "low-detail-building-wide-a",
        "detail-parasol-a", "detail-parasol-b", "detail-awning-wide",
    ],
    suburban: [
        "building-type-g", "building-type-k", "tree-large", "tree-small", "fence-1x3", "fence", "planter",
        "path-long", "path-stones-long",
    ],
    roads: [
        "road-straight", "road-crossing", "construction-fence", "construction-cone", "construction-barrier",
        "light-square", "light-curved", "dumpster",
    ],
    watercraft: ["boat-speed-a", "boat-row-small", "buoy"],
};

const zipDir = process.argv[2] ?? join(homedir(), "Downloads");
const out = join(process.cwd(), "public", "world", "kit.glb");
const work = mkdtempSync(join(tmpdir(), "world-kit-"));

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });

try {
    const target = new Document();
    target.createBuffer();
    const root = target.createScene("kit");
    target.getRoot().setDefaultScene(root);

    for (const [kit, names] of Object.entries(MODELS)) {
        const dir = join(work, kit);
        execFileSync("unzip", ["-q", "-o", join(zipDir, ZIPS[kit]), "-d", dir]);
        for (const name of names) {
            const source = await io.read(join(dir, "Models", "GLB format", `${name}.glb`));
            const map = mergeDocuments(target, source);
            // Re-home the merged scene's nodes under one node named after the model.
            const model = target.createNode(name);
            for (const scene of source.getRoot().listScenes()) {
                const merged = map.get(scene);
                for (const child of merged.listChildren()) model.addChild(child);
                merged.dispose();
            }
            root.addChild(model);
        }
    }

    // mergeDocuments brings each source's buffer along; one buffer is all a GLB can hold.
    const [buffer, ...extra] = target.getRoot().listBuffers();
    for (const accessor of target.getRoot().listAccessors()) accessor.setBuffer(buffer);
    for (const b of extra) b.dispose();

    await target.transform(
        dedup(),
        prune(),
        weld(),
        reorder({ encoder: MeshoptEncoder }),
        quantize(),
    );
    target.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({
        method: EXTMeshoptCompression.EncoderMethod.QUANTIZE,
    });

    await io.write(out, target);
    const models = Object.values(MODELS).flat().length;
    console.log(`kit.glb: ${models} models, ${(statSync(out).size / 1024).toFixed(1)} KiB -> ${out}`);
} finally {
    rmSync(work, { recursive: true, force: true });
}
