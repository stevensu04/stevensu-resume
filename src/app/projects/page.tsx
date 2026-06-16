"use client";
import React, { useState } from 'react';
import AnimatedText from '@/components/AnimatedText';
import { AnimatePresence, motion } from 'framer-motion'; 
import { FaTimes, FaExternalLinkAlt, FaCode, FaLightbulb, FaCoins } from "react-icons/fa";

const projects = [
    {
        id: 1,
        title: "Brisbane OlymPulse",
        category: "Full-Stack",
        img: "/project-olympulse.jpg",
        summary: "Real-time crowd density visualization for Brisbane 2032 Olympics.",
        tech: ["Django", "Python", "Bootstrap", "Leaflet.js"],
        featured: true,
        link: "#",
        details: {
            problem: "Managing massive urban crowds during global mega-events.",
            solution: "A geospatial dashboard providing heatmaps and density alerts."
        }
    },
    {
        id: 2,
        title: "Finance Forms Automation",
        category: "Business",
        img: "/project-finance.jpg",
        summary: "Digitized invoice workflows for Queensland Government.",
        tech: ["Power Apps", "Power Automate", "SharePoint"],
        featured: false,
        link: "#",
        details: {
            problem: "Manual, paper-based invoice processing leading to delays.",
            solution: "Automated digital workflows reducing processing time by 30%."
        }
    },
    {
        id: 3,
        title: "ParkEase",
        category: "UI/UX Design",
        img: "/projects/ParkEase.png",
        summary: "A user-centered parking solution for Brisbane hotspots, reducing search time and urban stress.",
        tech: ["Figma", "HCI Research", "User Testing"],
        featured: false,
        link: "https://www.figma.com/proto/GQttaNlNfAvNpn9SaT81gk/DECO-7250?node-id=1-1976&p=f&t=uvcdKuoEsTy2zEkO-1&scaling=scale-down&content-scaling=fixed&page-id=0%3A1&starting-point-node-id=1%3A1976",
        details: {
            problem: "High parking frustration at UQ and local shopping centers (86% difficulty rate).",
            solution: "Real-time availability tracking using sensors and AI cameras.",
        }
    },
    {
        id: 4,
        title: "JourneyMate",
        category: "Full-Stack",
        img: "/projects/JourneyMate.png",
        summary: "A functional travel web app prototype featuring an AI token system and adaptive itinerary planning.",
        tech: ["JavaScript", "HTML/CSS", "Token Logic", "UI Design"],
        featured: false,
        link: "https://stevensu-uq.github.io/VENTURES/",
        details: {
            problem: "Travel planning is fragmented across 5+ platforms, leading to an estimated 80% increase in app-switching fatigue.",
            solution: "A one-stop platform featuring a gamified AI token system that provides real-time adaptive guidance during disruptions.",
        }
    }
];

