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
      <rect width="64" height="64" rx="16" fill="#4f46e5" />
      <path
        d="M20 44V20L34 38V20"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 44V20"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="16" r="3.5" fill="#38bdf8" />
    </svg>
  );
};
