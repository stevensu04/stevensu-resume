"use client";
import React from "react";
import Link from "next/link";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { IoMdMail } from "react-icons/io";
import { site } from "@/lib/site";

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-[#121212] text-gray-400">
        <div className="max-w-[85%] mx-auto py-16 flex flex-col items-center text-center">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-6 tracking-tight italic">
            {site.name}
            </h2>

            <p className="max-w-2xl text-base md:text-lg leading-relaxed mb-10 text-gray-400">
            {site.summary}
            </p>

            <div className="flex items-center gap-6 mb-8">
                <SocialIcon
                href={site.linkedin}
                label="LinkedIn"
                icon={<FaLinkedin size={22} />}
                />
                <SocialIcon
                href={site.github}
                label="GitHub"
                icon={<FaGithub size={22} />}
                />
                <SocialIcon
                href={`mailto:${site.email}`}
                label="Email"
                icon={<IoMdMail size={22} />}
                />
            </div>
        </div>

        <div className="w-full bg-black py-6 border-t border-gray-800/50">
            <div className="max-w-[85%] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] tracking-widest uppercase">
            <p className="text-gray-500">
                Copyright © {currentYear} <span className="text-blue-500 font-bold">Steven Su</span>
            </p>
            
            <div className="flex items-center gap-8 font-medium">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <Link href="/about" className="hover:text-white transition-colors">About</Link>
                <Link href="/projects" className="hover:text-white transition-colors">Projects</Link>
            </div>
            </div>
        </div>
        </footer>
    );
};

function SocialIcon({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    return (
        <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black hover:border-white transition-all duration-300 shadow-sm"
        >
        {icon}
        </a>
    );
}

export default Footer;