export default function ProjectsPage() {
    const [filter, setFilter] = useState("All");
    const [selectedProject, setSelectedProject] = useState<any>(null);

    return (
        <main className="w-full min-h-screen py-20 px-8 lg:px-32 bg-white text-black relative">
            <div className="flex flex-col items-center mb-16">
                <AnimatedText text="Innovating Through Code." className="!text-6xl mb-4" />
                <p className="text-gray-500 font-medium text-lg text-center max-w-2xl">
                    Bridging Economics and Information Technology to build user-centered digital solutions.
                </p>
            </div>

            <div className="flex justify-center flex-wrap gap-4 mb-20">
                {["All", "Full-Stack", "Business", "UI/UX Design"].map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setFilter(cat)}
                        className={`px-6 py-2 rounded-full font-bold transition-all border-2 ${
                            filter === cat ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-100 hover:border-black"
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.filter(p => filter === "All" || p.category === filter).map((project) => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onOpen={() => setSelectedProject(project)}
                    />
                ))}
            </div>

            <AnimatePresence>
                {selectedProject && (
                    <ProjectModal 
                        project={selectedProject} 
                        onClose={() => setSelectedProject(null)} 
                    />
                )}
            </AnimatePresence>
        </main>
    );
}

function ProjectCard({ project, onOpen }: { project: any, onOpen: () => void }) {
    return (
        <div className={`relative group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-xl transition-all duration-500 ${project.featured ? "md:col-span-2" : ""}`}>
            <div className="aspect-video w-full bg-gray-100 overflow-hidden relative">
                <img 
                    src={project.img} 
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-center items-center p-6 text-center">
                    <p className="text-white mb-4 text-sm font-medium">{project.summary}</p>
                    <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {project.tech.map((t: string) => (
                            <span key={t} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded font-bold">#{t}</span>
                        ))}
                    </div>
                    <button 
                        onClick={onOpen}
                        className="bg-white text-black px-6 py-2 rounded-full text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors"
                    >
                        View Project Info
                    </button>
                </div>
            </div>
    
            <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-600 font-bold text-xs uppercase tracking-tighter">{project.category}</span>
                    <button 
                        onClick={onOpen}
                        className="text-black hover:text-blue-600 transition-colors font-bold text-sm flex items-center gap-1"
                    >
                        View Details <span className="text-lg">→</span>
                    </button>
                </div>
                <h3 className="text-xl font-bold text-black">{project.title}</h3>
            </div>
        </div>
    );
}

function ProjectModal({ project, onClose }: { project: any, onClose: () => void }) {
    const [isZoomed, setIsZoomed] = useState(false);

    // 💡 Sian-style dynamic metadata rendering based on project essence
    const renderMetaRows = (id: number) => {
        switch(id) {
            case 1: // OlymPulse
                return (
                    <>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">My Role</span><span className="font-bold text-black">Full Stack Engineer</span></div>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Context</span><span className="font-bold text-black">UQ WIS Project</span></div>
                        <div className="col-span-2 mt-2"><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tech Stack</span><span className="font-mono text-xs text-gray-600">Python, Django, Leaflet.js, Bootstrap</span></div>
                    </>
                );
            case 2: // Finance Forms
                return (
                    <>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">My Role</span><span className="font-bold text-black">IT Automation Specialist</span></div>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Context</span><span className="font-bold text-black">Queensland Government</span></div>
                        <div className="col-span-2 mt-2"><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Projected Impact</span><span className="font-bold text-blue-600">+30% Processing Efficiency</span></div>
                    </>
                );
            case 3: // ParkEase
                return (
                    <>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">My Role</span><span className="font-bold text-black">UI/UX &amp; HCI Researcher</span></div>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Duration · Team</span><span className="font-bold text-black">4 Weeks · 3 Designers</span></div>
                        <div className="col-span-2 mt-2"><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Core Methodology</span><span className="text-xs text-gray-600 font-bold">Heuristic Evaluation &amp; Usability Testing</span></div>
                    </>
                );
            case 4: // JourneyMate
                return (
                    <>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">My Role</span><span className="font-bold text-black">Full Stack Engineer</span></div>
                        <div><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Context</span><span className="font-bold text-black">UQ Ventures Program</span></div>
                        <div className="col-span-2 mt-2"><span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Architecture Feature</span><span className="font-mono text-xs text-gray-600">Vanilla JS Logic, Token-Gate Economy</span></div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl relative p-6 md:p-12 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button onClick={onClose} className="absolute right-6 top-6 text-2xl hover:text-blue-600 transition-colors">
                        <FaTimes />
                    </button>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Left Side: Visuals & Dynamic Meta */}
                        <div>
                            <div 
                                className="rounded-2xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50 cursor-zoom-in relative group/img"
                                onClick={() => setIsZoomed(true)}
                            >
                                <img src={project.img} alt={project.title} className="w-full h-auto" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="bg-white/95 text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-md">Click to View Full Image 🔍</span>
                                </div>
                            </div>
                            
                            {/* 💡 Dynamic Meta Info Block */}
                            <div className="mt-6 grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100 text-sm">
                                {renderMetaRows(project.id)}
                            </div>
                        </div>

                        {/* Right Side: Narrative */}
                        <div className="flex flex-col">
                            <span className="text-blue-600 font-bold text-sm mb-2">{project.category}</span>
                            <h2 className="text-4xl font-bold mb-6 text-black">{project.title}</h2>
                            
                            <div className="space-y-8">
                                <section>
                                    <h4 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                                        <FaLightbulb className="text-yellow-500" /> 01 - Problem &amp; Challenge
                                    </h4>
                                    <p className="text-gray-600 leading-relaxed">{project.details?.problem}</p>
                                    
                                    {project.id === 3 && (
                                        <div className="mt-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-600">
                                            <p className="text-blue-900 text-sm font-semibold italic">
                                                &quot;Research confirmed that 86% of surveyed users at UQ St Lucia and Toowong reported high frustration with current parking arrangements.&quot;
                                            </p>
                                        </div>
                                    )}
                                    {project.id === 4 && (
                                        <div className="mt-4 p-4 bg-purple-50 rounded-xl border-l-4 border-purple-600">
                                            <p className="text-purple-900 text-sm font-semibold italic">
                                                &quot;JourneyMate eliminates app-switching fatigue by integrating fragmented travel data into a single adaptive interface.&quot;
                                            </p>
                                        </div>
                                    )}
                                </section>

                                <section>
                                    <h4 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                                        <FaCode className="text-blue-600" /> 
                                        {project.id === 3 ? (
                                            <>02 - Solution {"&"} Interactive Prototype</>
                                        ) : (
                                            <>02 - Solution {"&"} Architecture</>
                                        )}
                                    </h4>
                                    <p className="text-gray-600 leading-relaxed mb-4">{project.details?.solution}</p>
                                    
                                    {project.id === 4 && (
                                        <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                                            <FaCoins className="text-green-600 mt-1" />
                                            <div>
                                                <p className="text-green-900 text-xs font-bold mb-1 uppercase tracking-wider">Technical Highlight: Token Economy</p>
                                                <p className="text-green-800 text-xs leading-snug">
                                                    Developed a gamified logic where users earn tokens via daily check-ins to handle AI query costs efficiently.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Lightbox */}
            <AnimatePresence>
                {isZoomed && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-zoom-out"
                        onClick={() => setIsZoomed(false)}
                    >
                        <button className="absolute right-8 top-8 text-white text-3xl hover:text-gray-300" onClick={() => setIsZoomed(false)}>
                            <FaTimes />
                        </button>
                        <motion.img 
                            initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                            src={project.img} alt={project.title} 
                            className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}