"use client";
import Link from 'next/link';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { FaGithub, FaLinkedin } from "react-icons/fa";

const CustomLink = ({ href, title, className = "" }: { href: string; title: string; className?: string }) => {
    const pathname = usePathname();
    return (
        <Link href={href} className={`${className} relative group text-gray-800`}> 
            {title}
            {/* 電腦版底線：使用鮮艷的藍色作為亮點 */}
            <span className={`h-[2px] inline-block bg-blue-600 absolute left-0 -bottom-0.5 group-hover:w-full transition-[width] ease duration-300 ${pathname === href ? 'w-full' : 'w-0'}`}>&nbsp;</span>
        </Link>
    );
};

const Navbar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const handleClick = () => setIsOpen(!isOpen);

    return (
        <header className='w-full px-8 md:px-16 lg:px-32 py-4 font-medium flex items-center justify-between sticky top-0 z-[100] bg-gray-50 border-b border-blue-600/10 shadow-sm'>
            <Link href="/" className="flex items-center justify-center group shrink-0">
                {/* 這裡可以放你的 Logo 圖片或是一個簡單的圓形縮寫 */}
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform duration-300">
                    S
                </div>
                <div className="ml-3 flex flex-col">
                    <span className="text-xl font-bold text-gray-800 leading-none">Steven Su</span>
                    <span className="text-xs font-medium text-blue-600">Portfolio</span>
                </div>
            </Link>


            {/* 漢堡按鈕 (僅手機顯示) */}
            <button className='flex-col justify-center items-center lg:hidden flex' onClick={handleClick}>
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
                </nav>

                <nav className='flex items-center justify-center gap-6'>
                    <a href="https://github.com/stevensu04" target={"_blank"} className='text-2xl hover:text-blue-600 transition-all duration-300'>
                        <FaGithub />
                    </a>
                    <a href="https://www.linkedin.com/in/po-chun-steven-su-446746243/" target={"_blank"} className='text-2xl hover:text-blue-600 transition-all duration-300'>
                        <FaLinkedin />
                    </a>
                </nav>
            </div>

            {/* 手機版側邊欄 */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClick}
                            className='fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden'
                        />

                        <motion.div 
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className='fixed top-0 right-0 w-[50vw] h-full z-50 bg-white shadow-2xl flex flex-col p-8 lg:hidden'
                        >
                            <button onClick={handleClick} className="self-end text-3xl text-gray-800 mb-8">&times;</button>
                            <h2 className="text-lg font-bold mb-6 text-blue-600 border-b border-gray-100 pb-2">Menu</h2>

                            <nav className='flex flex-col items-start gap-6'>
                                <Link href="/" onClick={handleClick} className="text-xl font-medium text-gray-800 hover:text-blue-600 transition-colors">Home</Link>
                                <Link href="/about" onClick={handleClick} className="text-xl font-medium text-gray-800 hover:text-blue-600 transition-colors">About</Link>
                                <Link href="/projects" onClick={handleClick} className="text-xl font-medium text-gray-800 hover:text-blue-600 transition-colors">Projects</Link>
                            </nav>

                            <div className='flex items-center gap-8 mt-auto mb-8'>
                                <a 
                                    href="https://github.com/stevensu04" 
                                    target={"_blank"} 
                                    className='text-gray-800 hover:text-blue-600 transition-all duration-300'
                                >
                                    {/* 💡 這裡同樣使用 FaGithub，大小可以用 text-3xl 讓它在手機上更好點擊 */}
                                    <FaGithub className="text-3xl" />
                                </a>
                                <a 
                                    href="https://www.linkedin.com/in/po-chun-steven-su-446746243/" 
                                    target={"_blank"} 
                                    className='text-gray-800 hover:text-blue-600 transition-all duration-300'
                                >
                                    {/* 💡 同樣使用 FaLinkedin */}
                                    <FaLinkedin className="text-3xl" />
                                </a>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </header>
    );
};

export default Navbar;