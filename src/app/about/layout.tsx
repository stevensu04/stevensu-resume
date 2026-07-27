import type { Metadata } from "next";

// The page itself is a client component, so route metadata lives here.
export const metadata: Metadata = {
    title: "About",
    description:
        "From two years at E.SUN Bank to full-stack engineering — experience, education, and the work behind the career change.",
    alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return children;
}
