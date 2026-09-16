import React from 'react';

export const VoyaraRobotAvatar = ({ size = 48, className = '', waving = false, animate = false }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className} ${
        animate ? 'transition-transform duration-300 hover:scale-105' : ''
      }`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md select-none overflow-visible"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="robotBodyGrad" x1="20" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F0F7FA" />
            <stop offset="100%" stopColor="#D4E6F1" />
          </linearGradient>

          <linearGradient id="robotScreenGrad" x1="28" y1="32" x2="72" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B1A28" />
            <stop offset="50%" stopColor="#092238" />
            <stop offset="100%" stopColor="#061524" />
          </linearGradient>

          <linearGradient id="robotGoldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFDE59" />
            <stop offset="40%" stopColor="#FDB813" />
            <stop offset="100%" stopColor="#E67E22" />
          </linearGradient>

          <linearGradient id="robotTealGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0CD4E2" />
            <stop offset="100%" stopColor="#087F8C" />
          </linearGradient>

          <linearGradient id="eyeGlowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64F0FF" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>

          {/* Shadow Filter */}
          <filter id="robotGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- ANTENNA --- */}
        {/* Antenna Stem */}
        <path d="M50 20 L50 10" stroke="url(#robotTealGrad)" strokeWidth="3" strokeLinecap="round" />
        {/* Antenna Star / Golden Tip */}
        <circle cx="50" cy="8.5" r="4.5" fill="url(#robotGoldGrad)" stroke="#FFF" strokeWidth="1" />
        <path
          d="M50 5 L51.2 7.8 L54 8.5 L51.2 9.2 L50 12 L48.8 9.2 L46 8.5 L48.8 7.8 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* --- EARS / HEADPHONES --- */}
        {/* Left Ear */}
        <rect x="15" y="32" width="7" height="15" rx="3.5" fill="url(#robotGoldGrad)" stroke="#FFF" strokeWidth="0.8" />
        <circle cx="18.5" cy="39.5" r="2" fill="#087F8C" />
        {/* Right Ear */}
        <rect x="78" y="32" width="7" height="15" rx="3.5" fill="url(#robotGoldGrad)" stroke="#FFF" strokeWidth="0.8" />
        <circle cx="81.5" cy="39.5" r="2" fill="#087F8C" />

        {/* --- TORSO / BODY (Background) --- */}
        <path
          d="M34 62 C34 58, 66 58, 66 62 L69 82 C69 88, 31 88, 31 82 Z"
          fill="url(#robotBodyGrad)"
          stroke="#C5DCED"
          strokeWidth="1"
        />

        {/* Chest Golden Emblem / Shield */}
        <path
          d="M50 68 L55 71 L55 76 C55 79.5 50 82 50 82 C50 82 45 79.5 45 76 L45 71 Z"
          fill="url(#robotGoldGrad)"
          stroke="#FFF"
          strokeWidth="0.8"
        />
        {/* Emblem highlight */}
        <circle cx="50" cy="74.5" r="1.5" fill="#FFF" opacity="0.8" />

        {/* --- LEFT HAND / ARM (Resting or Waving) --- */}
        <path
          d="M32 64 C28 66 22 72 24 76 C25 78 28 77 30 73 C31 71 33 67 34 65 Z"
          fill="url(#robotBodyGrad)"
          stroke="#C5DCED"
          strokeWidth="0.8"
        />

        {/* --- RIGHT HAND / ARM (Waving Hello) --- */}
        {waving || true ? (
          <g className={animate ? 'animate-bounce' : ''} style={{ transformOrigin: '70px 65px' }}>
            <path
              d="M66 64 C70 61 77 55 81 48 C83 45 86 47 84 50 C81 55 75 66 68 68 Z"
              fill="url(#robotBodyGrad)"
              stroke="#C5DCED"
              strokeWidth="0.8"
            />
            {/* Waving Palm / Mitt */}
            <circle cx="82.5" cy="47.5" r="4.2" fill="url(#robotBodyGrad)" stroke="#C5DCED" strokeWidth="0.8" />
            <path d="M80 46 C80 43 83 43 84 46" stroke="#C5DCED" strokeWidth="0.6" strokeLinecap="round" />
          </g>
        ) : (
          <path
            d="M68 64 C72 66 78 72 76 76 C75 78 72 77 70 73 C69 71 67 67 66 65 Z"
            fill="url(#robotBodyGrad)"
            stroke="#C5DCED"
            strokeWidth="0.8"
          />
        )}

        {/* --- HEAD CHASSIS --- */}
        <rect
          x="20"
          y="18"
          width="60"
          height="46"
          rx="22"
          fill="url(#robotBodyGrad)"
          stroke="#C5DCED"
          strokeWidth="1.2"
        />
        {/* Head Top Gloss Reflection */}
        <path
          d="M30 22 C38 20 62 20 70 22 C67 24 33 24 30 22 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />

        {/* --- VISOR SCREEN (Dark Blue / Cyan) --- */}
        <rect
          x="26"
          y="25"
          width="48"
          height="32"
          rx="14"
          fill="url(#robotScreenGrad)"
          stroke="#193750"
          strokeWidth="1"
        />
        {/* Screen inner top glass glow */}
        <path
          d="M32 27 C42 26 58 26 68 27 C64 30 36 30 32 27 Z"
          fill="#64F0FF"
          opacity="0.25"
        />

        {/* --- EYES: HAPPY GLOWING CYAN CURVES (◠ ◠) --- */}
        {/* Left Eye */}
        <path
          d="M34 40 C34 35 44 35 44 40"
          stroke="url(#eyeGlowGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          filter="url(#robotGlow)"
        />
        {/* Left Cheek Blush */}
        <ellipse cx="33" cy="45" rx="2.5" ry="1.2" fill="#0CD4E2" opacity="0.35" />

        {/* Right Eye */}
        <path
          d="M56 40 C56 35 66 35 66 40"
          stroke="url(#eyeGlowGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          filter="url(#robotGlow)"
        />
        {/* Right Cheek Blush */}
        <ellipse cx="67" cy="45" rx="2.5" ry="1.2" fill="#0CD4E2" opacity="0.35" />

        {/* --- MOUTH: CUTE HAPPY SMILE (‿) --- */}
        <path
          d="M47 46 C48.5 49 51.5 49 53 46"
          stroke="#64F0FF"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

export default VoyaraRobotAvatar;
