import { Matrix4, Vector3, type BufferGeometry } from "three";
import { SLAB } from "../zones";
import { AREAS, type GroundRect } from "./walk";

/**
 * Where Steven can walk, and how to get there (WORLD.md §9: a kinematic controller on the XZ
 * plane, no physics engine).
 *
 * The block is a 0.5 m grid. A cell is blocked when it's off the ground (river, beyond the slab)
 * or when the real geometry of a solid model stands in it below head height. That geometry comes
 * from the models' own triangles, not their bounding boxes, so an L-shaped fence blocks two thin
 * strips, not the whole yard it encloses. Blocked cells are then grown by one cell for his body.
 *
 * Tap-to-move asks `findPath`: Dijkstra over the grid (8-connected, no corner cutting), then the
 * corners pulled tight with line-of-sight checks. If the tapped spot can't be reached (inside a
 * building, say), he goes to the nearest spot that can be.
 */
export type Nav = {
    minX: number;
    minZ: number;
    cols: number;
    rows: number;
    blocked: Uint8Array;
};

const CELL = 0.5;
/** Triangles entirely above this (roofs, canopies, the crane's jib) don't block walking. */
const HEAD_HEIGHT = 1.9;

export type NavSolid = { geometry: BufferGeometry; matrix: Matrix4 };

export function buildNav(solids: NavSolid[], rects: GroundRect[]): Nav {
    const minX = SLAB.minX;
    const minZ = SLAB.minZ;
    const cols = Math.ceil((SLAB.maxX - SLAB.minX) / CELL);
    const rows = Math.ceil((SLAB.maxZ - SLAB.minZ) / CELL);
    const raw = new Uint8Array(cols * rows);

    const cx = (i: number) => minX + (i + 0.5) * CELL;
    const cz = (j: number) => minZ + (j + 0.5) * CELL;

    // Off the ground: anything outside the walkable areas.
    for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
            const x = cx(i);
            const z = cz(j);
            if (!AREAS.some((a) => x >= a.minX && x <= a.maxX && z >= a.minZ && z <= a.maxZ)) raw[j * cols + i] = 1;
        }

    const mark = (x: number, z: number) => {
        const i = Math.floor((x - minX) / CELL);
        const j = Math.floor((z - minZ) / CELL);
        if (i >= 0 && j >= 0 && i < cols && j < rows) raw[j * cols + i] = 1;
    };

    // Solid geometry below head height, rasterised by sampling each triangle densely enough
    // (every quarter cell) that thin walls and fences leave no gaps.
    const a = new Vector3();
    const b = new Vector3();
    const c = new Vector3();
    for (const { geometry, matrix } of solids) {
        const pos = geometry.attributes.position;
        const index = geometry.index;
        const count = index ? index.count : pos.count;
        for (let t = 0; t < count; t += 3) {
            const ia = index ? index.getX(t) : t;
            const ib = index ? index.getX(t + 1) : t + 1;
            const ic = index ? index.getX(t + 2) : t + 2;
            a.fromBufferAttribute(pos, ia).applyMatrix4(matrix);
            b.fromBufferAttribute(pos, ib).applyMatrix4(matrix);
            c.fromBufferAttribute(pos, ic).applyMatrix4(matrix);
            if (Math.min(a.y, b.y, c.y) > HEAD_HEIGHT) continue;
            const longest = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
            const steps = Math.max(1, Math.ceil(longest / (CELL / 4)));
            for (let u = 0; u <= steps; u++)
                for (let v = 0; v <= steps - u; v++) {
                    const s = u / steps;
                    const r = v / steps;
                    const w = 1 - s - r;
                    mark(a.x * w + b.x * s + c.x * r, a.z * w + b.z * s + c.z * r);
                }
        }
    }

    // Hand-made solids are plain rectangles.
    for (const r of rects)
        for (let z = r.minZ; z <= r.maxZ; z += CELL / 2) for (let x = r.minX; x <= r.maxX; x += CELL / 2) mark(x, z);

    // Grow by one cell (8-neighbourhood) so his 0.45 m body stays clear of what he walks past.
    const blocked = new Uint8Array(raw);
    for (let j = 0; j < rows; j++)
        for (let i = 0; i < cols; i++) {
            if (!raw[j * cols + i]) continue;
            for (let dj = -1; dj <= 1; dj++)
                for (let di = -1; di <= 1; di++) {
                    const ni = i + di;
                    const nj = j + dj;
                    if (ni >= 0 && nj >= 0 && ni < cols && nj < rows) blocked[nj * cols + ni] = 1;
                }
        }
    return { minX, minZ, cols, rows, blocked };
}

function cellOf(nav: Nav, x: number, z: number): [number, number] {
    return [Math.floor((x - nav.minX) / CELL), Math.floor((z - nav.minZ) / CELL)];
}

function free(nav: Nav, i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < nav.cols && j < nav.rows && !nav.blocked[j * nav.cols + i];
}

