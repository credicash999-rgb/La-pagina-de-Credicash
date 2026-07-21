import React from 'react';

interface CrediCashLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const CrediCashLogo: React.FC<CrediCashLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  layout = 'horizontal',
}) => {
  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const textSizes = {
    sm: {
      brand: 'text-lg',
      subtitle: 'text-[7.5px] tracking-[0.14em]',
    },
    md: {
      brand: 'text-xl sm:text-2xl',
      subtitle: 'text-[8.5px] sm:text-[9.5px] tracking-[0.16em]',
    },
    lg: {
      brand: 'text-3xl sm:text-4xl',
      subtitle: 'text-[11px] sm:text-[12px] tracking-[0.18em]',
    },
    xl: {
      brand: 'text-5xl sm:text-6xl',
      subtitle: 'text-[13px] sm:text-[14px] tracking-[0.22em]',
    },
  };

  const currentTextSize = textSizes[size];

  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col items-center text-center gap-3' : 'items-center gap-3 sm:gap-3.5'} ${className}`}>
      {/* 
        Modern Financial Emblem:
        Sleek, interconnected geometric ribbon 'C' forming an upward financial arc & protective vault shield.
      */}
      <div className={`relative shrink-0 ${iconSizes[size]} flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          <defs>
            {/* Dark Forest Banking Gradient */}
            <linearGradient id="crestDarkGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0B4B27" />
              <stop offset="100%" stopColor="#032B15" />
            </linearGradient>

            {/* Vibrant Financial Growth Gradient */}
            <linearGradient id="crestBrightGrad" x1="20" y1="0" x2="100" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="60%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Subtle Metallic Accent */}
            <linearGradient id="crestGoldAccent" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>

          {/* Outer Protective Vault Geometry (Rounded Shield Arc) */}
          <path
            d="M 50,6 L 82,20 C 82,54 70,80 50,94 C 30,80 18,54 18,20 Z"
            fill="url(#crestDarkGrad)"
          />

          {/* Forward Momentum Growth Arc (Stylized Monogram 'C' / Upward Arrow) */}
          <path
            d="M 70,36 C 58,24 38,28 32,44 C 26,60 36,78 54,78 C 66,78 74,70 78,60 L 64,60 C 62,65 57,68 52,68 C 42,68 38,58 41,48 C 44,38 54,36 62,42 Z"
            fill="url(#crestBrightGrad)"
          />

          {/* Central Precision Pillar Node */}
          <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
          <path d="M 50,22 L 50,32" stroke="url(#crestBrightGrad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M 66,28 L 74,20" stroke="url(#crestGoldAccent)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Corporate Typography */}
      <div className="flex flex-col text-left leading-none">
        {/* Main Brand Title: CrediCash */}
        <div className={`font-black tracking-tight ${currentTextSize.brand} leading-none flex items-baseline`}>
          <span className="text-[#054B27]">Credi</span>
          <span className="text-[#10B981] bg-gradient-to-r from-[#10B981] to-[#059669] bg-clip-text text-transparent">Cash</span>
          <span className="text-[#10B981] font-bold ml-0.5">.</span>
        </div>

        {/* Subtitle: Sistema Central de Gestión */}
        {showSubtitle && (
          <span className={`uppercase font-extrabold text-[#054B27]/90 ${currentTextSize.subtitle} mt-1 block tracking-wider border-t border-emerald-900/10 pt-1`}>
            Sistema Central de Gestión
          </span>
        )}
      </div>
    </div>
  );
};

export default CrediCashLogo;
