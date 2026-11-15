/**
 * Checks the *contents* of public/StevenSu_Resume.pdf, not just that it exists.
 *
 * The PDF is a binary, so a code review never shows what changed inside it. It once held a CV
 * written for one consulting job, behind the site's second call to action. scripts/build-cv.py
 * states the rules this file must follow; this script reads the PDF and re-checks them, so a
 * per-application CV copied over the public one (or a CV that drifted from the site) fails CI.
 *
 * Rules checked (see the docstring at the top of scripts/build-cv.py):
 *   1. No named employer, programme or location target; no street address or phone number.
 *   2. Skyveil Studio and the E.SUN 10% number are on it (both are /world stops, and the site
 *      says everything there is also on the CV).
 *   3. /Title and /Author are set.
 *   Plus the contracts the docstring calls out:
 *   - The work-rights line matches site.workRights word for word.
 *   - The "Technical Stack" and "Data & DevOps" lines list the same items as techRings in
 *     src/lib/stack.ts (as sets; a trailing "(…)" on a CV item is ignored, e.g. "Airflow (ETL)").
 *   - site.cvUpdated matches the month the PDF was generated.
 *
 * Usage: npm run check:cv            # checks public/StevenSu_Resume.pdf
 *        node scripts/check-cv.mjs some.pdf
 *
 * Text extraction is written for ReportLab's output (ASCII85 + Flate streams, `(…) Tj`
 * strings). If a correct-looking PDF fails here, fix this script rather than the PDF.
 */
import { readFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";

const PDF = process.argv[2] ?? "public/StevenSu_Resume.pdf";
const raw = (await readFile(PDF)).toString("latin1");
const siteTs = await readFile("src/lib/site.ts", "utf8");
const stackTs = await readFile("src/lib/stack.ts", "utf8");

// ---------------------------------------------------------------------------------------------
// PDF → text
// ---------------------------------------------------------------------------------------------

/** ASCII85 → bytes. ReportLab ends the data with "~>" and omits the opening "<~". */
function a85(s) {
    s = s.replace(/\s/g, "").replace(/^<~/, "").replace(/~>$/, "");
    const out = [];
    for (let i = 0; i < s.length; ) {
        if (s[i] === "z") { out.push(0, 0, 0, 0); i++; continue; }
        const chunk = s.slice(i, i + 5);
        i += 5;
        const pad = 5 - chunk.length;
        let n = 0;
        for (const ch of chunk + "uuuu".slice(0, pad)) n = n * 85 + (ch.charCodeAt(0) - 33);
        out.push(...[(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].slice(0, 4 - pad));
    }
    return Buffer.from(out);
}

/** A PDF literal string body (without the parentheses) → text. */
function unescapeLiteral(s) {
    return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, e) => {
        const simple = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
        return e in simple ? simple[e] : String.fromCharCode(parseInt(e, 8));
    });
}

/** Every text block (BT … ET) of every content stream, as one string per block. */
function textBlocks(pdf) {
    const blocks = [];
    for (const m of pdf.matchAll(/\d+ 0 obj([\s\S]*?)endobj/g)) {
        const body = m[1];
        const i = body.indexOf("stream");
        if (i === -1) continue;
        const dict = body.slice(0, i);
        let data = body.slice(i + 6).replace(/^\r?\n/, "");
        data = data.slice(0, data.lastIndexOf("endstream"));
        let decoded;
        try {
            let bytes = /ASCII85Decode/.test(dict) ? a85(data) : Buffer.from(data, "latin1");
            if (/FlateDecode/.test(dict)) bytes = inflateSync(bytes);
            decoded = bytes.toString("latin1");
        } catch {
            continue; // fonts, images: not text
        }
        for (const bt of decoded.matchAll(/\bBT\b([\s\S]*?)\bET\b/g)) {
            // Literals in order; T* (next line) becomes a space so wrapped lines rejoin.
            const text = [...bt[1].matchAll(/\(((?:[^()\\]|\\[\s\S])*)\)|T\*/g)]
                .map((t) => (t[0] === "T*" ? " " : unescapeLiteral(t[1])))
                .join("")
                .replace(/\s+/g, " ")
                .trim();
            if (text) blocks.push(text);
        }
    }
    return blocks;
}

/** An info-dictionary string: literal "(…)" or UTF-16BE hex "<FEFF…>". */
function infoString(pdf, key) {
    const lit = pdf.match(new RegExp(`/${key}\\s*\\(((?:[^()\\\\]|\\\\[\\s\\S])*)\\)`));
    if (lit) return unescapeLiteral(lit[1]);
    const hex = pdf.match(new RegExp(`/${key}\\s*<([0-9A-Fa-f\\s]*)>`));
    if (!hex) return "";
    const bytes = Buffer.from(hex[1].replace(/\s/g, ""), "hex");
    if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return bytes.subarray(2).swap16().toString("utf16le");
    }
    return bytes.toString("latin1");
}

const blocks = textBlocks(raw);
const text = blocks.join("\n");

// ---------------------------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------------------------

const problems = [];
const fail = (msg) => problems.push(msg);

