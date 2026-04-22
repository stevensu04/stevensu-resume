"use client";
import React from 'react';
import AnimatedText from '@/components/AnimatedText';

export default function AboutPage() {
    return (
        <main className="flex w-full flex-col items-center justify-center py-20 px-8 lg:px-32 bg-white text-black scroll-smooth">
        
        {/* 1. Hero Section: The Career Pivot Story */}
        <section className="grid w-full grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
            <div className="flex flex-col items-start justify-start">
                <AnimatedText text="Bridging Strategy and Code." className="!text-5xl !text-left mb-8" />
                <p className="font-medium text-gray-600 mb-4 text-lg">
                    G&apos;day! I&apos;m Steven. I&apos;m a Master of IT student at UQ with a professional background in Economics and Finance. 
                </p>
                <p className="font-medium text-gray-600 mb-4">
                    My career began in the banking sector at E.SUN Bank, where I first discovered the power of tech-driven optimisation. By streamlining service workflows, I helped reduce client wait times by 10%. This sparked my passion for building digital solutions that don&apos;t just work, but actually make life easier for people.
                </p>
                <p className="font-medium text-gray-600 mb-4">
                    Now, I combine my analytical mindset from Economics with full-stack development skills to build high-impact software. I thrive on tackling complex problems and turning them into seamless user experiences.
                </p>
                
                <div className="flex items-center gap-4 mt-6">
                    {/* 確保你的檔名與 public 資料夾下的一致 */}
                    <a href="/StevenSu_Resume.docx" download className="bg-black text-white p-3 px-8 rounded-lg font-semibold hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-all">
                    Download CV
                    </a>
                </div>
            </div>
            
            {/* Profile Image Container */}
            <div className="relative h-max rounded-2xl border-2 border-solid border-black bg-white p-8">
            <div className="absolute top-0 -right-3 -z-10 w-[102%] h-[103%] rounded-[2rem] bg-black" />
            <div className="w-full h-80 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
                {/* Replace with your actual photo later */}
                <p className="text-gray-400 font-medium">[ Insert Professional Photo ]</p>
            </div>
            </div>
        </section>

        {/* Anchor Links */}
        <div className="flex gap-6 mt-8 font-bold text-sm uppercase tracking-widest">
            <a href="#education" className="text-gray-400 hover:text-blue-600 transition-colors">Education</a>
            <a href="#experience" className="text-gray-400 hover:text-blue-600 transition-colors">Experience</a>
            <a href="#activities" className="text-gray-400 hover:text-blue-600 transition-colors">Activities</a>
        </div>

        {/* 2. Education Section */}
        <section id="education" className="w-full mb-24 scroll-mt-32">
            <h2 className="font-bold text-4xl mb-16 w-full text-center">Education</h2>
            <div className="max-w-[85%] mx-auto">
                <EducationItem 
                    title="Master of Information Technology"
                    school="The University of Queensland"
                    location="Brisbane, Australia"
                    time="Feb 2025 - Nov 2026"
                    info="GPA: 6.143/7.0 (Distinction Average). Focused on Relational Databases, Human-Computer Interaction, and Web Information Systems. For my Capstone, I prototyped an IoT-integrated Library Seat System to enhance campus UX."
                />

                <EducationItem 
                    title="Master of Economics and Finance"
                    school="Tamkang University"
                    location="New Taipei City, Taiwan"
                    time="Sep 2018 - Jun 2019"
                    info="Achieved a perfect GPA of 4.0/4.0 (High Distinction). Developed advanced skills in Business Analytics and Economic Data Analysis, providing a strong logical foundation for my transition into Information Technology."
                />

                <EducationItem 
                    title="Bachelor of Economics"
                    school="Tamkang University"
                    location="New Taipei City, Taiwan"
                    time="Sep 2014 - Jun 2018"
                    info="GPA: 3.935/4.0 (High Distinction). Beyond academics, I demonstrated strong leadership and commitment as the President of the Tennis Club and as a dedicated member of the Track and Field school team."
                />
            </div>
        </section>

        {/* 3. Professional Experience */}
        <section id="experience" className="w-full mb-24 scroll-mt-32">
            <h2 className="font-bold text-4xl mb-16 w-full text-center">Work Experience</h2>
            <div className="max-w-[85%] mx-auto">
                <ExperienceItem 
                    title="Business Support Partner (Intern)"
                    company="Queensland State  Government (IT LANDS | Dept. of Natural Resources and Mines, Manufacturing and Regional and Rural Development (NRMMRRD))"
                    location="Brisbane, QLD (Australia)"
                    time="Oct 2025 - Jan 2026"
                    work="Spearheaded the 'Finance Forms' project using Power Apps, Power Automate and SharePoint. Automated manual data validation, projected to boost processing efficiency by 30% for the department."
                />
                <ExperienceItem 
                    title="Business Development Consultant (Intern)"
                    company="Practera | Study Australia Industry Experience Program (SAIEP)"
                    location="Australia (Remote)"
                    time="Jun 2025 - Jul 2025"
                    work="Navigated complex project requirements and facilitated communication between diverse stakeholders to deliver high-quality strategic documentation."
                />
                <ExperienceItem 
                    title="Financial Services Consultant"
                    company="E.SUN Commercial Bank"
                    location="Taipei, Taiwan"
                    time="Aug 2022 - Apr 2024"
                    work="Delivered tailored financial solutions and collaborated with the digital banking team to refine internal workflows, achieving a significant 10% reduction in customer wait times."
                />
            </div>
        </section>

        {/* 4. Extracurricular Activities */}
        <section id="activities" className="w-full mb-24 scroll-mt-32">
            <h2 className="font-bold text-4xl mb-16 w-full text-center">Extracurricular Activities</h2>
            <div className="max-w-[85%] mx-auto">                
                <ActivityItem
                title="Vice President"
                company="UQ Graduate Union of Taiwanese Students (GUTS)"
                location="The University of Queensland"
                time="Jan 2026 - Dec 2026"
                work="Spearheading strategic planning for 100+ members, aligning diverse perspectives, and collaborating with university representatives to ensure successful stakeholder management. "
                />
                <ActivityItem 
                title="Participant"
                company="UQ Ventures Program"
                location="The University of Queensland"
                time="2024 - 2025"
                work="Completed innovation and growth modules, utilising creative problem-solving and collaborative approaches to tackle entrepreneurial challenges. [cite: 40]"
                />
                <ActivityItem
                title="Volunteer"
                company="Australia Career Forum (ACF)"
                location="Brisbane, Australia"
                time="2025 - 2026"
                work="Supported large-scale community events like 'ACF Brisbane Squid Game', fostering community ties for 50+ attendees through inclusive cultural activities. [cite: 39]"
                />
            </div>
        </section>
        </main>
    );
}

