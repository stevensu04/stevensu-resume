import React from "react";

/**
 * Headline whose words rise into place one after another.
 *
 * The animation is CSS only (`.anim-word` in globals.css). The server sends readable text and the
 * stylesheet only moves it, so the headline is there even if JS fails, hydration is slow, or a
 * corporate proxy blocks scripts. The previous framer-motion version rendered
 * `style="opacity:0"` into the server HTML, which tied the site's most important sentence to JS
 * and kept it invisible until ~1.9s after hydration.
 */
const AnimatedText = ({ text, className = "" }: { text: string; className?: string }) => (
    <div className="w-full mx-auto py-2 flex items-center justify-center text-center overflow-hidden">
        {/* No `capitalize` here — headlines are written with their intended casing at the call
            site. Forcing Title Case mangled sentence-case copy like "From the bank floor". */}
        <h1 className={`inline-block w-full font-bold text-8xl ${className}`}>
            {text.split(" ").map((word, index) => (
                <span
                    key={`${word}-${index}`}
                    className="anim-word inline-block"
                    style={{ "--word-index": index } as React.CSSProperties}
                >
                    {word}&nbsp;
                </span>
            ))}
        </h1>
    </div>
);

export default AnimatedText;
