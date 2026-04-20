"use client";
import AnimatedText from "@/components/AnimatedText";
import HireMe from "@/components/HireMe";

export default function Home() {
  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white text-black overflow-x-hidden">
      
      {/* 💡 關鍵點：lg:px-48，這會把左側文字往右推，避免被 Hire Me 圓盤遮擋 */}
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
          
          <div className="flex items-center self-center lg:self-start mt-8 z-10">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-blue-700 hover:shadow-blue-200 transition-all duration-300">
              Resume
            </button>
            <button className="ml-4 text-gray-600 font-semibold underline underline-offset-4 hover:text-blue-600 transition-colors">
              Contact
            </button>
          </div>
        </div>

        {/* 右側：核心技能視覺區 */}
        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end order-1 lg:order-2 mb-12 lg:mb-0">
          <div className="relative flex flex-wrap justify-center gap-2 w-full h-auto lg:h-[500px] lg:w-[500px] lg:block items-center">
            
            <div className="absolute hidden lg:block w-full h-full rounded-full bg-blue-50/50 border border-blue-100 animate-pulse"></div>
            
            <div className="hidden lg:flex z-0 text-[180px] font-black text-blue-600/5 select-none absolute items-center justify-center w-full h-full">
              {"< / >"}
            </div>

            <SkillBadge text="Python" className="lg:top-10 lg:left-1/4 bg-blue-600 text-white" />
            <SkillBadge text="React" className="lg:top-1/4 lg:right-10 bg-blue-500 text-white" />
            <SkillBadge text="Java" className="lg:bottom-20 lg:left-10 bg-gray-800 text-white" />
            <SkillBadge text="TypeScript" className="lg:top-1/2 lg:-right-4 bg-blue-400 text-white" />
            <SkillBadge text="Django" className="lg:bottom-10 lg:right-1/4 bg-green-700 text-white" />

            <SkillBadge text="SQL" className="lg:top-1/2 lg:left-0 bg-white border border-blue-200 text-gray-700" />
            <SkillBadge text="Power Platform" className="lg:top-[15%] lg:left-[10%] bg-white border border-blue-200 text-gray-700" />
            <SkillBadge text="Figma" className="lg:bottom-[35%] lg:right-[5%] bg-white border border-blue-200 text-gray-700" />
            <SkillBadge text="Process Analysis" className="lg:bottom-[10%] lg:left-[20%] bg-white border border-blue-200 text-gray-700" />
            <SkillBadge text="Stakeholder Engagement" className="lg:top-[5%] lg:right-[20%] bg-white border border-blue-200 text-gray-700" />
          </div>
        </div>
      </div>

      {/* 底部裝飾 */}
      <HireMe />
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