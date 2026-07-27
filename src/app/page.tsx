"use client";
import AnimatedText from "@/components/AnimatedText";
import ContactMe from "@/components/ContactMe";
import TechOrbit from "@/components/TechOrbit";
import Link from 'next/link';
import { site } from "@/lib/site";

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white text-black overflow-x-hidden">
      <div className="flex flex-col lg:flex-row items-center justify-between w-full px-8 lg:px-48 py-20 lg:py-0">

        {/* 左側：文字區 */}
        {/* 手機優先看到主張：the pitch leads on every viewport. This column used to be
            order-2 on mobile, so phones opened on a wall of 15 skill badges and the value
            proposition sat below the fold. */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left order-1">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-3">
            {site.role} · {site.location}
          </span>

          <AnimatedText
            text={site.headline}
            className="!text-4xl md:!text-5xl lg:!text-6xl !text-black font-bold !text-center lg:!text-left"
          />

          <p className="mt-4 text-base md:text-lg font-medium text-gray-600 max-w-xl">
            {site.intro}
          </p>

          {/* 數字先講話：Proof above the fold, before any adjective */}
          {/* 手機直排、桌機三欄：three columns only once they can hold a readable line —
              at 375px they were 90px wide and every label wrapped to four lines. */}
          <dl className="mt-8 grid w-full max-w-xl grid-cols-1 gap-y-3 text-left sm:grid-cols-3 sm:gap-x-5 sm:gap-y-0">
            {site.proof.map((p) => (
              <div key={p.value} className="flex flex-row items-baseline gap-3 sm:flex-col sm:gap-0">
                <dt className="w-20 shrink-0 text-2xl md:text-3xl font-extrabold text-black leading-none sm:w-auto">
                  {p.value}
                </dt>
                <dd className="text-xs font-semibold text-gray-600 leading-snug sm:mt-1.5">
                  {p.label}
                  <span className="mt-0.5 block text-[11px] font-medium text-gray-500">{p.context}</span>
                </dd>
              </div>
            ))}
          </dl>

          {/* 可用性：the objection recruiters filter on, answered before they ask */}
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-semibold text-green-800">
            <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden="true" />
            {site.availability}
            {site.workRights ? ` · ${site.workRights}` : ""}
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start self-center lg:self-start mt-8 z-10 gap-4">
            <Link
              href="/projects"
              className="group relative flex items-center bg-black text-white px-8 py-3 rounded-lg font-bold shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
            >
              <span className="relative z-10">View My Work</span>
              {/* 懸停時的發光背景動畫 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0" />
            </Link>

            {/* TODO(steven): this 404s until public/StevenSu_Resume.pdf exists. See PLAN.md §3. */}
            <a
              href={site.cv}
              download
              className="flex items-center px-8 py-3 rounded-lg font-bold border-2 border-black text-black transition-all duration-300 hover:bg-black hover:text-white active:scale-95"
            >
              Download CV
            </a>
          </div>
        </div>

        {/* 右側：核心技能視覺區 — two counter-rotating rings, grouped by layer.
            Replaces the hand-positioned badge cloud, whose asymmetry came from mixing
            28-character phrases with 3-character tech names. See PLAN.md §9. */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end order-2 mt-12 lg:mt-0">
          <TechOrbit />
        </div>
      </div>
      <ContactMe />
    </main>
  );
}