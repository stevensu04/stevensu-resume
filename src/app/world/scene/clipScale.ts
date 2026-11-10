/**
 * Ported from DECO7381 Team 41, `src/storefront/scene/clipScale.ts`, unchanged apart from this
 * header. Reused with the team's permission (WORLD.md §9).
 */
/**
 * Take a baked-in bone scale out of an animation clip without changing the pose.
 *
 * The idle clip Meshy delivered (`steven-idle.glb`) keys `Hips.scale` at a
 * constant 1.177; walk and run key it at 1. The rig's rest pose is exactly
 * 1.72 m, so standing still made every character 1.90 m tall and walking made
 * them 1.66 m: the avatar visibly shrank the moment it moved and grew back when
 * it stopped. It was there for the default body too — a sized body only made
 * it obvious, because the shopper had just typed the number it was supposed to
 * be.
 *
 * A uniform scale `s` on a bone at position `P` is the same shape as scale 1
 * at `P / s`, drawn `s` times larger about the parent's origin. So removing
 * the scale and dividing that bone's position by `s` leaves the pose exactly
 * as authored, at the rig's own size — which is what the storefront scales
 * from.
 *
 * Only a constant, uniform scale is normalised. A scale that changes over the
 * clip or differs per axis is animation, not an export artefact, and is left
 * alone.
 *
 * Pure, and typed against the two fields it reads, so it runs on `three`'s
 * `KeyframeTrack` and is tested without it.
 */
export interface TrackLike {
  name: string;
  values: ArrayLike<number> & { [index: number]: number };
}

const TOLERANCE = 1e-3;

/** The one uniform scale a track holds for its whole length, or `null`. */
export function constantUniformScale(values: ArrayLike<number>): number | null {
  const first = values[0];
  if (first === undefined || values.length % 3 !== 0) return null;
  for (let i = 0; i < values.length; i += 1) {
    if (Math.abs(values[i]! - first) > TOLERANCE) return null;
  }
  return first;
}

/** Returns the tracks to keep; position tracks it corrects are modified in place. */
export function normaliseBoneScale<T extends TrackLike>(tracks: T[]): T[] {
  const drop = new Set<T>();
  for (const track of tracks) {
    if (!track.name.endsWith('.scale')) continue;
    const scale = constantUniformScale(track.values);
    if (scale === null || scale <= 0) continue;
    drop.add(track);
    if (Math.abs(scale - 1) <= TOLERANCE) continue;
    const bone = track.name.slice(0, -'.scale'.length);
    const position = tracks.find((t) => t.name === `${bone}.position`);
    if (position) for (let i = 0; i < position.values.length; i += 1) position.values[i] = position.values[i]! / scale;
  }
  return tracks.filter((track) => !drop.has(track));
}
