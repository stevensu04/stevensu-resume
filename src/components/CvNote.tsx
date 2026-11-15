import { site } from "@/lib/site";

/**
 * The line under a Download CV button: when the CV was last updated, and a way to read it without
 * downloading. On a phone, opening a PDF in the browser is a better experience than a download.
 */
export default function CvNote({ className = "" }: { className?: string }) {
    return (
        <p className={`text-xs text-gray-500 ${className}`}>
            CV updated {site.cvUpdated} ·{" "}
            <a
                href={site.cv}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline-offset-2 hover:text-blue-600 hover:underline"
            >
                view it in the browser
            </a>
        </p>
    );
}
