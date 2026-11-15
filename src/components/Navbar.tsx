"use client";
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FaGithub, FaLinkedin } from "react-icons/fa";
import { site } from "@/lib/site";

const CustomLink = ({ href, title, className = "" }: { href: string; title: string; className?: string }) => {
    const pathname = usePathname();
    // A case study at /projects/<slug> still sits under "Projects".
    const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return (
        <Link href={href} className={`${className} relative group text-gray-800`}> 
            {title}
            {/* 電腦版底線：使用鮮艷的藍色作為亮點 */}
            <span className={`h-[2px] inline-block bg-blue-600 absolute left-0 -bottom-0.5 group-hover:w-full transition-[width] ease duration-300 ${active ? 'w-full' : 'w-0'}`}>&nbsp;</span>
        </Link>
    );
};

const MOBILE_LINKS = [
    ["/", "Home"],
    ["/about", "About"],
    ["/projects", "Projects"],
    ["/world", "World"],
] as const;

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const handleClick = () => setIsOpen(!isOpen);

    // Escape closes the drawer, as it would any menu.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen]);

    return (
        <header className='w-full px-8 md:px-16 lg:px-32 py-4 font-medium flex items-center justify-between sticky top-0 z-[100] bg-gray-50 border-b border-blue-600/10 shadow-sm'>
            <Link href="/" className="flex items-center justify-center group shrink-0">
                {/* 這裡可以放你的 Logo 圖片或是一個簡單的圓形縮寫 */}
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                    S
                </div>
                <div className="ml-3 flex flex-col">
                    <span className="text-xl font-bold text-gray-800 leading-none">{site.name}</span>
                    <span className="text-xs font-medium text-blue-600">{site.role}</span>
                </div>
            </Link>


            {/* 漢堡按鈕 (僅手機顯示) */}
            {/* The three visible lines measure 24 × 10px — this is the only navigation on a phone.
                px-3 / py-5 grow the tap target to 48 × 50 and the matching negative margins cancel
                it out, so the layout doesn't move. aria-controls is safe because the drawer
                below is always in the DOM. */}
            <button
                type="button"
                onClick={handleClick}
                aria-label={isOpen ? "Close menu" : "Open menu"}
                aria-expanded={isOpen}
                aria-controls="mobile-menu"
                className='-mx-3 -my-5 flex flex-col items-center justify-center px-3 py-5 lg:hidden'
            >
                <span className={`bg-gray-800 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`}></span>
                <span className={`bg-gray-800 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${isOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`bg-gray-800 block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`}></span>
            </button>

            {/* 電腦版導航 (lg 以上顯示) */}
            <div className='w-full justify-between items-center hidden lg:flex'>
                <nav className='flex gap-12 ml-12'>
                    <CustomLink href="/" title="Home" />
                    <CustomLink href="/about" title="About" />
                    <CustomLink href="/projects" title="Projects" />
                    <CustomLink href="/world" title="World" />
                </nav>

                <nav className='flex items-center justify-center gap-6'>
                    <a
                        href={site.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${site.name} on GitHub`}
                        className='text-2xl hover:text-blue-600 transition-all duration-300'
                    >
                        <FaGithub />
                    </a>
                    <a
                        href={site.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${site.name} on LinkedIn`}
                        className='text-2xl hover:text-blue-600 transition-all duration-300'
                    >
                        <FaLinkedin />
                    </a>
                </nav>
            </div>

            {/* 手機版側邊欄 — mobile drawer, CSS only (framer-motion was here for this one effect).
                Always in the DOM: CSS has no AnimatePresence, and a removed element can't play an
                exit animation. That means three things have to happen together:
                  1. When closed: inert + aria-hidden + tabIndex={-1} (tabIndex covers browsers
                     without inert), so Tab never lands in an invisible menu.
                  2. visibility is part of the transition, so the slide-out finishes before the
                     drawer is hidden instead of vanishing in one frame. The slide transitions
                     `translate`, not `transform`: Tailwind v4's translate-x-* set the CSS
                     translate property, so a transform transition would never fire.
                  3. The old spring (damping 25, stiffness 200) becomes cubic-bezier(0.32, 0.72, 0, 1)
                     over 280ms: a close ease-out without the overshoot. */}
            <div
                onClick={handleClick}
                aria-hidden="true"
                className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-[opacity,visibility] duration-300 lg:hidden ${
                    isOpen ? "visible opacity-100" : "invisible opacity-0"
                }`}
            />

            <div
                id="mobile-menu"
                inert={!isOpen}
                aria-hidden={!isOpen}
                className={`fixed top-0 right-0 z-50 flex h-full w-[50vw] flex-col bg-white p-8 shadow-2xl transition-[translate,visibility] duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] lg:hidden ${
                    isOpen ? "visible translate-x-0" : "invisible translate-x-full"
                }`}
            >
                <button type="button" onClick={handleClick} aria-label="Close menu" tabIndex={isOpen ? 0 : -1} className="self-end text-3xl text-gray-800 mb-8">&times;</button>
                <h2 className="text-lg font-bold mb-6 text-blue-600 border-b border-gray-100 pb-2">Menu</h2>

                <nav className='flex flex-col items-start gap-6'>
                    {MOBILE_LINKS.map(([href, label]) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={handleClick}
                            tabIndex={isOpen ? 0 : -1}
                            className="text-xl font-medium text-gray-800 hover:text-blue-600 transition-colors"
                        >
                            {label}
                        </Link>
                    ))}
                </nav>

                <div className='flex items-center gap-8 mt-auto mb-8'>
                    <a
                        href={site.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${site.name} on GitHub`}
                        tabIndex={isOpen ? 0 : -1}
                        className='text-gray-800 hover:text-blue-600 transition-all duration-300'
                    >
                        <FaGithub className="text-3xl" />
                    </a>
                    <a
                        href={site.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${site.name} on LinkedIn`}
                        tabIndex={isOpen ? 0 : -1}
                        className='text-gray-800 hover:text-blue-600 transition-all duration-300'
                    >
                        <FaLinkedin className="text-3xl" />
                    </a>
                </div>
            </div>
        </header>
    );
};

export default Navbar;