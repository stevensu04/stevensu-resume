import { site } from "@/lib/site";

/**
 * End-of-page call to action for /about and /projects: the moment a recruiter has finished
 * reading is when they're most likely to reach out. The email is shown as text, not hidden
 * behind an icon, so it can be copied into an ATS or a message to a hiring manager.
 */
export default function HireCta({ className = "" }: { className?: string }) {
    return (
        <section
            aria-labelledby="hire-cta-heading"
            className={`mx-auto w-full rounded-3xl border border-gray-100 bg-gray-50 p-8 text-center md:p-10 ${className}`}
        >
            <h2 id="hire-cta-heading" className="text-2xl font-bold text-black">
                Hiring for a 2027 graduate role?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-gray-600">
                {site.availability}.{site.workRights ? ` ${site.workRights}.` : ""}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
                <a
                    href={`mailto:${site.email}`}
                    className="rounded-lg bg-black px-6 py-3 font-bold text-white transition-colors hover:bg-blue-600"
                >
                    {site.email}
                </a>
                <a
                    href={site.cv}
                    download
                    className="rounded-lg border-2 border-black px-6 py-3 font-bold text-black transition-all hover:bg-black hover:text-white"
                >
                    Download CV
                </a>
            </div>
        </section>
    );
}
