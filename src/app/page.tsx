"use client";
import AnimatedText from "@/components/AnimatedText";
import ContactMe from "@/components/ContactMe";
import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white text-black overflow-x-hidden">
      <div className="flex flex-col lg:flex-row items-center justify-between w-full px-8 lg:px-48 py-20 lg:py-0">
        
        {/* 左側：文字區 */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
          <AnimatedText 
            text="Turning Vision Into Reality With Code And Design." 
            className="!text-4xl md:!text-5xl lg:!text-6xl !text-black font-bold" 
          />
          <p className="mt-4 text-base md:text-lg font-medium text-gray-600">
            Hi, I'm Steven, a Master of IT student @ UQ passionate about Full-stack development.
          </p>
          
          <div className="flex items-center self-center lg:self-start mt-8 z-10 gap-6">
            {/* Resume 按鈕：連結至 About 頁面或下載 */}
            <Link 
              href="/about" 
              className="group relative flex items-center bg-black text-white px-8 py-3 rounded-lg font-bold shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
            >
              <span className="relative z-10">View Resume</span>
              {/* 懸停時的發光背景動畫 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0" />
            </Link>
          </div>
        </div>

        {/* 右側：核心技能視覺區 */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end order-1 lg:order-2 mb-12 lg:mb-0">
          <div className="relative w-full max-w-[450px] lg:max-w-[550px] aspect-square flex flex-wrap content-start justify-center gap-2 lg:block">
            <div className="absolute hidden lg:block w-full h-full rounded-full bg-blue-50/50 border border-blue-100 animate-pulse"></div>
            <div className="hidden lg:flex z-0 text-[150px] lg:text-[180px] font-black text-blue-600/5 select-none absolute items-center justify-center w-full h-full">
              {"< / >"}
            </div>
            {/* Technical Skills */}
            <SkillBadge text="Next.js" className="lg:top-2 lg:left-33 lg:-translate-x-1/2 bg-black text-white" />
            <SkillBadge text="React" className="lg:top-14 lg:left-10 bg-blue-600 text-white" />
            <SkillBadge text="Tailwind CSS" className="lg:top-[40%] lg:-left-10 bg-cyan-500 text-white" />
            <SkillBadge text="TypeScript" className="lg:top-[53%] lg:-left-16 bg-blue-600 text-white lg:-translate-y-1/2" />
            <SkillBadge text="Python" className="lg:bottom-[31%] lg:-left-8 bg-blue-400 text-white" />
            <SkillBadge text="Django" className="lg:bottom-[13%] lg:left-10 bg-green-700 text-white" />
            <SkillBadge text="SQL" className="lg:bottom-[4%] lg:left-25 bg-slate-600 text-white" />
            <SkillBadge text="Java" className="lg:top-[20%] lg:-left-[-8%] lg:-translate-x-1/2 bg-gray-800 text-white" />
            <SkillBadge text="GitHub" className="lg:bottom-[22%] lg:left-[0%] bg-black text-white" />
            <SkillBadge text="Power Platform" className="lg:top-[33%] lg:-left-5 bg-cyan-500 text-white lg:-translate-y-1/2" />
            <SkillBadge text="Figma" className="lg:bottom-[-2%] lg:left-[32%] bg-cyan-500 text-white" />

            {/* Professional Skills */}
            <SkillBadge text="Stakeholder Engagement" className="lg:top-12 lg:right-0 bg-white border border-blue-200 text-gray-700" />
            <SkillBadge text="Process Analysis" className="lg:top-[30%] lg:-right-15 bg-white border border-blue-200 text-gray-700" />
            <SkillBadge text="Business Documentation" className="lg:top-1/2 lg:-right-25 bg-white border border-blue-200 text-gray-700 lg:-translate-y-1/2" />
            <SkillBadge text="Cross-cultural Communication" className="lg:bottom-[30%] lg:-right-20 bg-white border border-blue-200 text-gray-700" />
          </div>
        </div>
      </div>
      <ContactMe />
    </main>
  );
}

function SkillBadge({ text, className }: { text: string; className: string }) {
  return (
    <div className={`
      relative lg:absolute 
      p-2 px-4 rounded-full text-xs md:text-sm font-bold shadow-sm whitespace-nowrap 
      transition-all hover:scale-110 cursor-default 
      ${className}
    `}>
      {text}
    </div>
  );
}