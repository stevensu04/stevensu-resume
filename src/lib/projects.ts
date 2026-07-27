/**
 * Project loader — reads `content/projects/*.md`.
 *
 * SERVER ONLY. This module touches the filesystem; importing it from a client component
 * will fail the build. Client code should import types and `toneClasses` from
 * `project-schema.ts` instead.
 *
 * Adding a project is a matter of dropping one markdown file into `content/projects/`.
 * See CONTENT.md.
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import {
    TONES,
    type Project,
    type ProjectCallout,
    type ProjectMeta,
    type Tone,
} from "./project-schema";

const CONTENT_DIR = path.join(process.cwd(), "content", "projects");

/**
 * Validation is strict and throws at build time with the offending filename and field.
 * A portfolio that renders a half-broken card is worse than one that refuses to build.
 */
class ContentError extends Error {
    constructor(file: string, message: string) {
        super(`[content] ${file}: ${message}`);
        this.name = "ContentError";
    }
}

type Raw = Record<string, unknown>;

function requireString(file: string, data: Raw, key: string): string {
    const v = data[key];
    if (typeof v !== "string" || v.trim() === "") {
        throw new ContentError(file, `"${key}" is required and must be a non-empty string`);
    }
    return v.trim();
}

function optionalString(file: string, data: Raw, key: string): string | undefined {
    const v = data[key];
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "string") throw new ContentError(file, `"${key}" must be a string`);
    return v.trim() || undefined;
}

function requireTone(file: string, value: unknown, where: string): Tone {
    if (typeof value !== "string" || !TONES.includes(value as Tone)) {
        throw new ContentError(file, `${where} has tone "${String(value)}"; expected one of ${TONES.join(", ")}`);
    }
    return value as Tone;
}

function parseMeta(file: string, value: unknown): ProjectMeta[] {
    if (value === undefined) return [];
    if (!Array.isArray(value)) throw new ContentError(file, `"meta" must be a list`);

    return value.map((row, i) => {
        const r = row as Raw;
        if (typeof r?.label !== "string" || typeof r?.value !== "string") {
            throw new ContentError(file, `meta[${i}] needs both "label" and "value" strings`);
        }
        return {
            label: r.label,
            value: r.value,
            mono: r.mono === true,
            wide: r.wide === true,
            badge: r.badge === undefined ? undefined : requireTone(file, r.badge, `meta[${i}].badge`),
        };
    });
}

function parseCallouts(file: string, value: unknown): ProjectCallout[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) throw new ContentError(file, `"callouts" must be a list`);

    return value.map((row, i) => {
        const r = row as Raw;
        if (r?.section !== "problem" && r?.section !== "solution") {
            throw new ContentError(file, `callouts[${i}].section must be "problem" or "solution"`);
        }
        if (typeof r?.body !== "string" || !r.body.trim()) {
            throw new ContentError(file, `callouts[${i}].body is required`);
        }
        return {
            section: r.section,
            tone: requireTone(file, r.tone, `callouts[${i}].tone`),
            icon: typeof r.icon === "string" ? r.icon : undefined,
            title: typeof r.title === "string" ? r.title : undefined,
            body: r.body.trim(),
            quote: r.quote === true,
        };
    });
}

function parseProject(file: string, data: Raw): Project {
    const slug = optionalString(file, data, "slug") ?? file.replace(/\.md$/, "");

    const techRaw = data.tech;
    if (!Array.isArray(techRaw) || techRaw.some((t) => typeof t !== "string")) {
        throw new ContentError(file, `"tech" is required and must be a list of strings`);
    }

    let status: Project["status"];
    if (data.status !== undefined) {
        const s = data.status as Raw;
        if (typeof s?.label !== "string") {
            throw new ContentError(file, `"status.label" must be a string`);
        }
        status = { label: s.label, tone: requireTone(file, s.tone, `status.tone`) };
    }

    const order = data.order === undefined ? 999 : Number(data.order);
    if (!Number.isFinite(order)) throw new ContentError(file, `"order" must be a number`);

    return {
        slug,
        title: requireString(file, data, "title"),
        category: requireString(file, data, "category"),
        order,
        img: optionalString(file, data, "img") ?? null,
        summary: requireString(file, data, "summary"),
        tech: techRaw as string[],
        featured: data.featured === true,
        status,
        demo: optionalString(file, data, "demo"),
        repo: optionalString(file, data, "repo"),
        meta: parseMeta(file, data.meta),
        problem: requireString(file, data, "problem"),
        solution: requireString(file, data, "solution"),
        solutionHeading: optionalString(file, data, "solutionHeading"),
        callouts: parseCallouts(file, data.callouts),
    };
}

/** Reads and validates every project. Sorted by `order`, then title. */
export function getProjects(): Project[] {
    if (!fs.existsSync(CONTENT_DIR)) {
        throw new Error(`[content] Missing directory: ${CONTENT_DIR}. See CONTENT.md.`);
    }

    const files = fs
        .readdirSync(CONTENT_DIR)
        .filter((f) => f.endsWith(".md") && !f.startsWith("_") && f !== "README.md");

    const projects = files.map((file) => {
        const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
        const { data } = matter(raw);
        return parseProject(file, data as Raw);
    });

    const seen = new Set<string>();
    for (const p of projects) {
        if (seen.has(p.slug)) throw new Error(`[content] Duplicate slug "${p.slug}"`);
        seen.add(p.slug);
    }

    return projects.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}
