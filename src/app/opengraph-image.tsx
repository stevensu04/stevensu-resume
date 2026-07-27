import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Link-preview card for LinkedIn / Slack / iMessage. Generated at build time so there is
 * no binary asset to keep in sync with the positioning.
 *
 * Satori (which backs ImageResponse) supports flexbox only — no CSS grid — and requires an
 * explicit `display` on any element with more than one child.
 */
export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    background: "#0b0b0c",
                    padding: "72px 80px",
                    fontFamily: "sans-serif",
                }}
            >
                {/* Identity */}
                <div style={{ display: "flex", alignItems: "center" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 64,
                            height: 64,
                            borderRadius: 999,
                            background: "#ffffff",
                            color: "#0b0b0c",
                            fontSize: 36,
                            fontWeight: 700,
                        }}
                    >
                        S
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", marginLeft: 20 }}>
                        <div style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>
                            {site.name}
                        </div>
                        {/* Single interpolation — Satori treats each JSX child as a node and
                            requires an explicit `display` on any element with more than one. */}
                        <div style={{ fontSize: 20, fontWeight: 600, color: "#60a5fa" }}>
                            {`${site.role} · ${site.location}`}
                        </div>
                    </div>
                </div>

                {/* Pitch */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            // Sized to keep the headline on one line — at 76 it broke at the
                            // hyphen in "full-stack", splitting the word across two lines.
                            fontSize: 60,
                            fontWeight: 800,
                            color: "#ffffff",
                            lineHeight: 1.05,
                            letterSpacing: "-0.02em",
                        }}
                    >
                        {site.headline}
                    </div>
                    <div
                        style={{
                            fontSize: 26,
                            color: "#a1a1aa",
                            marginTop: 24,
                            maxWidth: 940,
                            lineHeight: 1.4,
                        }}
                    >
                        Next.js · TypeScript · Python · Django — shipped inside Queensland Government.
                    </div>
                </div>

                {/* Proof */}
                <div style={{ display: "flex", alignItems: "flex-end" }}>
                    {site.proof.map((p) => (
                        <div
                            key={p.value}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                marginRight: 64,
                            }}
                        >
                            <div style={{ fontSize: 40, fontWeight: 800, color: "#ffffff" }}>
                                {p.value}
                            </div>
                            <div style={{ fontSize: 18, color: "#71717a", marginTop: 4 }}>
                                {p.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ),
        size
    );
}