if (blocks.length === 0) {
    fail("no text could be extracted — not a ReportLab PDF? Fix this script before trusting it.");
}

// 1. No targeting, no home address or phone.
const BANNED = [
    [/\bEY\b/, 'names a specific employer ("EY")'],
    [/Technology Consulting/i, 'targets a consulting programme ("Technology Consulting")'],
    [/\bgrad(uate)? program(me)?\s+(at|with)\b/i, 'targets one company\'s graduate programme ("graduate program at/with …")'],
    [/\bNisient\b/i, 'names a specific employer ("Nisient") — that is a per-application CV'],
    [/relocate to the\b|Sunshine Coast/i, "targets one location (per-application relocation line)"],
    // `quiet`: personal details are reported without echoing them — CI logs on a public repo are public.
    [/Eight Mile Plains|\bQLD\s+\d{4}\b/i, "shows a street-level address or postcode", "quiet"],
    [/(\+61\s?4|\b04)\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/, "shows a mobile number", "quiet"],
    [/\beligible\b|sponsorship|holding (a |an )?(485|temporary graduate)/i, 'work-rights wording other than "Applying for" (see site.workRights)'],
];
for (const [re, why, quiet] of BANNED) {
    if (re.test(text)) fail(quiet ? why : `${why}: ${text.match(re)[0]}`);
}

// 2. Every /world stop the docstring names.
const REQUIRED = [
    [/Skyveil Studio/, "Skyveil Studio is missing (a current role on /about and /world stop 6)"],
    [/E\.SUN/, "E.SUN is missing (/world stop 1)"],
    [/\b10%/, "the E.SUN 10% wait-time number is missing (/world stop 1)"],
];
for (const [re, why] of REQUIRED) if (!re.test(text)) fail(why);

// 3. Metadata.
const title = infoString(raw, "Title");
const author = infoString(raw, "Author");
if (!title || /anonymous/i.test(title)) fail(`/Title is "${title}" — set it to your name and role`);
if (!author || /anonymous/i.test(author)) fail(`/Author is "${author}" — set it to your name`);

// Work-rights line matches site.ts word for word.
const workRights = siteTs.match(/workRights:\s*"([^"]+)"/)?.[1];
if (workRights && !text.includes(workRights)) {
    fail(`site.workRights is not on the CV word for word: "${workRights}"`);
}

// Skill buckets match techRings (as sets).
const rings = [...stackTs.matchAll(/label:\s*"([^"]+)"[\s\S]*?items:\s*\[([\s\S]*?)\]/g)].map((m) => ({
    label: m[1],
    items: [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
}));
if (rings.length === 0) fail("could not read techRings from src/lib/stack.ts — update this script");
for (const ring of rings) {
    // The line can be its own text block or share one with other skill lines, so take the text
    // after "<label>:" up to the next "Some Label:" (or the end of the block).
    const block = blocks.find((b) => b.includes(`${ring.label}:`));
    if (!block) {
        fail(`no "${ring.label}:" line on the CV — it must match techRings in src/lib/stack.ts`);
        continue;
    }
    let rest = block.slice(block.indexOf(`${ring.label}:`) + ring.label.length + 1);
    const nextLabel = rest.search(/\s(?:[A-Z][\w/.-]*\s?(?:&\s)?){1,4}:/);
    if (nextLabel !== -1) rest = rest.slice(0, nextLabel);
    const cvItems = rest
        .split(",")
        .map((s) => s.replace(/\s*\([^)]*\)\s*$/, "").trim())
        .filter(Boolean);
    const missing = ring.items.filter((x) => !cvItems.includes(x));
    const extra = cvItems.filter((x) => !ring.items.includes(x));
    if (missing.length || extra.length) {
        fail(
            `"${ring.label}" differs from techRings in src/lib/stack.ts` +
                (missing.length ? ` — only in stack.ts: ${missing.join(", ")}` : "") +
                (extra.length ? ` — only on the CV: ${extra.join(", ")}` : ""),
        );
    }
}

// site.cvUpdated matches the PDF's creation month.
const created = raw.match(/\/CreationDate\s*\(D:(\d{4})(\d{2})/);
const cvUpdated = siteTs.match(/cvUpdated:\s*"([^"]+)"/)?.[1];
if (created && cvUpdated) {
    const month = new Date(Date.UTC(+created[1], +created[2] - 1, 1)).toLocaleString("en-AU", { month: "short", timeZone: "UTC" });
    const expected = `${month} ${created[1]}`;
    if (cvUpdated !== expected) {
        fail(`site.cvUpdated is "${cvUpdated}" but the PDF was generated in ${expected} — update src/lib/site.ts`);
    }
}

// ---------------------------------------------------------------------------------------------

if (problems.length) {
    console.error(`${PDF}:\n${problems.map((p) => `  ✗ ${p}`).join("\n")}`);
    process.exit(1);
}
console.log(
    `${PDF}: ok — no employer/location target or home details, /world stops present, ` +
        `metadata set, work rights and skill lines match the site, dated ${cvUpdated ?? "(no cvUpdated)"}.`,
);
