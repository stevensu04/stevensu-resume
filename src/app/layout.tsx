import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ContactMeMount from "@/components/ContactMeMount";
import Navbar from '@/components/Navbar';
import Footer from "@/components/Footer";
import { site, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * schema.org Person, so search engines can tie this site to the name a recruiter types in.
 * Everything comes from site.ts. Locality only, no street address — the same reason the CV
 * leaves it off.
 */
const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    jobTitle: site.role,
    url: SITE_URL,
    email: `mailto:${site.email}`,
    sameAs: [site.github, site.linkedin],
    address: { "@type": "PostalAddress", addressLocality: "Brisbane", addressRegion: "QLD", addressCountry: "AU" },
    affiliation: { "@type": "CollegeOrUniversity", name: "The University of Queensland" },
    knowsAbout: ["Full-Stack Development", "Next.js", "TypeScript", "Python", "Django"],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} — ${site.role}`,
    template: `%s · ${site.name}`,
  },
  description: site.summary,
  keywords: [
    "Full-Stack Developer",
    "Graduate Software Engineer",
    "Brisbane",
    "Next.js",
    "TypeScript",
    "Python",
    "Django",
    "University of Queensland",
  ],
  authors: [{ name: site.name, url: SITE_URL }],
  creator: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: SITE_URL,
    siteName: `${site.name} — ${site.role}`,
    title: `${site.name} — ${site.role}`,
    description: site.summary,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.role}`,
    description: site.summary,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* 💡 確保 body 是 flex 容器且高度至少為 100vh */}
      {/* Geist was being downloaded on every page load and never applied — the font variables
          were declared but no element consumed them. Applying it also makes typography
          consistent across platforms instead of falling back to each OS's default sans. */}
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans flex flex-col min-h-screen bg-white`}>
        <script
          type="application/ld+json"
          // Escaping "<" per the Next.js JSON-LD guide, so no string can close the script tag.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }}
        />
        <Navbar />
        
        {/* 💡 main 標籤使用 flex-grow，這會把 Footer 推到最底部 */}
        <main className="flex-grow">
          {children}
        </main>

        <Footer />
        {/* Every page gets a way out. This used to render on the homepage only, so /about
            (about ten screens tall on a phone) and all of /projects had no floating contact. */}
        <ContactMeMount />
      </body>
    </html>
  );
}
