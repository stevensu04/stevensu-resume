"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The /about terminal card, typed out (28 Nov 2026, Steven's request): when the card scrolls into
 * view it types its code once, about 2.5 s, with a short pause at each line end and a caret that
 * keeps blinking at the end.
 *
 * Still readable everywhere, the same rule as AnimatedText's headline:
 * - The server renders the whole code. CSS hides it only while it waits to be typed, and only when
 *   motion is allowed (`.tw-code[data-state="pending"]` in globals.css), so there is no flash of the
 *   full text before typing starts. A <noscript> style undoes that, so without JS it simply shows.
 * - Reduced motion: shown whole at once, no typing, and the caret doesn't blink.
 * - Screen readers get one plain copy (sr-only); the drawn lines are aria-hidden, so the code is
 *   never read out a character at a time.
 * The card has a fixed height, so typing never moves the layout.
 */

type Segment = { text: string; className: string };
type Line = { segments: Segment[]; className: string };

const KEY = "text-gray-300";
const LINES: Line[] = [
    {
        className: "text-blue-400",
        segments: [
            { text: "const ", className: "text-blue-400" },
            { text: "developer", className: "text-yellow-200" },
            { text: " = {", className: "text-blue-400" },
        ],
    },
    {
        className: "pl-4",
        segments: [
            { text: "background: ", className: KEY },
            { text: '"Economics & Finance"', className: "text-green-400" },
            { text: ",", className: KEY },
        ],
    },
    {
        className: "pl-4",
        segments: [
            { text: "education: ", className: KEY },
            { text: '"Master of IT @ UQ"', className: "text-green-400" },
            { text: ",", className: KEY },
        ],
    },
    {
        className: "pl-4",
        segments: [
            { text: "specialization: [", className: KEY },
            { text: '"Full-stack", "AI Search & RAG"', className: "text-orange-400" },
            { text: "],", className: KEY },
        ],
    },
    {
        className: "pl-4",
        segments: [
            { text: "focus: ", className: KEY },
            { text: '"Information Retrieval & HCI"', className: "text-green-400" },
        ],
    },
    { className: "", segments: [{ text: "};", className: "text-blue-400" }] },
    { className: "mt-4", segments: [{ text: "// Ready to bridge strategy, code, and intelligent search...", className: "text-gray-500" }] },
];

const LENGTHS = LINES.map((l) => l.segments.reduce((n, s) => n + s.text.length, 0));
const TOTAL = LENGTHS.reduce((a, b) => a + b, 0);
/** A line end costs as long as this many characters: the pause before the next line. */
const LINE_PAUSE = 7;
const DURATION_MS = 2600;
const STEPS = TOTAL + LINE_PAUSE * (LINES.length - 1);
const PLAIN = LINES.map((l) => l.segments.map((s) => s.text).join("")).join("\n");

type State = "pending" | "typing" | "done";

/** Where `step` characters (and pauses) have got to: the line, and how many of its characters show. */
function position(step: number): { line: number; col: number } {
    let left = step;
    for (let i = 0; i < LINES.length; i++) {
        if (left <= LENGTHS[i]) return { line: i, col: left };
        left -= LENGTHS[i];
        if (i < LINES.length - 1) {
            if (left <= LINE_PAUSE) return { line: i, col: LENGTHS[i] };
            left -= LINE_PAUSE;
        }
    }
    return { line: LINES.length - 1, col: LENGTHS[LINES.length - 1] };
}

function Caret() {
    return <span className="tw-caret" aria-hidden="true" />;
}

/** One line, cut to its first `col` characters (all of them when col is undefined). */
function CodeLine({ line, col, caret }: { line: Line; col?: number; caret?: boolean }) {
    const shown = col ?? Infinity;
    // Where each segment starts in the line, so each can be cut without a running counter.
    const starts = line.segments.map((_, i) => line.segments.slice(0, i).reduce((n, s) => n + s.text.length, 0));
    return (
        <p className={line.className}>
            {line.segments.map((s, i) =>
                shown > starts[i] ? (
                    <span key={i} className={s.className}>
                        {s.text.slice(0, shown - starts[i])}
                    </span>
                ) : null,
            )}
            {caret && <Caret />}
        </p>
    );
}

export default function TypewriterCode() {
    const [state, setState] = useState<State>("pending");
    const [step, setStep] = useState(0);
    const root = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = root.current;
        if (!el) return;
        let frame = 0;
        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((e) => e.isIntersecting)) return;
                observer.disconnect();
                if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                    setState("done");
                    return;
                }
                setState("typing");
                const start = performance.now();
                const tick = (now: number) => {
                    const s = Math.min(STEPS, Math.floor(((now - start) / DURATION_MS) * STEPS));
                    setStep(s);
                    if (s < STEPS) frame = requestAnimationFrame(tick);
                    else setState("done");
                };
                frame = requestAnimationFrame(tick);
            },
            { threshold: 0.35 },
        );
        observer.observe(el);
        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, []);

    const at = position(step);
    return (
        <div ref={root} className="tw-code flex-1" data-state={state}>
            <p className="sr-only">{PLAIN}</p>
            <div className="tw-lines space-y-2" aria-hidden="true">
                {state === "typing"
                    ? LINES.slice(0, at.line + 1).map((line, i) => <CodeLine key={i} line={line} col={i === at.line ? at.col : undefined} caret={i === at.line} />)
                    : LINES.map((line, i) => <CodeLine key={i} line={line} caret={state === "done" && i === LINES.length - 1} />)}
            </div>
            {/* Without JS nothing would ever type it: show the code as it was rendered. */}
            <noscript>
                <style>{`.tw-code[data-state="pending"] .tw-lines{visibility:visible!important}`}</style>
            </noscript>
        </div>
    );
}
