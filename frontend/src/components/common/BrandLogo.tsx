import React from 'react';

interface BrandLogoProps {
  size?: number | string;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="blBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="50%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        <linearGradient id="blBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.6" />
        </linearGradient>

        <linearGradient id="blLeftStem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>

        <linearGradient id="blDiagonal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>

        <linearGradient id="blRightStem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>

        <radialGradient id="blAmbientGlow" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
        </radialGradient>

        <filter id="blGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#blBgGrad)" />
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#blAmbientGlow)" />
      <rect x="2" y="2" width="60" height="60" rx="16" stroke="url(#blBorderGrad)" strokeWidth="1.5" />

      {/* Left Column */}
      <path
        d="M19 44V20C19 18.8954 19.8954 18 21 18H22C23.1046 18 24 18.8954 24 20V44C24 45.1046 23.1046 46 22 46H21C19.8954 46 19 45.1046 19 44Z"
        fill="url(#blLeftStem)"
      />

      {/* Diagonal Bridge */}
      <path
        d="M22 20L41 42C41.7 42.8 43 42.3 43 41.2V20"
        stroke="url(#blDiagonal)"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right Column */}
      <path
        d="M40 44V20C40 18.8954 40.8954 18 42 18H43C44.1046 18 45 18.8954 45 20V44C45 45.1046 44.1046 46 43 46H42C40.8954 46 40 45.1046 40 44Z"
        fill="url(#blRightStem)"
      />

      {/* AI Neural Sparkle */}
      <g filter="url(#blGlow)">
        <circle cx="48.5" cy="15.5" r="3.5" fill="#38bdf8" />
        <path d="M48.5 10V21M43 15.5H54" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  );
};
