"use client";
import React, { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";

const ContactMe = () => {
    const ringRef = useRef<HTMLDivElement>(null);
    /** True while the badge is sitting over the dark footer band. */
    const [onDark, setOnDark] = useState(false);

    useEffect(() => {
        // Two rect reads against an already-clean layout, on events the browser has
        // already coalesced to frame rate. React bails out when the value is unchanged.
        const measure = () => {
            const ring = ringRef.current;
            const footer = document.querySelector("footer");
            if (!ring || !footer) return;
            const r = ring.getBoundingClientRect();
            const f = footer.getBoundingClientRect();
            setOnDark(f.top < r.bottom && f.bottom > r.top);
        };

        measure();
        window.addEventListener("scroll", measure, { passive: true });
        window.addEventListener("resize", measure);
        return () => {
            window.removeEventListener("scroll", measure);
            window.removeEventListener("resize", measure);
        };
    }, []);

    return (
        // 💡 透過 md:left-4 md:right-auto md:bottom-4 確保桌面版在左下，手機版預設在右下
        <div className="fixed right-4 bottom-4 md:left-4 md:right-auto flex items-center justify-center z-50">
            {/* 縮小至 40：at w-48 the rotating ring reached x=208 and clipped the hero's proof
                numbers, which start at the page gutter (x=192). */}
            <div ref={ringRef} className="w-20 h-20 md:w-40 md:h-40 flex items-center justify-center relative">
                {/* 深色區塊自動換色：the badge is fixed, so it travels over the white pages and the
                    #121212 footer alike. It was fill-black and disappeared on the dark band.
                    (mix-blend-mode looks like the elegant fix but does not work here — the
                    `fixed z-50` wrapper forms its own stacking context, so the blend resolves
                    against transparency inside that group rather than against the page.) */}
                <svg viewBox="0 0 100 100" className="animate-spin-slow w-full h-full hidden md:block">
                <path
                    id="circlePath"
                    d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                    fill="transparent"
                />
                {/* 描邊光暈：the colour swap alone picks one winner for the whole ring, so while
                    the badge straddles the white/footer boundary half the glyphs sit on the wrong
                    background. A stroke in the opposite colour, painted *behind* the glyph via
                    paint-order, keeps those legible — the same trick map labels use over arbitrary
                    imagery. Invisible on a solid backdrop, and robust to any future one. */}
                <text
                    className={`text-[8.5px] font-semibold transition-[fill,stroke] duration-300 ${
                        onDark ? "fill-white stroke-[#121212]" : "fill-black stroke-white"
                    }`}
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                    paintOrder="stroke"
                >
                    <textPath xlinkHref="#circlePath">
                        {site.rotator}&nbsp;&nbsp;
                    </textPath>
                </text>
                </svg>

                <a
                href={`mailto:${site.email}`}
                aria-label={`Email ${site.name}`}
                className={`flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white shadow-xl w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-[10px] transition-all duration-300 ${
                    /* hover:bg-gray-900 would vanish into the #121212 footer. */
                    onDark ? "hover:bg-white hover:text-blue-600" : "hover:bg-gray-900"
                }`}
                >
                    <span className="text-[10px] md:text-xs leading-none text-center">
                        Contact<br />Me
                    </span>
                </a>
            </div>
        </div>
    );
};

export default ContactMe;