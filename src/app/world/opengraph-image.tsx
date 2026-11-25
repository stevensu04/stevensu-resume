import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — walk around my career as a 3D city`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * /world's own link-preview card. Without it, sharing /world showed the homepage card, which
 * says nothing about the 3D city — the most memorable thing on the site.
 *
 * Background: og-background.jpg, the /world poster (poster.webp, rendered from the scene) resized
 * to 1200 wide and centre-cropped to 630. A JPEG because satori doesn't decode WebP. Re-make it
 * if the poster changes:
 *   sips -s format jpeg -s formatOptions 82 --resampleWidth 1200 poster.webp --out /tmp/p.jpg
 *   sips --cropToHeightWidth 630 1200 /tmp/p.jpg --out og-background.jpg
 *
 * The panel mirrors the card on the page itself (WorldShell), so the preview and what opens
 * after the click look like the same thing. No params, so it is generated once at build time.
 */
export default async function Image() {
    const background = await readFile(join(process.cwd(), "src/app/world/og-background.jpg"));
    const src = `data:image/jpeg;base64,${background.toString("base64")}`;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    position: "relative",
                    background: "#eef1f4",
                    fontFamily: "sans-serif",
                }}
            >
                {/* satori renders <img>, not next/image; alt is empty because the card's own alt
                    export describes the whole image. */}
                <img src={src} alt="" width={1200} height={630} style={{ position: "absolute", top: 0, left: 0 }} />

                <div
                    style={{
                        position: "absolute",
                        top: 48,
                        left: 48,
                        width: 470,
                        display: "flex",
                        flexDirection: "column",
                        padding: "32px 36px",
                        background: "rgba(255, 255, 255, 0.96)",
                        borderRadius: 24,
                        boxShadow: "0 12px 32px rgba(17, 24, 39, 0.14)",
                    }}
                >
                    <div style={{ display: "flex", fontSize: 18, fontWeight: 700, color: "#2563eb", letterSpacing: "0.12em" }}>
                        {`${site.name.toUpperCase()} · CAREER MAP`}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 46,
                            fontWeight: 800,
                            color: "#111827",
                            marginTop: 10,
                            lineHeight: 1.05,
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Walk around my career
                    </div>
                    <div style={{ display: "flex", fontSize: 22, color: "#4b5563", marginTop: 14, lineHeight: 1.35 }}>
                        Eleven stops, from a bank in Taipei to a 3D storefront in Brisbane — a 3D city you can walk through.
                    </div>
                </div>
            </div>
        ),
        size,
    );
}