export function canStandAt(nav: Nav, x: number, z: number): boolean {
    const [i, j] = cellOf(nav, x, z);
    return free(nav, i, j);
}

/** A straight walk from a to b stays on free cells (sampled every quarter cell). */
function clear(nav: Nav, ax: number, az: number, bx: number, bz: number): boolean {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL / 4));
    for (let s = 1; s <= steps; s++) {
        const k = s / steps;
        if (!canStandAt(nav, ax + (bx - ax) * k, az + (bz - az) * k)) return false;
    }
    return true;
}

/**
 * Waypoints from (fx, fz) towards (tx, tz), ending at the target itself when it's reachable, or at
 * the nearest reachable cell when it isn't. Empty when he's already there or boxed in.
 */
export function findPath(nav: Nav, fx: number, fz: number, tx: number, tz: number): [number, number][] {
    const { cols, rows } = nav;
    let [si, sj] = cellOf(nav, fx, fz);
    // Standing on a blocked cell (he can brush one at an edge): start from the nearest free one.
    if (!free(nav, si, sj)) {
        let best = Infinity;
        for (let dj = -2; dj <= 2; dj++)
            for (let di = -2; di <= 2; di++)
                if (free(nav, si + di, sj + dj) && di * di + dj * dj < best) {
                    best = di * di + dj * dj;
                    [si, sj] = [si + di, sj + dj];
                }
        if (best === Infinity) return [];
    }
    const [ti, tj] = cellOf(nav, tx, tz);

    // Dijkstra over every reachable cell, so an unreachable target can fall back to the nearest one.
    const dist = new Float32Array(cols * rows).fill(Infinity);
    const prev = new Int32Array(cols * rows).fill(-1);
    const heap: number[] = [];
    const push = (n: number) => {
        heap.push(n);
        let k = heap.length - 1;
        while (k > 0) {
            const p = (k - 1) >> 1;
            if (dist[heap[p]] <= dist[heap[k]]) break;
            [heap[p], heap[k]] = [heap[k], heap[p]];
            k = p;
        }
    };
    const pop = () => {
        const top = heap[0];
        const last = heap.pop()!;
        if (heap.length) {
            heap[0] = last;
            let k = 0;
            for (;;) {
                const l = 2 * k + 1;
                const r = l + 1;
                let m = k;
                if (l < heap.length && dist[heap[l]] < dist[heap[m]]) m = l;
                if (r < heap.length && dist[heap[r]] < dist[heap[m]]) m = r;
                if (m === k) break;
                [heap[m], heap[k]] = [heap[k], heap[m]];
                k = m;
            }
        }
        return top;
    };
    const start = sj * cols + si;
    dist[start] = 0;
    push(start);
    let goal = -1;
    let nearest = start;
    let nearestD = Infinity;
    while (heap.length) {
        const n = pop();
        const i = n % cols;
        const j = (n - i) / cols;
        const dTarget = (i - ti) ** 2 + (j - tj) ** 2;
        if (dTarget < nearestD) [nearest, nearestD] = [n, dTarget];
        if (i === ti && j === tj) {
            goal = n;
            break;
        }
        for (let dj = -1; dj <= 1; dj++)
            for (let di = -1; di <= 1; di++) {
                if (!di && !dj) continue;
                const ni = i + di;
                const nj = j + dj;
                if (!free(nav, ni, nj)) continue;
                // No cutting corners past a blocked cell.
                if (di && dj && (!free(nav, i + di, j) || !free(nav, i, j + dj))) continue;
                const nn = nj * cols + ni;
                const nd = dist[n] + (di && dj ? Math.SQRT2 : 1);
                if (nd < dist[nn]) {
                    dist[nn] = nd;
                    prev[nn] = n;
                    push(nn);
                }
            }
    }

    const end = goal >= 0 ? goal : nearest;
    const cells: [number, number][] = [];
    for (let n = end; n !== -1 && n !== start; n = prev[n]) {
        const i = n % cols;
        cells.push([nav.minX + (i + 0.5) * CELL, nav.minZ + ((n - i) / cols + 0.5) * CELL]);
    }
    cells.reverse();
    if (goal >= 0 && canStandAt(nav, tx, tz)) {
        if (cells.length) cells[cells.length - 1] = [tx, tz];
        else cells.push([tx, tz]);
    }
    if (!cells.length) return [];

    // Pull the string tight: from each point, jump to the furthest waypoint in plain sight.
    const path: [number, number][] = [];
    let [ax, az] = [fx, fz];
    let k = 0;
    while (k < cells.length) {
        let far = k;
        for (let m = cells.length - 1; m > k; m--)
            if (clear(nav, ax, az, cells[m][0], cells[m][1])) {
                far = m;
                break;
            }
        path.push(cells[far]);
        [ax, az] = cells[far];
        k = far + 1;
    }
    return path;
}
