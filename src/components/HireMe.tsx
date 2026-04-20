"use client";
import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const HireMe = () => {
    return (
        <div className="fixed right-4 bottom-4 md:left-4 md:right-auto md:bottom-4 flex items-center justify-center z-50">
            <div className="w-24 h-24 md:w-48 md:h-auto relative scale-75 md:scale-100">
                <svg viewBox="0 0 100 100" className="animate-spin-slow w-24 h-24 md:w-48 md:h-48 hidden md:block">
                    <path
                        id="circlePath"
                        d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0"
                        fill="transparent"
                    />
                    <text className="text-[8.5px] font-semibold fill-black">
                        <textPath xlinkHref="#circlePath">
                            Full-Stack Developer • UI/UX Designer • Freelancer •&nbsp;&nbsp;
                        </textPath>
                    </text>
                </svg>

                {/* 中間的黑色圓心按鈕 */}
                <Link
                    href="mailto:stevensu04@gmail.com"
                    className="flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                    bg-blue-600 text-white shadow-xl w-16 h-16 md:w-20 md:h-20 rounded-full
                    font-bold text-xs md:text-sm hover:bg-gray-900 transition-all duration-300"
                >
                    Hire Me
                </Link>
            </div>
        </div>
    );
};

export default HireMe;