/**
 * The /world 2.0 look (WORLD2.md §3, decision D2): palette and light in one place. The light values
 * were tuned in the Phase 1 look spike, 26 Nov 2026 (WORLD2.md §12). Lighting.tsx uses them.
 */
export const LOOK = {
    /** The land, which v1 painted as beige paving, is grass. */
    grass: "#a3c47f",
    /** Behind the canvas: a soft sky fading to a warm haze. */
    background: "linear-gradient(180deg, #d6e6f2 0%, #e9eff2 55%, #f3ede1 100%)",

    /** Sky light: a little blue, so the shadows read cool against the warm sun. */
    sky: "#dbe7ff",
    ground: "#d8caa4",
    hemiIntensity: 1.2,
    /**
     * Lit ground ≈ 1.0 × its colour, ground in shadow ≈ 0.46; from the default camera, tops ≈ 1.0,
     * left faces ≈ 0.68, right faces ≈ 0.53: a readable three-tone.
     */
    sun: "#fff0d6",
    sunIntensity: 2.5,
    /** West-south-west, 42° up: a Brisbane late-summer afternoon (see Lighting.tsx). */
    sunDirection: [-1, 1.1, 0.7] as const,
    /** A weak shadowless fill from the east, so the faces turned away from the sun don't go muddy. */
    fill: "#e8eefc",
    fillIntensity: 0.7,
    fillDirection: [1, 0.5, -0.3] as const,
    fog: "#e4ebf0",
    skyline: "#d3dceb",

    /**
     * Night (WORLD2.md Phase 4): moonlight from the same direction, so the baked shadows still fit and
     * nothing re-bakes. The lit doorways, windows, screens and the club's sign keep their own glow
     * (shading.ts lamps), which is what makes the night worth switching to.
     */
    night: {
        background: "linear-gradient(180deg, #172039 0%, #25304f 55%, #39395a 100%)",
        sky: "#5b6fa8",
        ground: "#2a2d44",
        hemiIntensity: 1.05,
        sun: "#a9bcff",
        sunIntensity: 0.72,
        fill: "#6d7cb8",
        fillIntensity: 0.3,
        fog: "#26304d",
        skyline: "#465680",
    },
} as const;
