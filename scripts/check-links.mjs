/**
 * Checks that every `demo` / `repo` URL in content/projects/*.md is still alive.
 *
 * Deliberately not part of the build: an external site going down should never stop this site
 * from deploying. Run it before publishing, or on a schedule.
 *
 * Usage: npm run check:links
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), "content", "projects");
const files = (await readdir(dir)).filter((f) => f.endsWith(".md") && !f.startsWith("_"));

let bad = 0;
for (const file of files) {
    const text = await readFile(path.join(dir, file), "utf8");
    for (const [, key, url] of text.matchAll(/^(demo|repo):\s*(https?:\/\/\S+)/gm)) {
        const res = await fetch(url, { redirect: "follow" }).catch(() => null);
        const ok = res?.ok ?? false;
        if (!ok) bad++;
        console.log(`${ok ? "ok  " : "DEAD"}  ${res?.status ?? "ERR"}  ${file} ${key}  ${url}`);
    }
}
console.log(bad ? `\n${bad} dead link(s).` : "\nAll links alive.");
process.exit(bad ? 1 : 0);
