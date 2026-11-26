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
        background: "linear-gradient(180deg, #1b2646 0%, #2d3a60 55%, #43436a 100%)",
        /** A sprinkling of stars over the backdrop, which Global view shows (Explore draws its own in 3D). */
        stars:
            "radial-gradient(1.2px 1.2px at 8% 12%, #fff, transparent), radial-gradient(1px 1px at 19% 31%, #fff, transparent), radial-gradient(1.4px 1.4px at 27% 8%, #fff, transparent), radial-gradient(1px 1px at 36% 22%, #fff, transparent), radial-gradient(1.2px 1.2px at 47% 10%, #fff, transparent), radial-gradient(1px 1px at 58% 28%, #fff, transparent), radial-gradient(1.4px 1.4px at 66% 6%, #fff, transparent), radial-gradient(1px 1px at 74% 19%, #fff, transparent), radial-gradient(1.2px 1.2px at 83% 9%, #fff, transparent), radial-gradient(1px 1px at 91% 26%, #fff, transparent), radial-gradient(1px 1px at 14% 44%, #fff, transparent), radial-gradient(1.2px 1.2px at 94% 46%, #fff, transparent)",
        // Moonlight, brighter than the first pass (26 Nov 2026: "too dark"): a blue-white key from the moon's
        // direction and a cool sky, so a street is readable at eye level and the lamps add warmth, not sight.
        sky: "#8da0dc",
        ground: "#434a72",
        hemiIntensity: 1.6,
        sun: "#c4d2ff",
        sunIntensity: 1.35,
        fill: "#8796cc",
        fillIntensity: 0.55,
        fog: "#26304d",
        skyline: "#465680",
    },
} as const;