// Helper Components
function EducationItem({title, school, location, time, info}: any) {
    return (
        <div className="my-8 border-l-4 border-black pl-8 relative">
        <div className="absolute -left-[13px] top-0 w-6 h-6 bg-black rounded-full border-4 border-white shadow-sm" />
        <h3 className="font-bold text-2xl mb-1">{title}</h3>
        <p className="font-bold text-blue-600 mb-1">
            {school}
            {location && (
                <span className="text-gray-400 font-medium ml-2 border-l border-gray-300 pl-2">
                    {location}
                </span>
            )}
        </p>
        <span className="font-semibold text-gray-500 block mb-3">{time}</span>
        <p className="font-medium w-full text-gray-700 leading-relaxed">{info}</p>
        </div>
    );
} 

function ExperienceItem({title, company, location, time, work}: any) {
    return (
        <div className="my-8 first:mt-0 last:mb-0 border-l-4 border-black pl-8 relative">
            <div className="absolute -left-[13px] top-0 w-6 h-6 bg-blue-600 rounded-full border-4 border-white shadow-sm" />
            {/* 💡 移除 mb-1 改用 mb-0，並縮小行高 */}
            <h3 className="font-bold text-2xl mb-0 leading-tight">{title} <span className="text-blue-600">@{company}</span></h3>
            
            {/* 💡 這裡就是關鍵：讓地點和時間緊貼標題 */}
            <div className="flex flex-wrap items-center gap-x-2 font-semibold text-gray-500 mb-2 text-sm md:text-base leading-none">
                <span>{location}</span>
                {location && <span>•</span>}
                <span>{time}</span>
            </div>
            <p className="font-medium w-full text-gray-700 leading-relaxed">{work}</p>
        </div>
    );
}

function ActivityItem({title, company, location, time, work}: any) {
    return (
        <div className="my-8 first:mt-0 last:mb-0 border-l-4 border-black pl-8 relative">
            <div className="absolute -left-[13px] top-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-sm" />
            <h3 className="font-bold text-2xl mb-1">{title} <span className="text-green-600">@{company}</span></h3>
            <div className="flex flex-wrap items-center gap-x-2 font-semibold text-gray-500 mb-3 text-sm md:text-base">
            <span>{location}</span>
            {location && <span>•</span>}
            <span>{time}</span>
            </div>
            <p className="font-medium w-full text-gray-700 leading-relaxed">{work}</p>
        </div>
    );
}