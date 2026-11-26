// Measures /world headlessly (WORLD2.md §12): script bytes (Resource Timing, gzip as served by
// `next start`), GLB bytes, and draw calls / triangles per frame (WebGL2 draw calls counted between
// animation frames), in the follow view and the whole-block view. Optionally saves screenshots.
//
//   node scripts/world-measure.mjs <origin> [query] [shotPrefix]
//   node scripts/world-measure.mjs http://localhost:3001                     # production baseline
//   DSF=2 node scripts/world-measure.mjs http://localhost:3000 "?poster" out  # clean 2x overview (dev only)
//
// Playwright isn't a dependency of the site. Point PLAYWRIGHT at any installed copy (an npx cache
// works), e.g. PLAYWRIGHT=~/.npm/_npx/<hash>/node_modules/playwright. It drives the installed
// Chrome (`channel: "chrome"`), as the poster pipeline does (WORLD.md, 16 Nov 2026).
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "playwright");

const [, , origin = "http://localhost:3001", query = "", shots = ""] = process.argv;
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu-rasterization", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 880 }, deviceScaleFactor: Number(process.env.DSF || 1) });
const logs = [];
page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(`${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));

await page.addInitScript(() => {
    const st = { calls: 0, tris: 0, frames: [], times: [] };
    window.__draw = st;
    const P = WebGL2RenderingContext.prototype;
    const TRI = 4;
    const wrap = (name, triCount) => {
        const orig = P[name];
        P[name] = function (...a) {
            st.calls++;
            st.tris += triCount(a);
            return orig.apply(this, a);
        };
    };
    wrap("drawElements", (a) => (a[0] === TRI ? a[1] / 3 : 0));
    wrap("drawArrays", (a) => (a[0] === TRI ? a[2] / 3 : 0));
    wrap("drawElementsInstanced", (a) => (a[0] === TRI ? (a[1] / 3) * a[4] : 0));
    wrap("drawArraysInstanced", (a) => (a[0] === TRI ? (a[2] / 3) * a[3] : 0));
    let lc = 0, lt = 0;
    const tick = (t) => {
        st.frames.push([st.calls - lc, st.tris - lt]);
        st.times.push(t);
        if (st.frames.length > 240) { st.frames.shift(); st.times.shift(); }
        lc = st.calls; lt = st.tris;
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
});

const scriptBytes = () =>
    page.evaluate(() => performance.getEntriesByType("resource").filter((e) => e.initiatorType === "script" || /\.js(\?|$)/.test(e.name)).reduce((s, e) => s + e.encodedBodySize, 0));
const glbBytes = () =>
    page.evaluate(() => performance.getEntriesByType("resource").filter((e) => /\.glb(\?|$)/.test(e.name)).map((e) => [e.name.split("/").pop(), e.encodedBodySize, e.transferSize]));
const sample = async (ms = 2500) => {
    await page.evaluate(() => { window.__draw.frames.length = 0; window.__draw.times.length = 0; });
    await page.waitForTimeout(ms);
    return page.evaluate(() => {
        const f = window.__draw.frames.filter(([c]) => c > 0);
        const med = (i) => { const v = f.map((x) => x[i]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)] ?? 0; };
        const max = (i) => Math.max(0, ...f.map((x) => x[i]));
        const t = window.__draw.times;
        const fps = t.length > 1 ? ((t.length - 1) * 1000) / (t[t.length - 1] - t[0]) : 0;
        return { frames: f.length, callsMedian: med(0), callsMax: max(0), trisMedian: Math.round(med(1)), fps: Math.round(fps * 10) / 10 };
    });
};

const url = `${origin}/world${query}`;
await page.goto(url, { waitUntil: "networkidle" });
await page.reload({ waitUntil: "networkidle" }); // second navigation (WORLD.md M1 note)
const before = await scriptBytes();
await page.getByRole("button", { name: "Enter the world" }).click();
await page.waitForFunction(() => ![...document.querySelectorAll('[role="status"]')].some((n) => /Loading the/.test(n.textContent || "")), null, { timeout: 60000 });
await page.waitForTimeout(5000);
const after = await scriptBytes();
const follow = await sample();
if (shots) await page.screenshot({ path: `${shots}-follow.png` });

const wide = page.getByRole("button", { name: "Zoom out to the whole block" });
let whole = null;
if (await wide.count()) {
    await wide.click();
    await page.waitForTimeout(2500);
    whole = await sample();
    if (shots) await page.screenshot({ path: `${shots}-whole.png` });
} else if (shots) {
    await page.screenshot({ path: `${shots}-whole.png` });
}

console.log(JSON.stringify({ url, scriptBytesBeforePress: before, scriptBytesWithScene: after, glb: await glbBytes(), follow, whole, logs }, null, 2));
await browser.close();
