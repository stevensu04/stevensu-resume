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
    return (
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
                    <div>
                        <div className="rounded-2xl overflow-hidden shadow-lg mb-6 border border-gray-100 bg-gray-50">
                            <img src={project.img} alt={project.title} className="w-full h-auto" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <a href={project.link} target="_blank" className="w-full bg-black text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95">
                                <FaExternalLinkAlt /> Open {project.category === "UI/UX Design" ? "Prototype" : "Live Demo"}
                            </a>
                        </div>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-blue-600 font-bold text-sm mb-2">{project.category}</span>
                        <h2 className="text-4xl font-bold mb-6 text-black">{project.title}</h2>
                        
                        <div className="space-y-8">
                            <section>
                                <h4 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                                    <FaLightbulb className="text-yellow-500" /> The Challenge
                                </h4>
                                <p className="text-gray-600 leading-relaxed">{project.details?.problem}</p>
                                
                                {/* 💡 客製化亮點：ParkEase */}
                                {project.id === 3 && (
                                    <div className="mt-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-600">
                                        <p className="text-blue-900 text-sm font-semibold italic">
                                            &quot;Research confirmed that 86% of surveyed users at UQ St Lucia and Toowong reported high frustration with current parking arrangements.&quot;
                                        </p>
                                    </div>
                                )}

                                {/* 💡 客製化亮點：JourneyMate */}
                                {project.id === 4 && (
                                    <div className="mt-4 p-4 bg-purple-50 rounded-xl border-l-4 border-purple-600">
                                        <p className="text-purple-900 text-sm font-semibold italic">
                                            &quot;1 in 4 travelers face flight delays. JourneyMate addresses this by saving ~80% of app-switching time through a consolidated AI platform.&quot;
                                        </p>
                                    </div>
                                )}
                            </section>

                            <section>
                                <h4 className="flex items-center gap-2 text-black font-extrabold text-lg mb-3">
                                    <FaCode className="text-blue-600" /> Key Features & Tech
                                </h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {project.tech.map((t: string) => (
                                        <span key={t} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-xs font-bold border border-gray-200">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-gray-600 leading-relaxed">{project.details?.solution}</p>
                                
                                {/* 💡 技術實作細節：JourneyMate Token System */}
                                {project.id === 4 && (
                                    <div className="mt-4 flex items-start gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                                        <FaCoins className="text-green-600 mt-1" />
                                        <div>
                                            <p className="text-green-900 text-xs font-bold mb-1 uppercase tracking-wider">Technical Highlight: Token Economy</p>
                                            <p className="text-green-800 text-xs leading-snug">
                                                Developed a gamified logic where users earn tokens via daily check-ins to manage AI query costs.
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
    );
}