"use client";
import React from "react";

const ContactMe = () => {
    return (
        // 💡 透過 md:left-4 md:right-auto md:bottom-4 確保桌面版在左下，手機版預設在右下
        <div className="fixed right-4 bottom-4 md:left-4 md:right-auto flex items-center justify-center z-50">
            <div className="w-20 h-20 md:w-48 md:h-48 flex items-center justify-center relative">
                <svg viewBox="0 0 100 100" className="animate-spin-slow w-full h-full hidden md:block">
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

                <a
                href="mailto:stevensu04@gmail.com"
                className="flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white shadow-xl w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-[10px] hover:bg-gray-900 transition-all duration-300"
                >
                    <span className="text-[10px] md:text-xs leading-none text-center">
                        Contact<br />Me
                    </span>
                </a>
            </div>
        </div>
    );
};

export default ContactMe;